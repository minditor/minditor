// @ts-ignore
import {autorun, autorunForEach} from '@ariesate/reactivity'
import {viewToNodeMap} from "./editing";
import { LinkedList } from "./linkedList";
import {NodeType} from "./NodeType";
import {ExtendedDocumentFragment} from "./DOM";


export const nodeToElement = new WeakMap()

export function buildReactiveLinkedList(contentLinkedList: LinkedList) {
    return function attach(dom: HTMLElement) {
        if (dom.childNodes.length) throw new Error('reactive list container should have no siblings')

        let parentEl: DocumentFragment | HTMLElement = document.createDocumentFragment()

        const stopAutorun = autorunForEach(contentLinkedList, [contentLinkedList.insertAfter, contentLinkedList.removeBetween],
            (node: NodeType) => {
                // 如果一讲有了 element，说明是把别人的 node 移动过来的额，不不用再新建，
                // CAUTION 这要做更严谨的校验，防止共用 node 引用的情况。
                let element = nodeToElement.get(node)
                if (element) {
                    if (element instanceof ExtendedDocumentFragment) {
                        // 说明是复用
                        element.revoke()
                    }
                } else {
                    element = buildReactiveView(node)
                }

                nodeToElement.set(node, element)

                const item = contentLinkedList.getItem(node)
                const refElement = findElementOrFirstChildFromNode(item.next?.node)

                // 到底什么时候会触发这个情况？？？
                if (parentEl === dom && item.next?.node && !refElement){
                    // parentEl === dom 但是却没有 next 说明是最后一个，或者之前是空的？
                    debugger
                }

                // TODO 这里有大问题，因为可能存在 refElement，但并不是同一个 parentEl 的，例如 updateRange 的情况，出现了中间新建节点，拼合后面已有节点的情况。
                //   这个时候 next 当然是有的，但那是之前的。

                // TODO 还有
                if (refElement?.parentElement === parentEl) {
                    parentEl.insertBefore(element, refElement)
                } else {
                    // console.log(refElement?.parentElement === parentEl, parentEl, element)
                    parentEl.insertBefore(element, null)
                }

            },
            (removedNode: NodeType) => {
                const element = nodeToElement.get(removedNode)
                if (!element) debugger
                console.log('remove element', element)
                element.remove()
            },
            scheduleUpdate,
            {
                onRecompute() {
                    debugger
                    throw new Error('should never recomputed')
                }
            }
        )

        contentLinkedList.onMove(() => {
            stopAutorun()
        })

        // 第一次的时候为了节约性能所以用 fragment，后面增量就都直接用 dom 了
        dom.appendChild(parentEl)
        parentEl = dom
    }
}


export function buildReactiveValue(node: NodeType) {
    return function attach(dom: HTMLElement ) {
        if (dom.childNodes.length) throw new Error('reactive value container should have no siblings')
        viewToNodeMap.set(dom, node)
        // let textNode = document.createTextNode('')
        let isLastTextEmpty = false

        autorun(() => {
                // textNode.nodeValue = node.value?.value || null
                dom.innerHTML = node.value?.value || '&ZeroWidthSpace;'
                isLastTextEmpty = !node.value?.value
            },
            // @ts-ignore
            ({ on }) => {
            // 自定义组件不一定有这个方法
                if (node.syncValue) {
                    on(node.syncValue, [node],  () => {
                        // 如果是从空变成有，或者有变成空，那么都还是要更新，无法利用增量跳过。
                        if(isLastTextEmpty || !node.value?.value) throw new Error('cannot patch from empty string')

                        console.log('use default behavior', node.value?.value)
                    })
                }
            },
            scheduleUpdate
        )
        // dom.appendChild(textNode)
    }
}

export function createReactiveAttribute(createAttribute: Function) {
    return function attach(dom : HTMLElement, attributeName: String, setAttribute: Function) {
        autorun(() => {
            setAttribute(dom, attributeName, createAttribute())
        }, undefined, scheduleUpdate)
    }
}


export function buildReactiveView(node: NodeType) {
    let reactiveContent, reactiveChildren, reactiveValue
    const Type = node.constructor as typeof NodeType

    if (Type.hasContent) {
        reactiveContent = buildReactiveLinkedList(node.content!)
    }

    if (Type.hasChildren) {
        reactiveChildren = buildReactiveLinkedList(node.children!)
    }

    if (Type.isLeaf) {
        reactiveValue = buildReactiveValue(node)
    }

    // TODO 如果 props 也希望被 reactiveView 化呢？
    // TODO 针对 leaf component 节点需要插入一个空的前节点帮助选中
    const element = node.render!({content:reactiveContent, children: reactiveChildren, value: reactiveValue, props: node.props})
    // TODO 可以是一个 fragment 吗？如果要支持，那么就必须保持住 fragment 和里面元素的引用关系
    if (!element) throw new Error('must return a element')
    viewToNodeMap.set(element, node)
    return element
}

const tokensToUpdate = new Set<Function>()
let scheduleTask: undefined | Promise<any>
function updateQueue() {
    // @ts-ignore
    for(let update of tokensToUpdate) {
        update()
    }
    tokensToUpdate.clear()
}

// CAUTION 默认使用的是同步的 update，因为我们没有搞定 patch 累加计算的问题
export function scheduleUpdate(updateMethod: Function) {
    // if (!scheduleTask) {
    //     scheduleTask = Promise.resolve().then(() => {
    //         updateQueue()
    //         scheduleTask = undefined
    //     })
    // }
    // tokensToUpdate.add(updateMethod)
    updateMethod()
}
export function waitUpdate() {
    if (!scheduleTask) {
        console.warn('no async task')
    }
    return scheduleTask
}

export function scheduleBatchUpdate(updateMethod: Function) {
    if (!scheduleTask) {
        scheduleTask = Promise.resolve().then(() => {
            updateQueue()
            scheduleTask = undefined
        })
    }
    tokensToUpdate.add(updateMethod)
}

export function setCursor(inputNode: NodeType, inputOffset: number) {
    let node = inputNode
    let offset = inputOffset
    if ((inputNode.constructor as typeof NodeType).setCursor) {
        const result = (inputNode.constructor as typeof NodeType).setCursor!(inputNode, inputOffset)
        if (result) {
            [node, offset] = result
        } else {
            console.warn('focus failed')
            return
        }
    }

    // TODO 默认就是选择第一个能 focus 的位置
    const range = document.createRange()
    range.setStart(findFirstDescendantElementFromNode(node), offset)

    range.collapse(true)
    const selection = window.getSelection()
    selection!.removeAllRanges()
    selection!.addRange(range)
}

export function findElementOrFirstChildFromNode(node: NodeType) {
    const el = nodeToElement.get(node)
    if (el instanceof ExtendedDocumentFragment) {
        return el.firstChild
    } else {
        return el
    }
}

export function findFirstDescendantElementFromNode(node: NodeType) {
    let last = nodeToElement.get(node)
    let pointer
    while(pointer = last.firstChild) {
        last = pointer
    }
    return last
}