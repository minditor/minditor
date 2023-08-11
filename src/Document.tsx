import { atom, Atom, computed, LinkedList } from 'rata'
import { Fragment } from "axii"
import {assert, flatten, unwrapChildren} from "./util";
import {DocNode, ViewNode, DocNodeData, DocRange, Text} from "./DocNode";


type CallbackType = (...arg: any[]) => any

export const ANY = Symbol('any')

class Observable {
    public listeners : Map<any, Set<CallbackType> >= new Map()
    listen(eventName: any, callback: CallbackType) {
        let callbacks = this.listeners.get(eventName)
        if (!this.listeners.get(eventName)) this.listeners.set(eventName, (callbacks = new Set()))
        callbacks!.add(callback)

        return () => callbacks!.delete(callback)
    }
    dispatch(eventName: string, ...argv: any[]) {
        this.listeners.get(eventName)?.forEach((callback: CallbackType) => {
            callback(...argv)
        })

        this.listeners.get(ANY)?.forEach((callback: CallbackType) => {
            callback(...argv)
        })
    }
}


export class Document {

}


export class DocumentContent extends Observable{
    public root?: Document
    public firstChild?: DocNode

    constructor(public data: DocNodeData[], public docNodeTypes: {[k: string]: (typeof DocNode|typeof Text)}) {
        super()
        this.firstChild = this.buildChildList(this.data)

    }
    createNode(nodeData: DocNodeData, parent?: DocNode){
        const DocNodeType =  this.docNodeTypes[nodeData.type]
        return new DocNodeType(nodeData, parent)
    }
    buildChildList(data: DocNodeData[], parent?: DocNode) {
        let first: DocNode
        let prev: DocNode
        data.forEach(nodeData => {
            const newNode = this.createNode(nodeData, parent) as DocNode
            // @ts-ignore
            if ((newNode.constructor as typeof DocNode).hasChildren) {
                newNode.firstChild = this.buildChildList(nodeData.children || [], newNode)
            }

            if (!first) first = newNode
            if (prev) {
                newNode.prev(prev)
                prev.next = newNode
            }
            prev = newNode
        })

        return first!
    }
    unwrap(docNode: DocNode) {
        // TODO unwrap 以后，content 合并到前面一个节点的 content 中。这个时候就得好好找一下"前一个"节点了。
        // 顺为选择：
        // 1.
    }
    updateRange(docRange: DocRange, textToInsert: string ){
        const { startText, endText, startOffset,  endOffset, collapsed, commonAncestorNode: ancestorNode } = docRange
        const startNode = startText.parent()
        const endNode = endText.parent()
        if (collapsed) {
            startText.insertText(startOffset, textToInsert)
        } else if(startNode === endNode) {
            assert (!!ancestorNode, 'range not valid')
            startNode.updateRange(docRange, textToInsert)
        } else {
            assert (!!ancestorNode, 'range not valid')
            // 1. 删除 range 之间的所有节点。注意这里 startNode 是 text ，不应该这样处理。
            const startPath = startNode.findPath(ancestorNode!)!
            const endPath = endNode.findPath(ancestorNode!)!

            while(endPath.length && startPath.length) {
                const startPathNode = startPath.pop()!
                const endPathNode = endPath.pop()!

                startPathNode.append(endPathNode)
            }

            if (endPath.length) {
                // 如果还有 endPath，要挂载为 startNode.parent 的兄弟节点。
                const remainedEndNodeRoot = endPath.at(-1)!
                startNode.append(remainedEndNodeRoot)
            }

            // 合并 startNode 和 endNode 里面的 text content，
            // TODO 如果节点内容没有了，按照 contenteditable 的行为规则，节点应该是会被消除掉的。
            startText.value = startText.value.slice(0, startOffset) + textToInsert
            endText.value = endText.value.slice(endOffset)
            const newStart = startText.value ? startText : startText.prev()
            const newEnd = endText.value? endText : endText.next

            if (newStart) {
                newStart.append(newEnd)
            } else {
                // 说明 start 是头。
                startNode.content = newEnd
            }
        }

        // FIXME 改成 decorator
        this.dispatch('updateRange', {args: [docRange, textToInsert]})
    }
    toJSON() {
        return DocNode.map(this.firstChild, (child) => child.toJSON())
    }
}

export type updateRangeResult = {
    node: DocNode,
    viewNode?: ViewNode,
    offset?:number
}



