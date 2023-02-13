// @ts-ignore
import {autorun, autorunForEach} from '@ariesate/reactivity'
import {viewToNodeMap} from "./editing";
import { LinkedList } from "./linkedList";
import {NodeType} from "./NodeType";
import {AttributesArg, ExtendedDocumentFragment, setAttributes} from "./DOM";
import {EventDelegator} from "./event";
import { state as globalState } from './globals'

export const nodeToElement = new WeakMap()

export function buildReactiveLinkedList(contentLinkedList: LinkedList, eventDelegator: EventDelegator) {
    return function attach(dom: HTMLElement) {
        if (dom.childNodes.length) throw new Error('reactive list container should have no siblings')

        let parentEl: DocumentFragment | HTMLElement = document.createDocumentFragment()

        const stopAutorun = autorunForEach(contentLinkedList, [contentLinkedList.insertAfter, contentLinkedList.removeBetween],
            (node: NodeType, prevNode: NodeType) => {
                // 如果一讲有了 element，说明是把别人的 node 移动过来的额，不不用再新建，
                // CAUTION 这要做更严谨的校验，防止共用 node 引用的情况。
                debugger
                let element = nodeToElement.get(node)
                if (element) {
                    if (element instanceof ExtendedDocumentFragment) {
                        // 说明是复用
                        element.revoke()
                    }
                } else {
                    element = buildReactiveView(node, eventDelegator)
                }

                // CAUTION 这里千万不能去读 prev，不然整个 autorunForEach 就会依赖节点的 prev 属性，后面再 splitTextAsBlock 等产经里面
                //  复用了子链的时候，由于会  set prev，于是就是的这里产生不必要的 recompute。
                //  FIXME
                const refElementOrNull = findElementOrFirstChildFromNode(prevNode)

                // TODO 不记得下面这个问题到底是什么情况了。
                // TODO 这里有大问题，因为可能存在 refElement，但并不是同一个 parentEl 的，例如 updateRange 的情况，出现了中间新建节点，拼合后面已有节点的情况。
                //   这个时候 next 当然是有的，但那是之前的。
                parentEl.insertBefore(element, refElementOrNull? refElementOrNull.nextSibling : parentEl.firstChild)
            },
            (removedNode: NodeType) => {
                const element = nodeToElement.get(removedNode)
                if (!element) debugger
                console.log('remove element', element)
                element.remove()
            },
            scheduleImmediateUpdate,
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
            scheduleImmediateUpdate
        )
        // dom.appendChild(textNode)
    }
}

export function createReactiveAttribute(createAttribute: Function) {
    return function attach(dom : HTMLElement, attributeName: String, setAttribute: Function) {
        autorun(() => {
            setAttribute(dom, attributeName, createAttribute())
        }, undefined, scheduleImmediateUpdate)
    }
}


export function buildReactiveView(node: NodeType, blockEventDelegator: EventDelegator, extraAttrs?: AttributesArg ) {
    let reactiveContent, reactiveChildren, reactiveValue
    const Type = node.constructor as typeof NodeType

    if (Type.hasContent) {
        reactiveContent = buildReactiveLinkedList(node.content!, blockEventDelegator)
    }

    if (Type.hasChildren) {
        reactiveChildren = buildReactiveLinkedList(node.children!, blockEventDelegator)
    }

    if (Type.isLeaf) {
        reactiveValue = buildReactiveValue(node)
    }

    // TODO 如果 props 也希望被 reactiveView 化呢？
    // TODO 针对 leaf component 节点需要插入一个空的前节点帮助选中
    const element = node.render!({content:reactiveContent, children: reactiveChildren, value: reactiveValue, props: node.props})
    if (extraAttrs) setAttributes(extraAttrs, element)
    nodeToElement.set(node, element)

    if (!element) throw new Error('must return a element')
    viewToNodeMap.set(element, node)

    // TODO 针对 component 节点要做一些特殊处理？比如拦截事件冒泡？好像没有这么简单，比如组件又想继续使用 inlineTools 什么的应该怎么算？
    if (Type.isComponent) {

    } else if (Type.display === 'block') {
        console.log(Type.display, node.data.type, element)
        blockEventDelegator.attach(element)
    }

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
export function scheduleImmediateUpdate(updateMethod: Function) {
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

function setNativeCursor(element: HTMLElement | ChildNode, offset: number) {
    const range = document.createRange()
    range.setStart(element, offset)

    range.collapse(true)
    globalState.selection!.removeAllRanges()
    globalState.selection!.addRange(range)
}

export function setCursor(inputNode: NodeType, inputOffset: number) {
    let node = inputNode
    let offset = inputOffset
    if ((inputNode.constructor as typeof NodeType).setCursor) {
        if((inputNode.constructor as typeof NodeType).isComponent) {
            // component 自行处理
            (inputNode.constructor as typeof NodeType).setCursor!(inputNode, inputOffset, setNativeCursor)
            return
        }

        const result = (inputNode.constructor as typeof NodeType).setCursor!(inputNode, inputOffset)
        if (result) {
            [node, offset] = result
        } else {
            console.warn('focus failed')
            return
        }
    }

    // TODO 默认就是选择第一个能 focus 的位置
    setNativeCursor(findFirstDescendantElementFromNode(node), offset)
}

export function findElementOrFirstChildFromNode(node?: NodeType) {
    if (!node) return null

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