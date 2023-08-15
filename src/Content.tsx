import { atom, Atom, computed, LinkedList } from 'rata'
import { Fragment } from "axii"
import {assert, deepFlatten, unwrapChildren} from "./util";
import {DocNode, ViewNode, DocNodeData, DocRange, Text, Paragraph} from "./DocNode";
import {Document} from "./Document";
import {Doc} from "./editing";


type CallbackType = (...arg: any[]) => any

export const ANY = Symbol('any')




export class Content {

}


export class DocumentContent extends DocNode{
    public root?: Content
    public firstChild?: DocNode
    constructor(public data: DocNodeData, public docNodeTypes: {[k: string]: (typeof DocNode|typeof Text)}) {
        super(data, undefined, true)
        this.isRoot = true
        this.firstChild = this.buildChildList(this.data.children!)
    }

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


    createNode(nodeData: DocNodeData, parent: DocNode){
        const DocNodeType =  this.docNodeTypes[nodeData.type]
        return new DocNodeType(nodeData, parent)
    }
    buildChildList(data: DocNodeData[], parent: DocNode = this) {
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
    insertContentAfter(newText: Text, refText:Text) {
        refText.append(newText)
        this.dispatch('insertContentAfter', {args: [newText, refText]})
    }
    insertContentBefore(newText: Text, refText:Text) {
        refText.prepend(newText)
        this.dispatch('insertContentBefore', {args: [newText, refText]})
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
            const docNodeChildLevel = docNode.level() + 1 // CAUTION 一定要记住，不然后面就不对了
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
                    const acceptableSibling = newPara.lastSibling.findParentByLevel(docNodeChildLevel - newPara.level())
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
            this.replaceFirstChild(newPara)
        }


        this.dispatch('unwrap', {args: [docNode], result: newPara})
        return newPara
    }
    updateRange(docRange: DocRange, textToInsert: string ){
        let newStartText: Text

        const { startText, endText, startOffset, startNode, endNode, endOffset, collapsed, commonAncestorNode: ancestorNode } = docRange
        if (collapsed) {
            startText.insertText(startOffset, textToInsert)
            newStartText = startText
        } else if(startNode === endNode) {
            // FIXME 顶层的节点删除时，没有 ancestorNode ???
            assert (!!ancestorNode, 'range not valid')
            newStartText = startNode.updateRange(docRange, textToInsert)
        } else {
            assert (!!ancestorNode, 'range not valid')
            // 1. 清空 startNode 的 children
            if(DocNode.typeHasChildren(startNode)) {
                startNode.replaceFirstChild(undefined)
            }

            // 2. 删除 range 之间的所有节点。注意 path 里面是包括 startNode 自己的
            const startPath = startNode.findPath(ancestorNode!)!
            const endPath = endNode.findPath(ancestorNode!)!

            while(endPath.length && startPath.length) {
                const startPathNode = startPath.pop()!
                const endPathNode = endPath.pop()!

                startPathNode.replaceNext(endPathNode.next)
            }

            // 3. 如果还有 endPath，说明 endPath 的深度比较深。剩下的节点全部要挂载为 startNode.parent 的兄弟节点。
            if (endPath.length) {
                const remainedEndNodeRoot = endPath.at(-1)!
                startNode.replaceNext(remainedEndNodeRoot)
            } else {
                // 没有 endPath，还要看看 endNode 有没有 children 要处理。
                if (DocNode.typeHasChildren(endNode)) {
                    const mountNode = startPath.at(-1) ?? startNode
                    // CAUTION 注意这里是 append。因为前面处理所有 endPath 上剩余的兄弟节点。到这里里的时候，如果
                    //  endNode 还有 children， children 的渲染是排着 endNode 兄弟节点前面的（因为先序遍历）。所以要用 append。
                    //  用 replaceNext 会使得之前的兄弟节点又丢失了。
                    endNode.firstChild && mountNode.append(endNode.firstChild)
                }
            }

            // 4. 合并 startNode 和 endNode 里面的 text content，组成新的 startNode 的 content
            // TODO 如果节点内容没有了，按照 contenteditable 的行为规则，节点应该是会被消除掉的。
            startText.value = startText.value.slice(0, startOffset) + textToInsert
            endText.value = endText.value.slice(endOffset)
            newStartText = startText.value ? startText : startText.prev()
            const newEnd = endText.value? endText : endText.next

            if (newStartText) {
                newStartText.replaceNext(newEnd)
            } else {
                // 说明 start 是头。如果没有 newEnd，说明 end 也被删完了。replaceContent 里面会判断，始终保留一个空 Text
                startNode.replaceContent(newEnd)
                // 这收要重置 newStartText,保证外部 setCursor 能找到正确的位置
                newStartText = startNode.content!
            }
        }

        // FIXME 改成 decorator
        this.dispatch('updateRange', {args: [docRange, textToInsert]})
        return newStartText!
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
        const createPreviousSibling = (docNode.constructor as typeof DocNode).createDefaultPreviousSibling ?? DocNode.createDefaultPreviousSibling
        const newDocNode = createPreviousSibling(docNode)
        return this.prependPreviousSibling(docNode, newDocNode)
    }
    prependPreviousSibling(docNode: DocNode, newDocNode: DocNode) {
        if (docNode.previousSiblingInTree) {
            docNode.previousSiblingInTree?.append(newDocNode)
        } else {
            docNode.prepend(newDocNode)
        }

        this.dispatch('prependPreviousSibling', { args: [docNode], result: newDocNode })
        return newDocNode
    }
    appendDefaultNextSibling(docNode: DocNode, content?: Text) {
        const appendNextSibling = (docNode.constructor as typeof DocNode).createDefaultNextSibling ?? DocNode.createDefaultNextSibling
        const newDocNode = appendNextSibling(docNode, content)
        return this.appendNextSibling(docNode, newDocNode, (docNode.constructor as typeof DocNode).appendDefaultAsChildren)
    }
    appendNextSibling(docNode: DocNode, newDocNode: DocNode, asChildren: boolean = false) {
        if (asChildren) {
            if (docNode.firstChild) {
                docNode.firstChild.prepend(newDocNode)
            } else {
                docNode.replaceFirstChild(newDocNode)
            }
        } else {
            docNode.append(newDocNode)
        }

        this.dispatch('appendNextSibling', { args: [docNode], result: newDocNode })
        return newDocNode
    }
    removeDocNode(docNode: DocNode) {
        if (docNode.prev()) {
            docNode.prev().replaceNext(docNode.next)
        } else {
            // 自己是第一个
            docNode.parent().replaceFirstChild(docNode.next)
        }
        this.dispatch('removeDocNode', { args: [docNode] })
    }
    replaceDocNode(newDocNode: DocNode, refDocNode: DocNode) {
        refDocNode.replaceWith(newDocNode)
        this.dispatch('replaceDocNode', { args: [newDocNode, refDocNode]})
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
    updateText(text: Text, newValue: string) {
        text.value = newValue
        this.dispatch('updateText', {args:[text, newValue]})
    }
    splitText(text: Text, offset: number, splitToStart?: boolean) {
        if (offset === 0 || offset === text.value.length) return

        const newText = text.clone()
        if (splitToStart) {
            newText.value = newText.value.slice(0, offset)
            this.updateText(text, text.value.slice(offset))
            this.insertContentBefore(newText, text)
        } else {
            newText.value = newText.value.slice(offset)
            this.updateText(text, text.value.slice(0, offset))
            this.insertContentAfter(newText, text)
        }

        this.dispatch('splitText', {args:[text, offset, splitToStart]})
    }
    formatRange(range: DocRange, formatData: FormatData) {

        const { endNode, startNode, startText, endText, startOffset, endOffset } = range
        const updateFormat = (text: Text) => text.props.formats = Object.assign(text.props.formats || {}, formatData)

        // 先要 split text
        this.splitText(startText, startOffset, true)
        this.splitText(endText, endOffset)

        if (startNode === endNode) {
            DocNode.forEachInRange(startText, endText, updateFormat)
        } else {
            // 1. 先单独处理 startNode 和 endNode，再处理中间
            DocNode.forEach(startText, updateFormat)
            DocNode.forEachInRange(endNode.content!, endText, updateFormat)

            // 2. 处理中间
            let current = endNode.previousSiblingInTree

            while(current !== startNode) {
                DocNode.forEach(current.content, updateFormat)
                current = current.previousSiblingInTree
            }
        }

    }
    toArrayJSON() {
        return DocNode.map(this.firstChild, (child) => child.toJSON())
    }
}

export type FormatData = {
    [k:string]: any
}

export type updateRangeResult = {
    node: DocNode,
    viewNode?: ViewNode,
    offset?:number
}



