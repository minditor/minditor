import {
    buildModelFromData,
    createRangeLike,
    findNodeFromElement,
    formatRange,
    setCursor,
    splitTextAsBlock,
    updateRange
} from "./editing";
import {nodeToElement, waitUpdate} from "./buildReactiveView";
import {LinkedList} from "./linkedList";


function getCurrentRange() {
    const selection = window.getSelection()
    return selection.getRangeAt(0).cloneRange()
}


let keydownRange
function setKeydownRange(range) {
    keydownRange = range && range.cloneRange()
}

function getKeydownRange() {
    return keydownRange.cloneRange()
}

function clearKeydownRange() {
    keydownRange = undefined
}

let lastKeydownKey





function handleSelection(selection) {
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





export default function patchTextEvents(on, trigger) {
    // 一致按着会有很多次 keydown 事件

    on('keydown', async (e) => {
        const selection = window.getSelection()
        if (!selection.rangeCount) return

        lastKeydownKey = e.key
        console.log('keydown', e, e.key, e.code)
        if (e.isComposing) return

        // 记录一下 range，后面 keyup 要用。
        setKeydownRange(selection.getRangeAt(0))

        //1.  单个字符，其他的 key 的名字都长于 1
        if(e.key.length === 1) {
            // // 自顶一个事件，怎么看待有 selection 的情况？是把 selection 一起传进去，还是拆成两个事件？
            handleSelection(selection)
            console.log("inserting", e.key)
            // CAUTION 不能在这里插入字符是因为这个时候并不知道是不是输入法的 keydown
            const updateInfo = updateRange(selection.getRangeAt(0), e.key, true)
            // 如果success ===false，说明使用 defaultBehavior 失败了
            console.log(updateInfo)
            if (!updateInfo.success) {
                console.log('use default failed')
                e.preventDefault()
                e.stopPropagation()
                await waitUpdate()
                setCursor(updateInfo.node, updateInfo.offset)
            }

            trigger(new CustomEvent('userInput',  { detail: {data: e.key} }))
        } else  if (e.key === 'Enter') {
            // 回车
            console.log("enter", e)
            e.preventDefault()
            e.stopPropagation()
            const splitPointNode = await splitTextAsBlock(selection.getRangeAt(0))
            // restore cursor
            await waitUpdate()
            setCursor(splitPointNode, 0)
        } else  if (e.key === 'Backspace') {

            const range = selection.getRangeAt(0)
            if (!range.collapsed) {
                const updateInfo = updateRange(selection.getRangeAt(0), '', true)
                // TODO 要处理 cursor?
                if (!updateInfo.success) {
                    e.preventDefault()
                    e.stopPropagation()
                    setCursor(updateInfo.node, updateInfo.offset)
                }

            } else {

                const node = findNodeFromElement(range.startContainer)
                // TODO 要不要直接修正一下节点位置？？？
                if (!node.constructor.isLeaf) throw new Error('range not in a leaf node')

                // 破坏性结构
                if (node === node.container.head.next.node && range.startOffset === 0) {
                    e.preventDefault()
                    e.stopPropagation()

                    const parent = node.parent

                    if(parent.constructor.unwrap) {
                        parent.constructor.unwrap(parent)
                    } else {
                        // 默认行为？content 合并，children 提升？
                        const previousSiblingInTree = node.previousSiblingInTree
                        if (previousSiblingInTree) {
                            // 合并内容

                            previousSiblingInTree.container.insertBefore(parent.content.move())
                            // 提升 children
                            if (parent.children.tail) {
                                if (previousSiblingInTree.parent.constructor.hasChildren) {
                                    previousSiblingInTree.parent.children.insertBefore(parent.children.move())
                                } else {
                                    previousSiblingInTree.parent.parent.children.insertAfter(parent.children.move(), previousSiblingInTree.parent)
                                }

                            }
                            // 最后再删掉，防止页面抖动
                            parent.remove()
                        }
                    }

                    await waitUpdate()
                    // 一定要重置一下，因为这时候 dom 更新了，可出现 cursor 漂移到上一级 div 上。
                    setCursor(node, 0)

                } else {
                    // 选中前一个字符 update 就行了
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
                        console.log(111, updateInfo)
                        e.preventDefault()
                        e.stopPropagation()
                        if (editingStartOffset === 0) {
                            // 铁定坍缩了
                            setCursor(editingPrevNode, editingPrevNode.value?.value.length || 0)
                        } else {
                            setCursor(updateInfo.node, updateInfo.offset)
                        }
                    }
                }
            }

        } else if (e.key === 'Tab') {
            //2.  TODO tab/shift+tab 向上升一级和向下降一级
            e.preventDefault()
            e.stopPropagation()
            const range = selection.getRangeAt(0)
            const node = findNodeFromElement(range.startContainer)
            // TODO 要不要直接修正一下节点位置？？？
            if (!node.constructor.isLeaf) throw new Error('range not in a leaf node')
            const parent = node.parent
            if(e.shiftKey) {
                if(parent.constructor.unwrap) {
                    parent.constructor.unwrap(parent, createDefaultNode)
                }
            } else {
                if(parent.constructor.wrap) {
                    parent.constructor.wrap(parent)
                }
            }
        }



    })


    on('compositionstart', (e) => {
        // TODO 往前删除一个字符？因为是输入法的开始？好像输入法自身也是这样
        const range = getKeydownRange()
        range.collapse(true)
        range.setEnd(range.startContainer, range.startOffset + 1)
        updateRange(range, '', true)
        console.log('compositionstart', e)
    })

    on('compositionend', (e) => {
        console.log('compositionend', e)
        const range = getKeydownRange()
        range.collapse(true)
        updateRange(range, e.data, true)
    })

    // 如果碰到了 component + 普通节点的组合，要选中整个 component.
    document.addEventListener('selectionchange', (e) => {
        adjustSelection()
    })
}

function adjustSelection() {

    const selection = window.getSelection()
    if (!selection.rangeCount) return

    const range = selection.getRangeAt(0)
    if (!range) return

    if(range.collapsed) {
        return
    }

    const ancestorNode = findNodeFromElement(range.commonAncestorContainer)
    if (!ancestorNode) {
        console.warn('not in a same document context')
    }

    const endNode = findNodeFromElement(range.endContainer)
    const startNode = findNodeFromElement(range.startContainer)

    // 1. 找到到 ancestor 路径还是那个最后一个 isolate component 节点
    const endIsolateNode = findFarthestIsolateNode(endNode, ancestorNode)
    const startIsolateNode = findFarthestIsolateNode(startNode, ancestorNode)

    // 说明在同一个 context 下，都没有跨越 isolate component
    if (!endIsolateNode && !startIsolateNode) return

    let startContainer = range.startContainer
    let startOffset = range.startOffset
    let endContainer = range.endContainer
    let endOffset = range.endOffset


    const newRange = document.createRange()
    newRange.setStart(startContainer, startOffset)
    newRange.setEnd(endContainer, endOffset)
    if (startIsolateNode) {
        newRange.setStartBefore(nodeToElement.get(startIsolateNode))
    }

    if (endIsolateNode) {
        newRange.setEndAfter(nodeToElement.get(endIsolateNode))
    }

    selection.removeAllRanges()
    selection.addRange(newRange)
}


function findFarthestIsolateNode(startNode, endAncestorNode) {
    let pointer = startNode
    let foundNode
    while(pointer && pointer !== endAncestorNode) {
        if (pointer.constructor.isLeaf) {
            foundNode = pointer
        }
        pointer = pointer.parent
    }

    return foundNode

}


window.findNodeFromElement = findNodeFromElement

