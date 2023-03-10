import {
    createRangeLike, createRangeLikeFromRange, Doc,
    findNodeFromElement,
    // splitTextAsBlock,
    updateRange
} from "./editing";
import {waitUpdate, setCursor, findElementOrFirstChildFromNode, scheduleImmediateUpdate} from "./buildReactiveView";
import {EventDelegator} from "./event";
import {NodeType} from "./NodeType";
import { state as globalKM, actions } from "./globals";

function collapseSelection(selection:Selection) {
    const range = selection.getRangeAt(0).cloneRange()
    let canUseDefault
    if (!range.collapsed) {
        canUseDefault = updateRange(range, '')
        if (!canUseDefault) {
            selection.collapse(range.startContainer, range.startOffset)
        }
    }
    return canUseDefault
}




export default function patchRichTextEvents({ on, trigger } : EventDelegator, doc: Doc, boundaryContainer: HTMLElement) {
    // 一直按着会有很多次 keydown 事件
    on('keydown', async (e: KeyboardEvent) => {

        console.log('keydown', e, e.key, e.code)
        // -1 没有 cursor 的情况不管
        if (!globalKM.hasCursor) return

        // -2 输入法中的  Keydown 不管。
        // 这里有关于 keydown 和输入法的问题的例子。虽然 keydown 发生在 compositionstart 前，但 keyCode === 229 能表示这个  keydown 是输入法的一部分。
        // https://developer.mozilla.org/en-US/docs/Web/API/Element/keydown_event
        if (e.isComposing || e.keyCode === 229) {
            return;
        }

        //1.  单个字符，其他的 key 的名字都长于 1
        if(e.key.length === 1) {
            // 首先触发自定义事件，供插件等响应，如果插件要求阻止默认行为，后面就不处理了。
            const inputEvent = new CustomEvent('userInput',  { detail: {data: e.key}, cancelable: true })
            trigger(inputEvent)
            if(inputEvent.defaultPrevented) {
                e.preventDefault()
                e.stopPropagation()
                return
            }

            // 没有阻止，那么开始使用新字符更新 range。
            // 1. 手动收拢 selection。
            collapseSelection(globalKM.selection!)
            console.log("inserting", e.key, globalKM.selectionRange!.startContainer)
            // CAUTION 不能在这里插入字符是因为这个时候并不知道是不是输入法 compositionstart 的 keydown
            // 2. 修改字符
            const updateInfo = updateRange(globalKM.selectionRange!, e.key, true)
            // 如果success === false，说明使用 defaultBehavior 失败了
            console.log(updateInfo)
            if (!updateInfo.success) {
                console.log('use default failed')
                e.preventDefault()
                e.stopPropagation()
                await waitUpdate()
                setCursor(updateInfo.node, updateInfo.offset)
            }

        } else  if (e.key === 'Enter') {
            // 回车
            console.log("enter", e)
            e.preventDefault()
            e.stopPropagation()
            const splitPointNode = await doc.splitTextAsBlock(globalKM.selectionRange!)
            // restore cursor
            await waitUpdate()
            setCursor(splitPointNode, 0)
        } else  if (e.key === 'Backspace') {

            // 1. 有选区的情况，等用于 updateRange
            const range = globalKM.selectionRange!
            if (!range.collapsed) {
                const updateInfo = updateRange(range, '', true)
                if (!updateInfo.success) {
                    e.preventDefault()
                    e.stopPropagation()
                    setCursor(updateInfo.node, updateInfo.offset)
                }
                return
            }
            // 要考虑破坏结构的情况了
            const node = findNodeFromElement(range.startContainer)
            // TODO 要不要直接修正一下节点位置？？？
            if (!node.constructor.isLeaf) throw new Error('range not in a leaf node')

            // 2. 在整个结构的头部，这会破坏当前的结构
            if (node === node.container.head.next.node && range.startOffset === 0) {
                e.preventDefault()
                e.stopPropagation()

                const blockNode = node.parent
                // 如果节点自己有 unwrap 定义，那么就用它自己的
                if(blockNode.constructor.unwrap) {
                    await blockNode.constructor.unwrap(blockNode)
                } else {
                    // 默认行为: 1. content 和 previousSibling 合并. 2. children 提升到当前位置
                    const previousSiblingInTree = node.previousSiblingInTree
                    if (previousSiblingInTree) {
                        // 1. 合并内容
                        previousSiblingInTree.container.insertBefore(blockNode.content.move())
                        // 2. 如果有 children， 还要提升 children
                        if (blockNode.children?.tail) {
                            // 如果上一个 block 节点也是有 children 的，那么就和它合并
                            // TODO 这里有问题，上一个节点的  children 可能和我的节点不兼容
                            if (previousSiblingInTree.parent.constructor.hasChildren) {
                                previousSiblingInTree.parent.children.insertBefore(blockNode.children.move())
                            } else {
                                (window as any).d = true
                                previousSiblingInTree.parent.container.insertAfter(blockNode.children.move(), previousSiblingInTree.parent)
                            }

                        }
                        // 3. 最后再删掉当前节点，防止页面抖动
                        await waitUpdate()
                        blockNode.remove()
                    }
                }

                await waitUpdate()
                // 一定要重置一下，因为这时候 dom 更新了，可出现 cursor 漂移到上一级 div 上。
                setCursor(node, 0)
                return
            }

            // 3. 不在头部。选中前一个字符 update 就行了
            let editingNode = range.startOffset === 0 ? node.previousSibling : node
            const editingPrevNode = editingNode.previousSibling

            let editingStartOffset = range.startOffset === 0 ? editingNode.value.value.length - 1 : range.startOffset - 1
            const updateInfo = updateRange(createRangeLike({
                startNode: editingNode,
                startOffset: editingStartOffset,
                endNode: editingNode,
                endOffset: editingStartOffset + 1
            }), '', true)

            if (!updateInfo.success) {
                e.preventDefault()
                e.stopPropagation()
                if (editingStartOffset === 0) {
                    // 铁定坍缩了
                    setCursor(editingPrevNode, editingPrevNode.value?.value.length || 0)
                } else {
                    setCursor(updateInfo.node, updateInfo.offset)
                }
            }


        } else if (e.key === 'Tab') {
            //2.  TODO tab/shift+tab 向上升一级和向下降一级
            e.preventDefault()
            e.stopPropagation()
            const range = globalKM.selectionRange!
            const node = findNodeFromElement(range.startContainer)
            // TODO 要不要直接修正一下节点位置？？？
            if (!node.constructor.isLeaf) throw new Error('range not in a leaf node')
            const parent = node.parent
            if(e.shiftKey) {
                if(parent.constructor.unwrap) {
                    await parent.constructor.unwrap(parent)
                }
            } else {
                if(parent.constructor.wrap) {
                    parent.constructor.wrap(parent)
                }
            }
        }
    })


    on('compositionend', (e: CompositionEvent) => {
        console.log('compositionend', e)
        const range = globalKM.rangeBeforeComposition!
        range.collapse(true)

        updateRange(range, e.data, true)
    })


    // 如果碰到了 component + 普通节点的组合，要选中整个 component.
    on('selectionchange', () => {
        adjustSelection()
    })

    on('paste', (e: ClipboardEvent) => {
        console.log('===========')
        const domparser = new DOMParser()
        const result = domparser.parseFromString(e.clipboardData!.getData('text/html'), 'text/html')
        console.log(result)
    })
}




