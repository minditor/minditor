import {LinkedList, computed, TrackOpTypes, TriggerOpTypes } from "rata";
import { createHost, onEnterKey, onBackspaceKey, eventAlias, onTabKey, createElement, Fragment } from 'axii'
import {Component, InjectHandles, Props} from "../global";
import {DocumentContent} from "./Document";
import {DocNodeData, DocNode, DocRange, Text, ViewNode, RenderProps} from "./DocNode";
import {state as globalKM} from "./globals";
import {setCursor, waitUpdate} from "./buildReactiveView";
import {Doc, updateRange, viewToNodeMap} from "./editing";
import {ExtendedDocumentFragment} from "./DOM";
import {assert, unwrapChildren} from "./util";


type ComponentMap = {
    [k: string]: Component
}


export class DocumentContentView{
    public element?: HTMLElement
    public elementToTextNode = new WeakMap<Node, Text>()
    public hostContext = { skipIndicator: {skip: false} }
    public docNodeToFirstDOMNode = new WeakMap<DocNode, HTMLElement>()
    public docNodeToLastDOMNode = new WeakMap<DocNode, HTMLElement>()
    public blockUnitList?: LinkedList<HTMLElement>
    constructor(public doc: DocumentContent) {
        globalKM.onSelectionChange(this.onSelectionChange)
        this.doc.listen('updateRange', this.patchUpdateRange)
        this.doc.listen('upwrap', this.patchUnwrap)
    }
    onSelectionChange = () => {
        console.log(globalKM.selectionRange!)
    }
    inDefaultBehaviorTask: Event|undefined
    tryUseDefaultBehavior(event: Event) {
        this.inDefaultBehaviorTask = event
    }
    resetUseDefaultBehavior() {
        this.inDefaultBehaviorTask = undefined
    }
    findTextNodeFromElement(element: HTMLElement|Node) {
        let pointer: HTMLElement | Node | null = element
        while(pointer && pointer !== this.element && pointer !== document.body) {
            const item = this.elementToTextNode.get(pointer)
            if (item) {
                return item
            } else {
                pointer = pointer.parentElement
            }
        }
    }
    createDocRange = (range: Range) : DocRange => {
        return new DocRange(
            this.findTextNodeFromElement(range.startContainer)!,
            range.startOffset,
            this.findTextNodeFromElement(range.endContainer)!,
            range.endOffset,
        )
    }
    isDefaultRangeCollapseAcceptable({startText, endText}: DocRange) {
        // 理论上 startNode 和 endNode 是在 paragraph/title 里面应该都可以？？？
        if (startText.parent() === endText.parent()) return true

        // TODO 还有些跨节点的，但是标签相同的场景应该也是可以。
        return false
    }
    patchUpdateRange = ({ args: [docRange, key] } : { args: [docRange: DocRange, key: string]}) => {
        let useDefaultBehavior = this.isDefaultRangeCollapseAcceptable(docRange) && this.inDefaultBehaviorTask

        if (!useDefaultBehavior) {
            console.warn('use default behavior failed')
            this.inDefaultBehaviorTask?.stopPropagation()
            this.inDefaultBehaviorTask?.preventDefault()

            // TODO 1. 手动更新内容

            // 2. 手动更新 blockUnitList
            if (docRange.startText.parent() !== docRange.endText.parent()) return

            const startDOMNode = this.docNodeToLastDOMNode.get(docRange.startText.parent()!)!
            const endDOMNode = this.docNodeToFirstDOMNode.get(docRange.endText.parent())!

            // 从 start 的后面一个开始删除，一直删掉 endNode。endNode 的内容会被合并 startNode 里面。
            let current:(null|Element) = startDOMNode.nextElementSibling
            while(current) {
                current.remove()
                current = current === endDOMNode ? null : current.nextElementSibling
            }
        } else {
            console.log('use default behavior')
        }

        return { success: useDefaultBehavior }
    }
    patchUnwrap({ args: [docNode]} : {args: [docNode: DocNode]}) {
        // 结构破坏肯定不能用 default behavior
        this.inDefaultBehaviorTask?.stopPropagation()
        this.inDefaultBehaviorTask?.preventDefault()
        // TODO 重新 render
    }

