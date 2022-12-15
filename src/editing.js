import { nodeToElement } from "./buildReactiveView";
import {nodeTypes} from "./nodeTypes";

export const viewToNodeMap = new WeakMap()


export function buildModelFromData(data, parent) {
    const Type =  nodeTypes[data.type]
    const result = new Type(data, parent)
    let firstLeaf, lastLeaf

    if (Type.isLeaf) {
        firstLeaf = lastLeaf = result
    } else {
        // 添加 content
        data.content?.forEach((contentItem) => {
            const { result: contentItemResult, firstLeaf: firstContentItemLeaf} = buildModelFromData(contentItem, result)
            // debugger
            result.content.insertBefore(contentItemResult)
            if (!firstLeaf) firstLeaf = firstContentItemLeaf
        })

        // 添加 children
        data.children?.forEach((child) => {
            const {result: childResult, lastLeaf: lastChildLeaf} = buildModelFromData(child, result)

            result.children.insertBefore(childResult)
            if(lastChildLeaf) {
                lastLeaf = lastChildLeaf
            }
        })

        // 好像不把自己的 content 和 children 连接上也没关系，往上面找就行了。
    }

    return {
        firstLeaf,
        result,
        lastLeaf
    }
}

export function findNodeFromElement(element) {
    let pointer = element
    while(pointer !== document.body) {
        const item = viewToNodeMap.get(pointer)
        if (item) {
            return item
        } else {
            pointer = pointer.parentElement
        }
    }
}



function insertTextNodeValue(node, offset, textToInsert, needUseDefaultBehavior) {
    const newValue = node.value.value.slice(0, offset) + textToInsert + node.value.value.slice(offset)
    if (needUseDefaultBehavior) {
        node.updateValue(newValue)
    } else {
        node.value.value = newValue
    }
}


function findPathToAncestor(start, ancestor) {
    const result = []
    let pointer = start
    while(pointer && pointer !== ancestor) {
        result.unshift(pointer)
        pointer = pointer.parent
    }

    return (pointer && pointer === ancestor) ? result : undefined
}


function mergeContent(startNode, startOffset, endNode, endOffset, textToInsert, useDefaultBehavior) {
    const isSameNode = startNode === endNode
    if (!isSameNode) {
        startNode.parent.content.removeBetween(startNode)
    }

    // 支持使用 defaultBehavior，updateValue 方法被 patch 了，不会触发视图重新计算。
    if (useDefaultBehavior) {
        startNode.updateValue(startNode.value.value.slice(0, startOffset) + textToInsert + endNode.value.value.slice(endOffset))
    } else {
        startNode.value.value = startNode.value.value.slice(0, startOffset) + textToInsert + endNode.value.value.slice(endOffset)
    }

    if(!isSameNode) {
        // 把endNode 后面的 content 全部加上。
        // CAUTION endNode 在这里已经是确定不要了，所以直接 move 掉
        endNode.parent.content.removeBetween(undefined, endNode)
        startNode.parent.content.insertBefore(endNode.parent.content.move())
    }
}

function updateStartNodeToAncestor(startNode, ancestorNode) {
    if( startNode === ancestorNode || startNode.parent === ancestorNode ) return undefined

    // 这里只处理 children，content 在一开始就处理掉了
    let pointer = startNode.parent
    pointer.children.removeBetween()
    while(pointer && pointer.parent !== ancestorNode){
        pointer.parent.children.removeBetween(pointer)
        pointer = pointer.parent
    }
    return pointer
}


function updateEndNodeToAncestor(endNode, ancestorNode, ancestorStartChild, startNodeParent) {
    if (endNode === ancestorNode || endNode.parent === ancestorNode) return undefined

    let pointer = endNode.parent
    while(pointer && pointer !== ancestorNode){
        const parent = pointer.parent
        // 1. 移除当前的节点的所有前面的兄弟节点，包括自己。注意这里可能出现 ancestorStartChild 就是 ancestorNode 节点的情况，
        //  例如从 section 的 content 开始选择。这时 ancestorStartChild 传入的是 undefined，逻辑还是正确。
        const remainedLast = parent.children.removeBetween(parent === ancestorNode ? ancestorStartChild : undefined, pointer)
        // 2. 把自己的 children 提升上来。
        // TODO 如果 children 是兼容的，就在这样处理，例如 list item 的每层提升。
        //  如果不兼容，就不处理的了。例如 section 下的 list。
        if (pointer.children?.tail) {
            // 如果已经到顶了，TODO 并且 startNodeParent 的 children 和当前是兼容的，那么可以合并变成 startNodeParent 的 children, 否和是兄弟节点。
            // 这里没处理兼容之类的问题
            if (parent === ancestorNode && startNodeParent.constructor.hasChildren) {
                // startNodeParent.children 是个空的
                if (startNodeParent.children.tail) {
                    throw new Error('startNode children not empty')
                }
                startNodeParent.children.insertBefore(pointer.children.move())
            } else {
                // 提升到原本 pointer 所在的位置。

                parent.children.insertBefore(pointer.children.move(), remainedLast)
            }
        }

        pointer = pointer.parent
    }

}

