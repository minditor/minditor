import { atom, Atom, computed, LinkedList } from 'rata'
import { Fragment } from "axii"
import {assert, deepFlatten, unwrapChildren} from "./util";
import {DocNode, ViewNode, DocNodeData, DocRange, Text, Paragraph} from "./DocNode";


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
    insertContentNodeAfter(newText: Text, refText:Text) {
        refText.append(newText)
        this.dispatch('insertContentNodeAfter', {args: [newText, refText]})
    }
    // insertBlockNodeAfter(newDocNode: DocNode, refDocNode: DocNode) {
    //     refDocNode.append(newDocNode)
    //     this.dispatch('insertContentAfter', {args: [newText, refText]})
    // }
    unwrap(docNode: DocNode) {
        assert(DocNode.typeHasChildren(docNode), 'doc node type do not have children, cannot unwrap')
        const previousSiblingInTree = docNode.previousSiblingInTree
        const originDocNodePrev = docNode.prev()

        const ParagraphType = DocNode.ParagraphType!
        const newPara = new ParagraphType({type: 'Paragraph'}, docNode.parent())
        newPara.replaceContent(docNode.content!)
        // newPara 要变成上一个节点的兄弟节点，如果有 previousSiblingInTree 说明不是全篇第一个节点。
        if (previousSiblingInTree) {
            // 1. 把原本的 content 处理成 Paragraph，变成 previousSibling 的 next
            previousSiblingInTree.append(newPara)

            // 2. 开始处理自己的 child，如果是 para，就也要往前合并
            docNode.remove()
            if (originDocNodePrev) {
                // 原来前面还有节点，那么自己内容被合并到前面节点的里面去。
                let childLeft: DocNode|undefined
                DocNode.forEach(docNode.firstChild, (childDocNode) => {
                    if (childDocNode instanceof ParagraphType) {
                        // CAUTION 注意这里一定要 remove。不然 append 是会把后面的链一起处理
                        newPara.lastSibling.append(childDocNode.remove())
                    } else {
                        // 记录一下剩下没处理的
                        if (!childLeft) childLeft = childDocNode
                    }
                })

                if(childLeft) {
                    const acceptableSibling = newPara.lastSibling.findParentByLevel(childLeft.level() - newPara.level())
                    acceptableSibling.append(childLeft)
                }


            } else {
                // 原来就是某个几点下的第一节点
                newPara.replaceNext(docNode.firstChild)
            }

        } else {
            // 自己就是根节点下第一个节点
            newPara.replaceNext(docNode.firstChild)
            docNode.next && newPara.lastSibling.append(docNode.next)
            this.firstChild = newPara
        }


        this.dispatch('unwrap', {args: [docNode], result: newPara})
        return newPara
    }
    updateRange(docRange: DocRange, textToInsert: string ){

        const { startText, endText, startOffset, startNode, endNode, endOffset, collapsed, commonAncestorNode: ancestorNode } = docRange
        if (collapsed) {
            startText.insertText(startOffset, textToInsert)
        } else if(startNode === endNode) {
            assert (!!ancestorNode, 'range not valid')
            startNode.updateRange(docRange, textToInsert)
        } else {
            assert (!!ancestorNode, 'range not valid')
            // 1. 清空 startNode 的 children
            if(DocNode.typeHasChildren(startNode)) {
                startNode.replaceFirstChild(undefined)
            }

            // 2. 删除 range 之间的所有节点。
            const startPath = startNode.findPath(ancestorNode!)!
            const endPath = endNode.findPath(ancestorNode!)!

            while(endPath.length && startPath.length) {
                const startPathNode = startPath.pop()!
                const endPathNode = endPath.pop()!

                startPathNode.replaceNext(endPathNode)
            }

            // 3. 如果还有 endPath，要挂载为 startNode.parent 的兄弟节点。
            if (endPath.length) {
                const remainedEndNodeRoot = endPath.at(-1)!
                startNode.replaceNext(remainedEndNodeRoot)
            }

            // 4. 合并 startNode 和 endNode 里面的 text content，组成新的 startNode 的 content
            // TODO 如果节点内容没有了，按照 contenteditable 的行为规则，节点应该是会被消除掉的。
            startText.value = startText.value.slice(0, startOffset) + textToInsert
            endText.value = endText.value.slice(endOffset)
            const newStart = startText.value ? startText : startText.prev()
            const newEnd = endText.value? endText : endText.next

            if (newStart) {
                newStart.replaceNext(newEnd)
            } else {
                // 说明 start 是头。
                startNode.replaceContent(newEnd)
            }

        }

        // FIXME 改成 decorator
        this.dispatch('updateRange', {args: [docRange, textToInsert]})
    }
    mergeByPreviousSiblingInTree(docNode: DocNode) {
        const previousSiblingInTree = docNode.previousSiblingInTree
        if (previousSiblingInTree) {
            assert(!DocNode.typeHasChildren(docNode), 'cannot merge type with children, unwrap it first.')
            docNode.remove()
            previousSiblingInTree.content?.lastSibling.replaceNext(docNode.content)
            docNode.replaceFirstChild(undefined)
        }

        this.dispatch('mergeByPreviousSiblingInTree', { args: [docNode], result: previousSiblingInTree })
        return previousSiblingInTree
    }
    prependDefaultPreviousSibling(docNode: DocNode) {
        const prependPreviousSibling = (docNode.constructor as typeof DocNode).prependDefaultPreviousSibling ?? DocNode.prependDefaultPreviousSibling
        const newDocNode = prependPreviousSibling(docNode)
        if(this.firstChild === docNode) {
            this.firstChild = newDocNode
        }
        this.dispatch('prependDefaultPreviousSibling', { args: [docNode], result: newDocNode })
        return newDocNode
    }
    appendDefaultNextSibling(docNode: DocNode, content?: Text) {
        const appendNextSibling = (docNode.constructor as typeof DocNode).appendDefaultNextSibling ?? DocNode.appendDefaultNextSibling
        const result= appendNextSibling(docNode, content)
        this.dispatch('appendDefaultNextSibling', { args: [docNode, content], result })
        return result
    }
    spliceContent(docNode: DocNode, startText: Text, startOffset: number, endText?: Text, endOffset?: number) {
        assert(startText !== endText, 'startText equal to endText, update value instead of use this method')

        const removedStartText = new Text({ type: 'Text', value: startText.value.slice(startOffset) })
        const removedEndText = endText ? new Text({ type:'Text', value: endText.value.slice(0, endOffset!)}) : null

        // 1. 先把中间的链移出去，构造 remove 链
        startText.next && removedStartText.append(startText.next)
        if (endText) {
            // CAUTION 这里的endText 本来在 removedStartText 里面了， append 会把 endText 再抢夺回来
            startText.append(endText)
        }
        if (removedEndText) removedStartText.lastSibling.append(removedEndText)

        // 2. 更新原本的 value
        startText.value = startText.value.slice(0, startOffset)
        if (endText) endText.value = endText.value.slice(endOffset!)

        this.dispatch('spliceContent', { args: [docNode, startText, startOffset, endText, endOffset], result: removedStartText })
        return removedStartText
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



