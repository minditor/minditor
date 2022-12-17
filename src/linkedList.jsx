import {collectionPatchPoint, reactive, isReactive, shallowRef} from '@ariesate/reactivity'

const modelToLinkedReactiveNode = new WeakMap()

// TODO insertBefore 没有处理里面所有节点的 parent 啊


const patchableInsertAfter = collectionPatchPoint(function insertAfter(node, refNode) {
    // refNode 为空表示插在头部
    // 支持 insert LinkedList
    if (refNode && !modelToLinkedReactiveNode.get(refNode)) throw new Error('not my node')
    const afterItem = refNode ? modelToLinkedReactiveNode.get(refNode) : this.head
    const afterItemNext = afterItem.next

    if (node instanceof LinkedList) {
        if (node.moveFlag !== 1) {
            debugger
            throw new Error('can only take move linkedList')
        }
        // 完整链
        if (node.head.next) {

            afterItem.next = node.head.next
            node.head.next.prev = afterItem
            // 有 head 就肯定有 tail
            if (afterItemNext) {
                node.tail.next = afterItemNext
                afterItemNext.prev = node.tail
            }


            if (this.tail?.node === refNode) {
                this.tail = node.tail
            }
        }



        // 标记一下，不能再用了
        node.move(2)
        return {
            added: {
                from: node.head,
                to: node.tail
            }
        }
    } else {
        if (isReactive(node) || isReactive(refNode)) {
            // 有问题
            debugger
            throw new Error('do not pass reactive node as insert ref')
        }
        // 普通节点
        const item = reactive({node: shallowRef(node)})
        modelToLinkedReactiveNode.set(node, item)

        afterItem.next = item
        item.prev = afterItem
        if (afterItemNext) {
            item.next = afterItemNext
            afterItemNext.prev = item
        }


        if (this.tail?.node === refNode) {
            this.tail = item
        }

        return {
            added: {from: item.prev, to: item}
        }
    }
})
// 不包括 start 节点
const patchableRemoveBetween = collectionPatchPoint(function removeBetween(start, end) {
    // debugger
    const startItem = start ? modelToLinkedReactiveNode.get(start) : this.head
    const endItem = modelToLinkedReactiveNode.get(end)
    const removedStart = startItem.next
    startItem.next = endItem?.next
    // 原来后面的要接上
    if (endItem?.next) {
        endItem.next.prev = startItem
    }

    // 一直删到尾
    if (!end || endItem === this.tail) {
        this.tail = startItem
    }

    return {
        removed: {
            from: removedStart,
            to: endItem
        }
    }
})


let uuid = 0
export class LinkedList {
    id = uuid++
    head = reactive({})
    moveFlag = 0
    tail

    insertBefore(node, refNode) {
        // refNode 为空表示插在尾部
        const afterRefNode = refNode ? modelToLinkedReactiveNode.get(refNode).prev.node : this.tail?.node
        return this.insertAfter(node, afterRefNode)
    }
    insertAfter = patchableInsertAfter
    // 注意，remove 的对象不包括 startNode，但是包括 end。这样调用 this.removeBetween(this.head, this.tail) 时是正确的行为。
    removeBetween = patchableRemoveBetween
    remove(refNode) {
        return this.removeBetween(modelToLinkedReactiveNode.get(refNode).prev.node, refNode)
    }

    getItem(node) {
        return modelToLinkedReactiveNode.get(node)
    }

    move(flag = 1) {
        this.moveFlag = flag
        return this
    }

    map(mapFn, ignoreFlag) {
        if (!ignoreFlag && this.moveFlag) {
            console.warn(`moved linkedList can not be map`)
            // throw new Error(`moved linkedList can not be read`)
            return []
        }
        const result = []
        this.forEach((node) => {
            result.push(mapFn(node))
        }, true)

        return result
    }

    forEach(mapFn, ignoreFlag) {
        if (!ignoreFlag && this.moveFlag) {
            console.warn(`moved linkedList can not be read`)
            // throw new Error(`moved linkedList can not be read`)
            return
        }
        let current = this.head.next
        // TODO 不要拿 tail 去做对比，一定要读一下 next，这样最后一个节点 set next 的时候才能发生 trigger.
        while (current) {
            mapFn(current.node)
            current = current.next
        }

    }
    iterator(start = this.head, end = this.tail) {
        // 不包括 from，包括 end
        let current = start.next
        return {
            next() {
                const done = current === end
                // 可能是个空的
                const value = current?.node
                current = current?.next
                return { done, value};
            },
            return() {
                console.log("Closing");
                return { done: true };
            },
        }
    }
    [Symbol.iterator]() {
        return this.iterator()
    }
}