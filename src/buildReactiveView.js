import {autorun, autorunForEach} from '@ariesate/reactivity'
import {viewToNodeMap} from "./editing";


export const nodeToElement = new WeakMap()



function buildReactiveLinkedList(contentLinkedList) {
    return function attach(dom) {
        let parentEl = document.createDocumentFragment()

        autorunForEach(contentLinkedList, [contentLinkedList.insertAfter, contentLinkedList.removeBetween],
            (node) => {
                const element = buildReactiveView(node)
                nodeToElement.set(node, element)
                const item = contentLinkedList.getItem(node)
                const refElement = nodeToElement.get(item.next?.node)
                if (parentEl===dom){
                    if (!refElement) debugger
                }

                parentEl.insertBefore(element, refElement)
            },
            (removedNode) => {
                const element = nodeToElement.get(removedNode)
                element.remove()
            })

        // 第一次的时候为了节约性能所以用 fragment，后面增量就都直接用 dom 了
        dom.appendChild(parentEl)
        parentEl = dom


//         autorun(function buildChildrenFromList() {
//             const newChildren = contentLinkedList.map(item => {
//                 const element = buildReactiveView(item)
//                 nodeToElement.set(item, element)
//                 if (!firstElement) firstElement = element
//                 return element
//             })
//             dom.replaceChildren(...newChildren)
//         }, ({ on, track }) => {
// // TODO 但问题，patchFn 对于 insert 的对象要主动增加 track，remove 的对象也是要主动 untrack。
// //  CAUTION!!!!!!!!!!!!!!!!!!!!!!!!!!
//             on(contentLinkedList.insertAfter, [contentLinkedList], ([newModel, refModel]) => {
//                 console.log("run patch insertAfter")
//                 // 通过 refModel 找到 对应的 element，执行相应的操作。
//                 const refElement = refModel ? nodeToElement.get(refModel).nextSibling : firstElement
//
//                 // 对应要考虑 insert LinkList 的情况
//                 if (newModel instanceof LinkedList) {
//                     const fragment = document.createDocumentFragment()
//                     let fragmentFirstElement
//
//                     newModel.forEach((node) => {
//                         const element = nodeToElement.get(node) || buildReactiveView(node)
//                         fragment.appendChild(element)
//                         if(!fragmentFirstElement) fragmentFirstElement = element
//                     })
//
//                     dom.insertBefore( fragment, refElement)
//                     if (!refModel) {
//                         firstElement = fragmentFirstElement
//                     }
//                 } else {
//                     const newElement = buildReactiveView(newModel)
//                     nodeToElement.set(newModel, newElement)
//                     if (!refModel) firstElement = newElement
//
//                     dom.insertBefore(newElement, refElement)
//                 }
//
//                 // TODO 由于我们的 effect 并没有 patchFn 的这个概念，每次 run 的时候其实 dep 都清空了。
//                 //  所以这里通过遍历的方式重新收集一次依赖。
//                 track(() => contentLinkedList.forEach(() => {}))
//             })
//
//             // removeBetween 的 patch
//             on(contentLinkedList.removeBetween, [contentLinkedList], ([start, end]) => {
//                 debugger
//                 // TODO 要 untrack 所有 remove 掉的节点的 next 监听啊！！！！不然用户把复用 remove 掉的节点后会发生奇怪的 patch，
//                 console.log("run patch removebetween")
//                 const startElement = start ? nodeToElement.get(start) : dom.children[0]
//                 const endElement = end ? nodeToElement.get(end) : dom.children[dom.children.length -1]
//                 let pointer = startElement.nextElementSibling
//                 // CAUTION 这个一定要提前拿出来，因为在循环过程中我们是要删掉 endElement，当删除的时候 endElement.nextElementSibling 发生了变化。循环错误。
//                 const stopElement = endElement.nextElementSibling
//                 while(pointer && pointer !== stopElement) {
//                     const next = pointer.nextElementSibling
//                     pointer.remove()
//                     pointer = next
//                 }
//             })
//         })


    }
}


function buildReactiveValue(node) {
    return function attach(dom) {
        viewToNodeMap.set(dom, node)
        let textNode
        autorun(() => {
            if (textNode) {
                textNode.nodeValue = node.value.value
            } else {
                textNode = document.createTextNode(node.value.value)
                dom.appendChild(textNode)
            }
        }, ({ on }) => {
            // 自定义组件不一定有这个方法
            if (node.updateValue) {
                on(node.updateValue, [node],  () => {
                    // 这里什么都不做，利用的是 contenteditable 的默认行为
                    console.log('use default behavior', node.value.value)
                })
            }
        })
    }
}

export function createReactiveAttribute(createAttribute) {
    return function attach(dom, attributeName, setAttribute) {
        autorun(() => {
            setAttribute(dom, attributeName, createAttribute())
        })
    }
}


export function buildReactiveView(node) {
    let reactiveContent, reactiveChildren, reactiveValue

    if (node.constructor.hasContent) {
        reactiveContent = buildReactiveLinkedList(node.content)
    }

    if (node.constructor.hasChildren) {
        reactiveChildren = buildReactiveLinkedList(node.children)
    }

    if (node.constructor.isLeaf) {
        reactiveValue = buildReactiveValue(node)
    }

    // TODO 如果 props 也希望被 reactiveView 化呢？
    const element = node.render({content:reactiveContent, children: reactiveChildren, value: reactiveValue, props: node.props})
    if (!element) throw new Error('must return a element')
    viewToNodeMap.set(element, node)
    return element
}