    inputCharacter = (e: KeyboardEvent) => {
        this.tryUseDefaultBehavior(e)
        this.doc.updateRange(this.createDocRange(globalKM.selectionRange!)!, e.key)
        this.resetUseDefaultBehavior()
    }
    changeLine(e: Event) {
        // e.preventDefault()
        // e.stopPropagation()
        // const splitPointNode = this.doc.splitTextAsBlock(globalKM.selectionRange!)
        // // restore cursor
        // setCursor(splitPointNode, 0)
    }
    deleteContent = (e: Event) => {
        this.tryUseDefaultBehavior(e)
        if (globalKM.selectionRange!.collapsed) {
            // 删除单个字符，或者进行结构变化
            const docRange = this.createDocRange(globalKM.selectionRange!)
            const {startOffset, startText} = docRange
            if (startOffset === 0 && startText.isFirstContent()) {
                // 1. TODO 如果自己身的结构可以破坏，不影响其他节点。那么就只破坏自身，例如 Section 的 title、list 等
                this.doc.unwrap(startText.parent())
                // 2. TODO 如果自身的结构不能破坏。那就就是和前一个节点的内容合并了。这是 Para 合到 section title 或者 listItem 里面。

            } else {
                // 删除单个字符
                if(startOffset === 0) {
                    const prevText = startText.prev()
                    // 如果是 0 的位置，相当于选中上一个节点的最后一个字符进行删除。
                    this.doc.updateRange(new DocRange(prevText, prevText.value.length-1, prevText, prevText.value.length), '')
                } else {
                    this.doc.updateRange(docRange.derive({ startOffset: startOffset - 1}), '')
                }
            }
        } else {
            this.doc.updateRange(this.createDocRange(globalKM.selectionRange!)!, '')
        }
        this.resetUseDefaultBehavior()
    }
    changeLevel() {

    }
    buildInitialBlockUnitList() {
        const domNodes = DocNode.map(this.doc.firstChild, node => this.renderDocNodeToDOMNode(node))
        this.blockUnitList = new LinkedList(domNodes)
    }
    renderDocNodeToDOMNode(docNode: DocNode) : HTMLElement|DocumentFragment{
        const renderProps: RenderProps = {}

        if ((docNode.constructor as typeof DocNode).hasChildren) {
            renderProps.children = DocNode.map(docNode.firstChild, (childDocNode) => this.renderDocNodeToDOMNode(childDocNode))
        }

        if ((docNode.constructor as typeof DocNode).hasContent) {
            // CAUTION 为了性能决定不用 LinkedList，靠监听 Document 的变化来手动维护 blockUnit。
            renderProps.content = DocNode.map(docNode.content, (textNode: DocNode) => {
                const textDOMNode = textNode.render({}, {createElement, Fragment})
                this.elementToTextNode.set(textDOMNode, textNode as Text)
                return textDOMNode
            })
        }

        return docNode.render(renderProps, {createElement, Fragment})
    }
    renderBlockUnitList(list: LinkedList<HTMLElement>, container: HTMLElement) {
        // computed((trackOnce) => {
        //     trackOnce!(list!, TrackOpTypes.METHOD, TriggerOpTypes.METHOD);
        //     for(let leaf of list) {
        //         const placeholder = new Comment('placeholder')
        //         container.appendChild(placeholder)
        //         const host= createHost(leaf.item, placeholder, this.hostContext)
        //         host.render()
        //     }
        // }, (result, triggerInfos) => {
        //     triggerInfos.forEach(({method, argv, result}) => {
        //         if (method === 'insertBefore'){
        //             // TODO 找到新增节点的 refNode， 并插入
        //         }else if(method === 'removeBetween'){
        //             // TODO 找到要删除的节点并且判断是不是 useDefaultBehavior
        //         }
        //     })
        // })
        // CAUTION 为了性能，暂时决定不 reactive 化，因为操作 blockUnit 本来就是 dom 了，操作这个链表和操作 dom 是一样的。
        for(let leaf of list) {
            const placeholder = new Comment('placeholder')
            container.appendChild(placeholder)
            const host= createHost(leaf.item, placeholder, this.hostContext)
            host.render()
        }
    }
    render() {
        this.buildInitialBlockUnitList()
        this.element = (
            <div contenteditable
                onKeydown={[
                    onNotComposition(onSingleKey(this.inputCharacter)),
                    onNotComposition(onEnterKey(this.changeLine)),
                    onNotComposition(onBackspaceKey(this.deleteContent)),
                    onNotComposition(onTabKey(this.changeLevel))
                ]}
            >
            </div>
        ) as unknown as HTMLElement
        this.renderBlockUnitList(this.blockUnitList!, this.element)

        return this.element
    }
}


const onNotComposition = eventAlias((e: KeyboardEvent) => !(e.isComposing || e.keyCode === 229))
const onSingleKey = eventAlias((e: KeyboardEvent) => e.key.length === 1)
