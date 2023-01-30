import {buildReactiveView, findElementOrFirstChildFromNode, waitUpdate} from "./buildReactiveView";
// @ts-ignore
import {nodeTypes as defaultNodeTypes} from "./nodeTypes";
import {NodeType} from "./NodeType";
import {LinkedList, LinkedListFragment} from "./linkedList";
import {ExtendedDocumentFragment} from "./DOM";
import {createDelegator, EventDelegator} from "./event";
import patchRichTextEvents from "./patchRichTextEvents";
import {Plugin, registerPlugins} from "./plugin";
import {createDocReactiveState} from "./createDocReactiveState";

export const viewToNodeMap = new WeakMap()

export type NodeData = {
    type: string,
    content?: Array<any>,
    children?: Array<any>,
    value?: string,
    syncValue? : Function,
    props?: any
}

type NodeTypes = {
    [k: string]: typeof NodeType
}

export class Doc {
    root: NodeType
    eventDelegator: EventDelegator
    element?: HTMLElement
    constructor(
        readonly data: NodeData,
        readonly docContainer: HTMLElement = document.createElement('div'),
        readonly plugins: Plugin[] = [],
        readonly nodeTypes:NodeTypes = defaultNodeTypes,
        readonly boundaryContainer = document.body
    ) {

        const { result: doc } = this.buildModelFromData(data)
        this.root = doc

        this.eventDelegator = createDelegator()
        patchRichTextEvents(this.eventDelegator, this, boundaryContainer)
        const reactiveState = createDocReactiveState(this.eventDelegator, boundaryContainer)

        // TODO 把这个移到 patchRichTextEvents 里面 处理一下 element
        const commandUtils = { on: this.eventDelegator.on, ...reactiveState, boundaryContainer: this.boundaryContainer }

        registerPlugins(this.plugins, commandUtils)

        // TODO 应该只要 attach doc 就行了，其他细节隐藏掉
    }
    render() {
        // TODO 这里处理了 rootContainer 有点奇怪，用户有可能只是拿来测试，没有 rootContainer
        this.element = buildReactiveView(this.root, this.eventDelegator.subDelegators.block)
        this.element.setAttribute('contenteditable', 'true')
        this.docContainer.appendChild(this.element)
        this.eventDelegator.attach(this.element)
        this.eventDelegator.subDelegators.root && this.eventDelegator.subDelegators.root.attach(this.docContainer)

    }
    destroy() {
        // 主要是事件相关的问题
    }