export function updateRange(range, textToInsert, needUseDefaultBehavior) {
    const startNode = findNodeFromElement(range.startContainer)

    if (range.collapsed) {
        insertTextNodeValue(startNode, range.startOffset, textToInsert, needUseDefaultBehavior)
        console.log(startNode.value.value)
        return true
    }


    const endNode = findNodeFromElement(range.endContainer)
    const ancestorNode = findNodeFromElement(range.commonAncestorContainer)
    if (!startNode || !endNode || !ancestorNode) {
        throw new Error('range not valid')
    }

    // 看看是不是在同一个文本区域
    let inSameTextCollection = startNode === endNode
    let pointer = startNode
    while (pointer && !inSameTextCollection) {
        if (pointer === endNode) {
            inSameTextCollection = true
        } else {
            pointer = pointer.next
        }
    }

    mergeContent(startNode, range.startOffset, endNode, range.endOffset, textToInsert, needUseDefaultBehavior && inSameTextCollection)
    console.log(startNode.value.value)

    // 删除 range 之间的所有节点
    const ancestorStartChild = updateStartNodeToAncestor(startNode, ancestorNode)
    updateEndNodeToAncestor(endNode, ancestorNode, ancestorStartChild, startNode.parent)


    return inSameTextCollection
}

// function findRangeText(range) {
//     console.log(range.baseOffset)
//     if (range.isCollapsed) return []
//
//     const result = []
//     const startNode = findNodeFromElement(range.startContainer)
//     const endNode = findNodeFromElement(range.endContainer)
//     let base = modelToLinkedReactiveNode.get(startNode)
//     while(base) {
//         if (base.node === startNode) {
//             result.push(startNode.value.value.slice(range.baseOffset))
//         } else if(base.node === endNode) {
//             result.push(endNode.value.value.slice(0, range.extentOffset))
//         } else {
//             result.push(base.node.value.value)
//         }
//         base = base.next
//     }
//
//
//     return result
// }

function cloneDeep(obj) {
    return JSON.parse(JSON.stringify(obj))
}


export function replaceNode(newNodeData, refNode) {
    const { result: newNode } = buildModelFromData(newNodeData, refNode.parent)
    refNode.parent.children.insertBefore(newNode, refNode)
    refNode.parent.children.removeBetween(newNode, refNode)

}


function splitTextNode(node, offset, splitAsPrev) {
    if (offset === 0 && splitAsPrev) return
    if (offset === node.value.value.length && (!splitAsPrev)) return
    const newNodeData = cloneDeep(node.data)
    newNodeData.value = splitAsPrev ? node.value.value.slice(0, offset) : node.value.value.slice(offset)
    const { result: newNode } = buildModelFromData(newNodeData, node.parent)
    const insertMethod =  splitAsPrev ?
        node.parent.content.insertBefore :
        node.parent.content.insertAfter

    insertMethod.call(node.parent.content, newNode, node)

    // 更新自己
    console.log(node.value.value, offset, splitAsPrev ? node.value.value.slice(offset) : node.value.value.slice(0, offset))
    node.value.value = splitAsPrev ? node.value.value.slice(offset) : node.value.value.slice(0, offset)
}

function forEachNodeInRange(from, to, handle) {

    /**
     * 以下几种情况：
     * 1. 当前节点是 content.textNode，判断还有没有 next，没有的话，返回上一个节点。告诉循环 content 循环完了。
     */
    let pointer = from
    let lastPointer
    let loopCount = 0
    const maxLoop = 10000
    while(pointer) {
        if (loopCount > maxLoop ) throw new Error('max loop')
        if (pointer.constructor.isLeaf) {
            handle(pointer)

            if (pointer === to) break

            // 如果没有 next 了，就往上走
            lastPointer = pointer
            pointer = pointer.parent.content.getItem(pointer).next?.node || pointer.parent
            continue
        }

        // 非 leaf 的情况，那么是 content 遍历完了，要么是 children 遍历完了，要么是从上面下来的，刚开始处理这个节点
        // 1. content 遍历完了，准备处理 children，没有就往上走
        if (lastPointer === pointer.content.tail.node) {
            lastPointer = pointer
            // 开始处理 children 了
            // 没有 children，说明自己整个节点都处理完了，只能再往上指了
            pointer = pointer.children.head.next?.node || pointer.parent
            continue
        }

        // 非 leaf 的情况，
        // 2. 此时是某个 children 处理完了，从下往上走的。
        const child = pointer.children.getItem(lastPointer)
        if (child) {
            // 有下一个兄弟，不然说明 children 也遍历完了，该往上走了
            lastPointer = pointer
            pointer = child.next?.node || pointer.parent
            continue
        }

        // 3. content 处理完之后开始处理 children 的情况
        if (pointer.parent === lastPointer) {
            lastPointer = pointer
            pointer = pointer.content.head.next?.node || pointer.children.head.next?.node
        }

        throw new Error('unhandled condition')
    }


}


export function formatRange(range, format) {
    // CAUTION 伪造的 range 对象直接提供 node，节约性能
    const startNode = range.startNode || findNodeFromElement(range.startContainer)
    const endNode = range.endNode || findNodeFromElement(range.endContainer)
    // 要先拿出来，不然后面 splitTextNode 的时候如果 from === to， range 里面的值可能变，
    const { startOffset, endOffset } = range

    splitTextNode(startNode, startOffset, true)
    // 同一个 node 的情况，处理完 startNode 以后节点的 value 变了，当然 offset 也不一样了。
    splitTextNode(
        endNode,
        startNode === endNode ? (endOffset - startOffset): endOffset
    )
    // 递归阅读并且 format
    forEachNodeInRange(startNode, endNode, (node) => {
        if (!node.props.formats) {
            node.props.formats = format
        } else {
            Object.assign(node.props.formats, format)
        }

    })
}

// TODO 理论上应该支持任何一种 node 开始 setCursor
export function setCursor(node, offset) {
    if(!node.constructor.isLeaf) {
        return console.error('not implemented')
    }

    const element = nodeToElement.get(node)
    if (!element) {
        return console.error('cannot find element of node', node, offset)
    }

    const range = document.createRange()
    // TODO 这里和 leaf element 的实现耦合了。
    range.setStart(element.firstChild, offset)

    const selection = window.getSelection()
    selection.empty()
    selection.addRange(range)
}