function adjustIsolatedNode() {
    if (!globalKM.selectionRange || globalKM.selectionRange.collapsed) return

    // 选区不在  doc 或者不在同一个  doc 里，不用管
    const range = createRangeLikeFromRange(globalKM.selectionRange)
    if (!range.isInDoc) return

    const { endNode, startNode, commonAncestorNode } = range

    // 1. 找到到 ancestor 路径还是那个最后一个 isolate component 节点
    const endIsolateNode = findFarthestIsolateNode(endNode, commonAncestorNode)
    const startIsolateNode = findFarthestIsolateNode(startNode, commonAncestorNode)

    // 如果都没有被隔离，说明头尾都在同一个 context 下，不用处理。
    if (!endIsolateNode && !startIsolateNode) return

    let startContainer = range.startContainer
    let startOffset = range.startOffset
    let endContainer = range.endContainer
    let endOffset = range.endOffset

    // 2. 开始处理头部
    const newRange = document.createRange()
    newRange.setStart(startContainer, startOffset)
    newRange.setEnd(endContainer, endOffset)
    if (startIsolateNode) {
        // TODO 这里有问题，
        newRange.setStartBefore(findElementOrFirstChildFromNode(startIsolateNode))
    }

    // 3. 开始处理尾部
    if (endIsolateNode) {
        newRange.setEndAfter(findElementOrFirstChildFromNode(endIsolateNode))
    }

    globalKM.selection!.removeAllRanges()
    globalKM.selection!.addRange(newRange)
}

function adjustOffset0Text() {
    if (!globalKM.selectionRange || !globalKM.selectionRange.collapsed || !(globalKM.selectionRange.startOffset === 0)) return

    const currentNode = findNodeFromElement(globalKM.selectionRange.startContainer)
    if(currentNode.data.type !== 'Text' || !currentNode.previousSibling || currentNode.previousSibling.data.type !== 'Text') return

    setCursor(currentNode.previousSibling, currentNode.previousSibling.value.value.length)
}



/**
 *
 * 用来处理 selection 的头或者尾部选在了组件里面的文本的情况。
 * 这个时候需要把在所在的组件整个选上。如果选中的是组件中的组件，那么需要把组高层的组件选上。
 */
function adjustSelection() {
    if (!globalKM.selectionRange) return
    if (globalKM.selectionRange.collapsed) {
        adjustOffset0Text()
    } else {
        adjustIsolatedNode()
    }
}


function findFarthestIsolateNode(startNode: NodeType, endAncestorNode: NodeType) {
    let pointer = startNode
    let foundNode
    while(pointer && pointer !== endAncestorNode) {
        // @ts-ignore
        if (pointer.constructor.isolated) {
            foundNode = pointer
        }
        pointer = pointer.parent
    }

    return foundNode

}


// @ts-ignore
window.findNodeFromElement = findNodeFromElement