    buildModelFromData(data: NodeData, container?: LinkedList, preventCreateDefaultContent = false, preventCreateDefaultChildren = false) {
        const Type =  this.nodeTypes[data.type] as typeof NodeType
        const result = new Type(data, container, this)
        let firstLeaf: NodeType, lastLeaf: NodeType

        if (Type.isLeaf) {
            firstLeaf = lastLeaf = result
        } else {
            // 添加 content
            const content = data.content || (preventCreateDefaultContent ? undefined : Type.createDefaultContent && Type.createDefaultContent())
            content?.forEach((contentItem) => {
                const { result: contentItemResult, firstLeaf: firstContentItemLeaf} = this.buildModelFromData(contentItem, result.content)
                // debugger
                result.content!.insertBefore(contentItemResult)
                if (!firstLeaf) firstLeaf = firstContentItemLeaf
            })

            // 添加 children
            const children = data.children || (preventCreateDefaultChildren ? undefined : Type.createDefaultChildren && Type.createDefaultChildren())
            children?.forEach((child) => {
                const {result: childResult, lastLeaf: lastChildLeaf} = this.buildModelFromData(child, result.children)

                result.children!.insertBefore(childResult)
                if(lastChildLeaf) {
                    lastLeaf = lastChildLeaf
                }
            })

            // 好像不把自己的 content 和 children 连接上也没关系，往上面找就行了。
        }

        // @ts-ignore
        return { firstLeaf, lastLeaf, result}
    }
    replaceNode(newNodeData: NodeData, refNode: NodeType) {
        const { result: newNode } = this.buildModelFromData(newNodeData, refNode.container)
        refNode.container!.insertBefore(newNode, refNode)
        refNode.container!.removeBetween(newNode, refNode)
        return newNode
    }
    insertContentNodeAfter(newNodeData: NodeData , refNode: NodeType ) {
        const { result: newNode } = this.buildModelFromData(newNodeData, refNode.container)
        refNode.parent!.content!.insertAfter(newNode, refNode)
    }
    insertChildNodeAfter(newNodeData: NodeData , refNode: NodeType ) {
        const { result: newNode } = this.buildModelFromData(newNodeData, refNode.container)
        refNode.parent!.children!.insertAfter(newNode, refNode)
    }
    splitTextNode(node: NodeType, offset: number, splitAsPrev?: boolean) {
        if (offset === 0 && splitAsPrev) return
        if (offset === node.value!.value.length && (!splitAsPrev)) return
        const newNodeData = cloneDeep(node.data)
        newNodeData.value = splitAsPrev ? node.value!.value.slice(0, offset) : node.value!.value.slice(offset)
        const { result: newNode } = this.buildModelFromData(newNodeData, node.container)
        const insertMethod =  splitAsPrev ?
            node.parent!.content!.insertBefore :
            node.parent!.content!.insertAfter

        insertMethod.call(node.parent!.content, newNode, node)

        // 更新自己
        console.log(node.value!.value, offset, splitAsPrev ? node.value!.value.slice(offset) : node.value!.value.slice(0, offset))
        node.value!.value = splitAsPrev ? node.value!.value.slice(offset) : node.value!.value.slice(0, offset)
    }
    async splitTextAsBlock(inputNode: RangeLike | Range) : Promise<NodeType>{
        const node = inputNode instanceof Range ? findNodeFromElement(inputNode.startContainer) : inputNode
        const offset = inputNode.startOffset
        if(!(node.constructor as typeof NodeType).isLeaf) throw new Error('split as block can only start from text leaf')

        const parent = node.parent!
        const isAtContentEnd = node === node.container.tail.node && offset === node.value.value.length
        const isAtContentHead = node === node.container.head.next.node && offset === 0
        if (!isAtContentEnd) {
            // 往前产生一个 type 相同的
            if (isAtContentHead) {
                const newNode = parent.constructor.createSiblingAsDefault ? parent.cloneEmpty() : this.createDefaultNode()
                parent.parent.children.insertBefore(newNode, parent)
            } else {
                // TODO 这里抽象泄漏了！！！！但暂时好像没有其他方法，因为调用了 splitTextNode，里面又调用了 insertBefore，
                //  但后面又把 insert 进去的全部 removeBetween 了，这个时候原本 insertBefore 拿到的 patchResult 里面的引用 又都变了。
                //  等到真正去走 patch function 的时候，引用已经变了。
                // TODO 或者先 remove，再单独处理 fragment ?
                this.splitTextNode(node, offset)
                await waitUpdate()

                const { removed } = parent!.content!.removeBetween(undefined, node)
                const { result: newNode } = this.buildModelFromData({ type: parent.data.type }, parent.container, true)
                newNode.content!.insertBefore( new LinkedListFragment(removed) )
                // 插到头部去
                parent.parent!.children!.insertBefore(newNode, parent)
            }

            // 返回断开处的第一个节点，外部可以用来 setCursor
            return parent!.content!.head.next.node
        } else {
            console.log('at end')
            // TODO 逻辑还要梳理
            // 如果是在一个可以有 children 的 content 的结尾，那么应该是建立这个节点的 children
            let newNode
            if(parent.constructor.createSiblingAsDefault) {
                newNode = parent.cloneEmpty()
                parent.parent!.children!.insertAfter(newNode, parent)
            } else {
                newNode = this.createDefaultNode()
                if (parent.constructor.hasChildren) {
                    // 但这里有个例外，list 这种回车也是建立一个兄弟节点怎么算？Section 是建立 children，但 list 不是？
                    // 创建一个 children 节点在头部
                    parent.children!.insertAfter(newNode)
                } else {
                    // 如果是一个不能有 children 的，那么应该是建立一个兄弟节点，例如 Para。
                    // 创建一个 sibling
                    parent.parent!.children!.insertAfter(newNode, parent)
                }
            }
            return newNode.content!.head.next.node
        }
    }
    formatRange(range : RangeLike | Range, format: Object) {
        // CAUTION 伪造的 range 对象直接提供 node，节约性能
        const startNode = (range as RangeLike).startNode || findNodeFromElement((range as Range).startContainer)
        const endNode = (range as RangeLike).endNode || findNodeFromElement((range as Range).endContainer)
        // 要先拿出来，不然后面 splitTextNode 的时候如果 from === to， range 里面的值可能变，
        const { startOffset, endOffset } = range

        this.splitTextNode(startNode, startOffset, true)
        // 同一个 node 的情况，处理完 startNode 以后节点的 value 变了，当然 offset 也不一样了。
        this.splitTextNode(
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
    createDefaultNode(content?: LinkedList) {
        // TODO 变成可以配置的？
        const data: NodeData = { type: 'Para'}
        if (!content) {
            data.content = createDefaultContent()
        }
        const { result } = this.buildModelFromData(data)

        if (content) {
            result.content!.insertAfter(content)
        }
        return result as NodeType
    }
    createDefaultTextNode(value = '') {
        return this.buildModelFromData({type: 'Text', value}).result
    }
}




export function findNodeFromElement(element: HTMLElement | Node) {
    let pointer: HTMLElement | Node | null = element
    while(pointer && pointer !== document.body) {
        const item = viewToNodeMap.get(pointer)
        if (item) {
            return item
        } else {
            pointer = ExtendedDocumentFragment.elToFragment.get(pointer) || pointer.parentElement
        }
    }
}



function insertTextNodeValue(node: NodeType, offset: number, textToInsert: string, useDefaultBehavior?: boolean) : boolean{
    const newValue = node.value!.value.slice(0, offset) + textToInsert + node.value!.value.slice(offset)
    // 如果字符本身不是空的，那么就不能 default behavior，因为我们使用了 &ZeroWidthSpace 占位，需要处理一下。
    if (useDefaultBehavior && textToInsert && node.value!.value) {
        node.syncValue!(newValue)
        // 表示使用 syncValue 成功了
        return true
    } else {
        node.value!.value = newValue
    }
    return false
}


// function findPathToAncestor(start, ancestor) {
//     const result = []
//     let pointer = start
//     while(pointer && pointer !== ancestor) {
//         result.unshift(pointer)
//         pointer = pointer.parent
//     }
//
//     return (pointer && pointer === ancestor) ? result : undefined
// }


function mergeContent(startNode: NodeType, startOffset: number, endNode: NodeType, endOffset: number, textToInsert: string, tryUseDefaultBehavior = false) : boolean{
    // 看看是不是在同一个文本区域
    let inSameTextCollection = startNode.container === endNode.container
    let pointer = startNode
    while (pointer && !inSameTextCollection) {
        if (pointer === endNode) {
            inSameTextCollection = true
        } else {
            pointer = pointer.nextSibling
        }
    }


    // 1. 先处理头
    if (startNode !== endNode) {
        if (!inSameTextCollection) {
            startNode.parent!.content!.removeBetween(startNode)
        } else {
            startNode.parent!.content!.removeBetween(startNode, endNode)
        }
    }


    // 2. 处理合并情况
    // TODO 如果当前的 startNode 节点全部删除完了呢？
    const newValue = startNode.value!.value.slice(0, startOffset) + textToInsert + endNode.value!.value.slice(endOffset)
    const canUseDefaultBehavior = tryUseDefaultBehavior && inSameTextCollection && !!newValue
    if (canUseDefaultBehavior) {
        // 支持使用 defaultBehavior，updateValue 方法被 patch 了，不会触发视图重新计算。
        startNode.syncValue!(newValue)
    } else {
        if (tryUseDefaultBehavior) console.warn('not in same content collection or node empty, cant use default behavior')
        // 如果没内容了，并且合并后的 content 里面还有内容(startNode 不是头或者 endNode 不是尾巴)，那么就可以删掉自己
        if (!newValue && (startNode !== startNode.container!.head.next.node || (endNode !== endNode.container!.tail?.node) )) {
            // 删掉自己
            startNode.parent!.content?.removeBetween(startNode.container?.getItem(startNode).prev.node, startNode)
            console.log("delete self", startNode.parent!.content)
        } else {
            startNode.value!.value = newValue
        }
    }

    // 处理尾巴
    if(startNode !== endNode && !inSameTextCollection) {
        // 把endNode 后面的 content 全部加上。
        // CAUTION endNode 在这里已经是确定不要了，所以直接 move 掉
        endNode.parent!.content!.removeBetween(undefined, endNode)
        startNode.parent!.content!.insertBefore(endNode.parent!.content!.move())
    }



    // 表示是否成功使用了 syncValue
    return canUseDefaultBehavior
}

function updateStartNodeToAncestor(startNode: NodeType, ancestorNode: NodeType) {
    if( startNode === ancestorNode || startNode.parent === ancestorNode ) return undefined

    // 这里只处理 children，content 在一开始就处理掉了
    let pointer: NodeType = startNode.parent!
    pointer!.children!.removeBetween()
    while(pointer && pointer.parent !== ancestorNode){
        pointer.parent!.children!.removeBetween(pointer)
        pointer = pointer.parent!
    }
    return pointer
}


function updateEndNodeToAncestor(endNode: NodeType, ancestorNode: NodeType, ancestorStartChild: NodeType, startNodeParent: NodeType) {
    if (endNode === ancestorNode || endNode.parent === ancestorNode) return undefined

    let pointer = endNode.parent
    while(pointer && pointer !== ancestorNode){
        const parent = pointer.parent!
        // 1. 移除当前的节点的所有前面的兄弟节点，包括自己。注意这里可能出现 ancestorStartChild 就是 ancestorNode 节点的情况，
        //  例如从 section 的 content 开始选择。这时 ancestorStartChild 传入的是 undefined，逻辑还是正确。
        parent.children!.removeBetween(parent === ancestorNode ? ancestorStartChild : undefined, pointer)
        const remainedLast = parent.children!.getItem(pointer).next?.node
        // 2. 把自己的 children 提升上来。
        // TODO 如果 children 是兼容的，就在这样处理，例如 list item 的每层提升。
        //  如果不兼容，就不处理的了。例如 section 下的 list。
        if (pointer.children?.tail) {
            // 如果已经到顶了，TODO 并且 startNodeParent 的 children 和当前是兼容的，那么可以合并变成 startNodeParent 的 children, 否和是兄弟节点。
            // 这里没处理兼容之类的问题
            if (parent === ancestorNode && (startNodeParent.constructor as typeof NodeType).hasChildren) {
                // startNodeParent.children 到这一步的时候 stateNodeParent 应该处理过了，应该是个空的
                if (startNodeParent.children!.tail) {
                    debugger
                    throw new Error('startNode children not empty')
                }
                startNodeParent.children!.insertBefore(pointer!.children!.move())
            } else {
                // 提升到原本 pointer 所在的位置。
                parent!.children!.insertBefore(pointer.children!.move(), remainedLast)
            }
        }

        pointer = pointer.parent
    }

}

// TODO 支持 RangeLike 作为参数
export function updateRange(inputRange: Range | RangeLike, textToInsert: string, tryUseDefaultBehavior?:boolean) {

    const range: RangeLike = inputRange instanceof Range ? createRangeLikeFromRange(inputRange) : (inputRange as RangeLike)
    const startNode = range.startNode
    let useDefaultBehaviorSuccess = false

    if (range.collapsed) {
        useDefaultBehaviorSuccess = insertTextNodeValue(startNode, range.startOffset, textToInsert, tryUseDefaultBehavior)
    } else {
        const { endNode, commonAncestorNode: ancestorNode } = range

        if (!startNode || !endNode || !ancestorNode) {
            throw new Error('range not valid')
        }

        // 1. 删除 range 之间的所有节点
        // CAUTION 一定要先处理这个，因为后面处理 mergeContent 的时候，startNode 都是有可能被删除的。
        const ancestorStartChild = updateStartNodeToAncestor(startNode, ancestorNode)

        // 2. merge 所有的 endNode 里面的内容到 startNode 后面
        useDefaultBehaviorSuccess = mergeContent(startNode, range.startOffset, endNode, range.endOffset, textToInsert, tryUseDefaultBehavior)

        // 3. 尾部节点
        updateEndNodeToAncestor(endNode, ancestorNode, ancestorStartChild!, startNode.parent!)
    }

    return {node: startNode, offset: range.startOffset + textToInsert.length, success: useDefaultBehaviorSuccess}
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

function cloneDeep(obj: Object) {
    return JSON.parse(JSON.stringify(obj))
}




export function createDefaultContent() {
    return [{type: 'Text', value: ''}]
}


// 回车行为的主要调用者



function forEachNodeInRange(from: NodeType, to: NodeType, handle: (i: NodeType) => void) {
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
        if ((pointer.constructor as typeof NodeType).isLeaf) {
            handle(pointer)

            if (pointer === to) break

            // 如果没有 next 了，就往上走
            lastPointer = pointer
            pointer = pointer.parent!.content!.getItem(pointer).next?.node || pointer.parent
            continue
        }

        // 非 leaf 的情况，那么是 content 遍历完了，要么是 children 遍历完了，要么是从上面下来的，刚开始处理这个节点
        // 1. content 遍历完了，准备处理 children，没有就往上走
        if (lastPointer === pointer.content!.tail!.node) {
            lastPointer = pointer
            // 开始处理 children 了
            // 没有 children，说明自己整个节点都处理完了，只能再往上指了
            pointer = pointer.children!.head.next?.node || pointer.parent
            continue
        }

        // 非 leaf 的情况，
        // 2. 此时是某个 children 处理完了，从下往上走的。
        const child = pointer.children!.getItem(lastPointer)
        if (child) {
            // 有下一个兄弟，不然说明 children 也遍历完了，该往上走了
            lastPointer = pointer
            pointer = child.next?.node || pointer.parent
            continue
        }

        // 3. content 处理完之后开始处理 children 的情况
        if (pointer.parent === lastPointer) {
            lastPointer = pointer
            pointer = pointer.content!.head.next?.node || pointer.children!.head.next?.node
        }

        throw new Error('unhandled condition')
    }
}


export type RangeLike = {
    startNode: NodeType
    endNode: NodeType
    startContainer: Range['startContainer'],
    endContainer: Range['endContainer'],
    startOffset: Range['startOffset'],
    endOffset: Range['endOffset'],
    collapsed: Range['collapsed'],
    commonAncestorNode: NodeType
    commonAncestorContainer: Range['commonAncestorContainer'],
    isInDoc: boolean,
}




// TODO 补全缺的 element 相关的字段
export function createRangeLike({ startNode, startOffset, endNode, endOffset}: {startNode: NodeType, endNode: NodeType, startOffset: number, endOffset: number}) : RangeLike {
    let commonAncestorNodeCache:NodeType|undefined
    let startContainerCache: Node
    let endContainerCache: Node
    let commonAncestorContainerCache: Node
    return {
        startNode,
        startOffset,
        endNode,
        endOffset,
        collapsed: startNode === endNode && startOffset === endOffset,
        get commonAncestorNode() {
            if (!commonAncestorNodeCache) {
                if (startNode === endNode) {
                    commonAncestorNodeCache = startNode
                } else {
                    const visited = new Set()
                    let pointer:NodeType|undefined = startNode
                    while(pointer) {
                        visited.add(pointer)
                        pointer = pointer.parent
                    }
                    pointer = endNode
                    while(pointer) {
                        if (visited.has(pointer)) {
                            commonAncestorNodeCache = pointer
                            break
                        } else {
                            pointer = pointer.parent
                        }
                    }
                }
            }

            return commonAncestorNodeCache as NodeType
        },
        get startContainer() {
            startContainerCache = findElementOrFirstChildFromNode(startNode)
            return startContainerCache
        },
        get endContainer() {
            endContainerCache = findElementOrFirstChildFromNode(endNode)
            return endContainerCache
        },
        get commonAncestorContainer() {
            commonAncestorContainerCache = findElementOrFirstChildFromNode(this.commonAncestorNode)
            return commonAncestorContainerCache
        },
        get isInDoc() {
            return this.startNode
                && this.endNode
                && this.startNode.root === this.endNode.root
        }
    }
}

export function createRangeLikeFromRange(range: Range) {
    let startNodeCache: NodeType, endNodeCache: NodeType, commonAncestorNodeCache: NodeType

    const extendProperties = {
        get startNode() {
            if (!startNodeCache) {
                startNodeCache = findNodeFromElement(range.startContainer)
            }
            return startNodeCache
        },
        get endNode() {
            if (!endNodeCache) {
                endNodeCache = findNodeFromElement(range.endContainer)
            }
            return endNodeCache
        },
        get commonAncestorNode() {
            if (!commonAncestorNodeCache) {
                commonAncestorNodeCache = findNodeFromElement(range.commonAncestorContainer)
            }
            return commonAncestorNodeCache
        },
        get isInDoc() {
            return this.startNode
                && this.endNode
                && this.startNode.root === this.endNode.root
        }
    }

    return new Proxy(range, {
        get(target, propName) {
            if (propName in extendProperties) {
                // @ts-ignore
                return extendProperties[propName];
            }

            // @ts-ignore
            if (typeof target[propName] === 'function') return target[propName].bind(target)

            // @ts-ignore
            return target[propName];
        }
    }) as unknown as RangeLike
}

export function findPreviousSiblingInTree(node: NodeType) {
    if (node.previousSibling) return node.previousSibling

    let pointer = node.parent
    let found
    while(pointer) {
        if (pointer.previousSibling) {
            break
        } else if(pointer.parent.content?.tail){
            found = pointer.parent.content.tail.node
            break
        } else {
            pointer = pointer.parent
        }
    }

    if (found) return found

    if (pointer) {
        return findLastLeafNode(pointer.previousSibling)
    }
}

function findLastLeafNode(node: NodeType) {
    let pointer = node
    while(pointer.children?.tail) {
        pointer = pointer.children.tail.node
    }

    return pointer.content!.tail!.node
}


