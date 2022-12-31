// @ts-ignore
import {collectionPatchPoint, reactive, isReactive, shallowRef} from '@ariesate/reactivity'

const modelToLinkedReactiveNode = new WeakMap()

// TODO insertBefore 没有处理里面所有节点的 parent 啊

type CollectionMutateResult = {
    added?: {
        from: Object,
        to: Object
    },
    removed?: {
        from: Object,
        to: Object
    }
}



type LinkedListNode = {
    container?: LinkedList
}

const patchableInsertAfter = collectionPatchPoint(function insertAfter(this: LinkedList, node: LinkedListNode | LinkedList | LinkedListFragment, refNode?: any) {
    // refNode 为空表示插在头部
    // 支持 insert LinkedList
    if (node instanceof LinkedList && !node.tail) return {}

    if (refNode && !modelToLinkedReactiveNode.get(refNode)) throw new Error('not my node')
    const afterItem = refNode ? modelToLinkedReactiveNode.get(refNode) : this.head
    const afterItemNext = afterItem.next

    if (isReactive(refNode)) {
        // 有问题
        debugger
        throw new Error('do not pass reactive node as insert ref')
    }


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
                node.tail!.next = afterItemNext
                afterItemNext.prev = node.tail
            }


            if (this.tail?.node === refNode) {
                this.tail = node.tail
            }
        }

        LinkedList.iterate(node.head!, node.tail!, (itemNode: LinkedListNode) => itemNode.container = this)
        // 标记一下，不能再用了
        node.move(2)
        return {
            added: {
                from: node.head,
                to: node.tail
            }
        }
    } else if(node instanceof LinkedListFragment) {
        const { from, to } = node
        if (from.prev) throw new Error('sub LinkedList is not clean')
        if (to.next) throw new Error('sub LinkedList is not clean')
        // TODO 还要检查结尾是不是干净的，这里怎么搞？
        // 传进来的是子链
        afterItem.next = from
        from.prev = afterItem

        if (afterItemNext) {
            to.next = afterItemNext
            afterItemNext.prev = to
        } else {
            // 说明 afterItem 就是最后一个
            this.tail = to
        }

        LinkedList.iterate(from.prev!, to!, (itemNode: LinkedListNode) => itemNode.container = this)

        return {
            added: { from: from.prev, to}
        }

    } else {

        // 普通节点
        const item = reactive({node: shallowRef(node)})
        modelToLinkedReactiveNode.set(node, item)

        afterItem.next = item
        item.prev = afterItem
        if (afterItemNext) {
            item.next = afterItemNext
            afterItemNext.prev = item
        } else {
            this.tail = item
        }

        node.container = this

        return {
            added: {from: item.prev, to: item}
        }
    }
})
// 不包括 start 节点，包括 end 节点。
const patchableRemoveBetween: (start?: any, end?:any)  => CollectionMutateResult = collectionPatchPoint(function removeBetween(this: LinkedList, start?: any, end?:any) {
    // debugger
    const startItem = start ? modelToLinkedReactiveNode.get(start) : this.head
    const endItem = end ? modelToLinkedReactiveNode.get(end) : this.tail
    const removedStart = startItem.next

    // 原来后面的要接上
    startItem.next = endItem?.next
    if (endItem?.next) {
        endItem.next.prev = startItem
    }

    // 清理一下
    if (removedStart) removedStart.prev = undefined
    if (endItem) endItem.next = undefined

    // 一直删到尾
    if (!end || endItem === this.tail) {
        this.tail = startItem === this.head ? undefined : startItem
    }

    return {
        removed: {
            from: removedStart,
            to: endItem
        }
    }
})


type LinkedListItem = {
    next?: LinkedListItem
    prev?: LinkedListItem
    node?: any
}

export class LinkedListFragment {
    from
    to
    constructor({ from, to }: {from :LinkedListItem, to: LinkedListItem}) {
        this.from = from
        this.to = to
    }
}


let uuid = 0
export class LinkedList {
    id = uuid++
    head = reactive({})
    moveFlag = 0
    tail?: LinkedListItem
    owner?: any
    constructor(owner: any) {
        this.owner = owner
    }

    insertBefore(node: any | LinkedList, refNode?: any) {
        // refNode 为空表示插在尾部
        const afterRefNode = refNode ? modelToLinkedReactiveNode.get(refNode).prev.node : this.tail?.node
        return this.insertAfter(node, afterRefNode)
    }
    insertAfter = patchableInsertAfter
    // 注意，remove 的对象不包括 startNode，但是包括 end。这样调用 this.removeBetween(this.head, this.tail) 时是正确的行为。
    removeBetween = patchableRemoveBetween
    remove(refNode: any) {
        return this.removeBetween(modelToLinkedReactiveNode.get(refNode).prev.node, refNode)
    }

    getItem(node?: any) {
        return node && modelToLinkedReactiveNode.get(node)
    }

    at(index: number) {
        if (index > -1) {
            let start = index
            let pointer = this.head
            while(pointer && (start > -1)) {
                pointer = pointer.next
                start--
            }
            return pointer?.node
        } else {
            let start = index
            let pointer = this.tail
            while(pointer && pointer !== this.head && (start < -1)) {
                pointer = pointer.prev
                start++
            }
            return pointer?.node
        }
    }

    size() {
        let pointer = this.head.next
        let result = 0
        while(pointer) {
            result++
            pointer = pointer.next
        }
        return result
    }

    move(flag = 1) {
        this.moveFlag = flag
        return this
    }

    map(mapFn: Function, ignoreFlag?: boolean) {
        if (!ignoreFlag && this.moveFlag) {
            console.warn(`moved linkedList can not be map`)
            // throw new Error(`moved linkedList can not be read`)
            return []
        }
        const result: any[] = []
        this.forEach((node: any) => {
            result.push(mapFn(node))
        }, true)

        return result
    }

    forEach(mapFn: Function, ignoreFlag?: boolean) {
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
        const that = this
        return {
            next() {
                // 如果不是个空链表但是，current 却为空了，说明 end 要么是在 start 前面，要么不属于本 list
                if (!current && that.tail) debugger
                if (!current && that.tail) throw new Error('iterate end node invalid')

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
    iterate(from = this.head, to = this.tail, handle: Function) {
        const iterator = this.iterator(from, to)
        let iterateDone = false
        while(!iterateDone) {
            let { value: item, done} = iterator.next()
            if (item !== undefined) {
                handle(item)
            }
            iterateDone = done
        }
    }
    static iterate(from: LinkedListItem, to: LinkedListItem, handle: Function) {
        let current = from.next
        while(current) {
            handle(current.node)
            current = current === to ? undefined : current.next
        }
    }
    [Symbol.iterator]() {
        return this.iterator()
    }
}