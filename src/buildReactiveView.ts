// @ts-ignore
import {autorun, autorunForEach} from '@ariesate/reactivity'
import {viewToNodeMap} from "./editing";
import { LinkedList } from "./linkedList";
import {NodeType} from "./nodeTypes";


export const nodeToElement = new WeakMap()

function buildReactiveLinkedList(contentLinkedList: LinkedList) {
    return function attach(dom: HTMLElement) {
        let parentEl: DocumentFragment | HTMLElement = document.createDocumentFragment()

        autorunForEach(contentLinkedList, [contentLinkedList.insertAfter, contentLinkedList.removeBetween],
            (node: NodeType) => {
                // 如果一讲有了 element，说明是把别人的 node 移动过来的额，不不用再新建，
                // CAUTION 这要做更严谨的校验，防止共用 node 引用的情况。
                const element = nodeToElement.get(node) || buildReactiveView(node)
                nodeToElement.set(node, element)

                const item = contentLinkedList.getItem(node)
                const refElement = nodeToElement.get(item.next?.node)
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
                    parentEl.insertBefore(element, null)
                }

            },
            (removedNode: NodeType) => {
                const element = nodeToElement.get(removedNode)
                if (!element) debugger
                element.remove()
            },
            scheduleUpdate
        )

        // 第一次的时候为了节约性能所以用 fragment，后面增量就都直接用 dom 了
        dom.appendChild(parentEl)
        parentEl = dom
    }
}


function buildReactiveValue(node: NodeType) {
    return function attach(dom: HTMLElement ) {
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
export function scheduleUpdate(updateMethod: Function) {
    if (!scheduleTask) {
        scheduleTask = Promise.resolve().then(() => {
            updateQueue()
            scheduleTask = undefined
        })
    }
    tokensToUpdate.add(updateMethod)
}
export function waitUpdate() {
    return scheduleTask
}
