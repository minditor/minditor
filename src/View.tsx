import {LinkedList, computed, TrackOpTypes, TriggerOpTypes } from "rata";
import { createHost, onEnterKey, onBackspaceKey, eventAlias, onTabKey, createElement, Fragment, Host, withCurrentRange } from 'axii'
import {Component, InjectHandles, Props} from "../global";
import {Document, DocumentContent} from "./Document";
import {DocNodeData, DocNode, DocRange, Text, ViewNode, RenderProps} from "./DocNode";
import {state as globalKM} from "./globals";
import {setCursor, waitUpdate} from "./buildReactiveView";
import {Doc, updateRange, viewToNodeMap} from "./editing";
import {ExtendedDocumentFragment} from "./DOM";
import {assert, deepFlatten, nextJob, nextTask, removeNodesBetween, unwrapChildren} from "./util";


type ComponentMap = {
    [k: string]: Component
}


export class DocumentContentView{
    public element?: HTMLElement
    public elementToTextNode = new WeakMap<HTMLElement, Text>()
    public textNodeToElement = new WeakMap<Text, HTMLElement>()
    public hostContext = { skipIndicator: {skip: false} }
    public docNodeToBlockUnit = new WeakMap<DocNode, HTMLElement>()
    public blockUnitToHost: WeakMap<HTMLElement, Host> = new WeakMap()
    constructor(public doc: DocumentContent) {
        globalKM.onSelectionChange(this.onSelectionChange)
        this.doc.listen('updateRange', this.patchUpdateRange)
        this.doc.listen('unwrap', this.patchUnwrap)
        this.doc.listen('insertContentNodeAfter', this.patchInsertContentNodeAfter)
        this.doc.listen('mergeByPreviousSiblingInTree', this.patchMergeByPreviousSiblingInTree)
        this.doc.listen('spliceContent', this.patchSpliceContent)
        // TODO 要不要直接就改成 prepend/append ?
        this.doc.listen('prependDefaultPreviousSibling', this.patchPrependDefaultPreviousSibling)
        this.doc.listen('appendDefaultNextSibling', this.patchAppendDefaultNextSibling)
    }
    onSelectionChange = () => {
        console.log(globalKM.selectionRange!)
    }
    defaultBehaviorEvent: Event|undefined
    tryUseDefaultBehavior(event: Event|undefined) {
        this.defaultBehaviorEvent = event
    }
    resetUseDefaultBehavior() {
        this.defaultBehaviorEvent = undefined
    }
    findTextNodeFromElement(element: Node) {
        let pointer: HTMLElement | Node | null = element
        while(pointer && pointer !== this.element && pointer !== document.body) {
            const item = this.elementToTextNode.get(pointer as HTMLElement)
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
    isDefaultRangeCollapseAcceptable({startNode, endNode}: DocRange) {
        // 理论上 startNode 和 endNode 是在 paragraph/title 里面应该都可以？？？
        if (startNode === endNode) return true

        // TODO 还有些跨节点的，但是标签相同的场景应该也是可以。
        return false
    }
    patchUpdateRange = ({ args: [docRange, key] } : { args: [docRange: DocRange, key: string]}) => {
        let useDefaultBehavior = this.defaultBehaviorEvent && this.isDefaultRangeCollapseAcceptable(docRange)
        // CAUTION 这里尽量尝试使用 defaultBehavior 是为了在打的段落合并的时候能使用 defaultBehavior。
        //  但不管能不能用，blockUnit 的 host 都要 destroy。
        console.warn(`use default behavior : ${useDefaultBehavior}`)

        if (!useDefaultBehavior) {
            this.defaultBehaviorEvent?.stopPropagation()
            this.defaultBehaviorEvent?.preventDefault()
        }

        const startBlockUnit = this.docNodeToBlockUnit.get(docRange.startNode!)!
        const endBlockUnit = this.docNodeToBlockUnit.get(docRange.endNode)!


        // CAUTION 从 end 开始一直删到 start, 但不包括，因为后面处理还要用。
        let current: Element|null
        current = endBlockUnit

        while(current && current !== startBlockUnit) {
            // CAUTION 如果有默认行为，我们这里的 destroy 的参数能阻止 dom 操作，只是解除 computed，让之后 defaultBehavior 生效。
            // CAUTION 这里一定要提前记录一下，不然 destroy 执行了，自己被移除了，previousElementSibling 就不对了。
            const previousElementSibling = current.previousElementSibling as Element
            this.blockUnitToHost.get(current as HTMLElement)!.destroy(useDefaultBehavior)
            current = previousElementSibling
        }

        // block 内更新，默认行为
        if (!useDefaultBehavior) {
            // 重新生成 start 节点，插到原来的节点前面。
            const newStartBlockUnit = this.createBlockUnitFragment(docRange.startNode) as DocumentFragment
            this.element!.insertBefore(newStartBlockUnit, startBlockUnit)
            // 销毁头部节点
            this.blockUnitToHost.get(startBlockUnit)!.destroy()
        }
    }
    patchUnwrap = ({ result: newPara, args: [docNode]} : {result: DocNode, args: [docNode: DocNode]}) => {
        // 结构破坏肯定不能用 default behavior
        this.defaultBehaviorEvent?.stopPropagation()
        this.defaultBehaviorEvent?.preventDefault()

        const newBlockUnitFrag = this.createBlockUnitFragment(newPara) as DocumentFragment
        const oldBlockUnit = this.docNodeToBlockUnit.get(docNode)!
        const oldHost = this.blockUnitToHost.get(oldBlockUnit!)!

        oldBlockUnit.parentElement?.insertBefore(newBlockUnitFrag, oldBlockUnit)
        oldHost.destroy()
        // TODO 处理 cursor
    }
    patchInsertContentNodeAfter = ({ args: [newText, refText]} : {args: [Text, Text]}) => {
        const refTextDOMNode = this.textNodeToElement.get(refText)!
        insertAfter(this.createTextDOMNode(newText), refTextDOMNode)
    }
    patchMergeByPreviousSiblingInTree = ({args: [docNode], result: previousSiblingInTree}: {args: [DocNode], result: DocNode}) => {
        this.defaultBehaviorEvent?.stopPropagation()
        this.defaultBehaviorEvent?.preventDefault()

        if (!previousSiblingInTree) return

        const oldBlockUnit = this.docNodeToBlockUnit.get(docNode)!
        const oldHost = this.blockUnitToHost.get(oldBlockUnit!)!
        oldHost.destroy()

        // 完全重新生成上一个节点。
        // TODO 为了更好地性能未来我们可以有更细致的操作，但先要解决 old host 一旦 destroy 里面所有的  computed 都会失效和复用 content 节点冲突的问题。
        const oldPreviousBlockUnit = this.docNodeToBlockUnit.get(previousSiblingInTree)!
        const oldPreviousHost = this.blockUnitToHost.get(oldPreviousBlockUnit)!
        const newBlockUnitFrag = this.createBlockUnitFragment(previousSiblingInTree) as DocumentFragment
        oldPreviousBlockUnit.replaceWith(newBlockUnitFrag)
        oldPreviousHost.destroy(true)

        // TODO set cursor
    }
    patchSpliceContent = ({ args: [docNode, startText, startOffset, endText, endOffset]} : {args: [DocNode, Text, number, Text?, number?]}) => {
        const startTextDOM = this.textNodeToElement.get(startText)!
        const endTextDOM = endText ? this.textNodeToElement.get(endText) : undefined
        // 1. 删掉中间的节点
        removeNodesBetween(startTextDOM.nextElementSibling! as ChildNode, endTextDOM as ChildNode, false)
        // 2. 更新节点
        startTextDOM.replaceWith(this.createTextDOMNode(startText))
        if (endTextDOM) endTextDOM.replaceWith(this.createTextDOMNode(endText!))
    }
    patchPrependDefaultPreviousSibling = ({ result: newDocNode }: {result: DocNode}) => {
        const blockUnit = newDocNode.previousSiblingInTree ? this.docNodeToBlockUnit.get(newDocNode.previousSiblingInTree) : undefined
        const newBlockUnit = this.createBlockUnitFragment(newDocNode)
        if (blockUnit) {
            insertAfter(newBlockUnit, blockUnit)
        } else {
            this.element?.prepend(newBlockUnit)
        }
    }
    patchAppendDefaultNextSibling = ({ result: newDocNode }: {result: DocNode}) =>{
        const blockUnit = this.docNodeToBlockUnit.get(newDocNode.previousSiblingInTree)!
        const newBlockUnit = this.createBlockUnitFragment(newDocNode)
        insertAfter(newBlockUnit, blockUnit)
    }



    // 外部也可以调用的 api
    updateRange(range: Range, newText: string) {
        this.doc.updateRange(this.createDocRange(range)!, newText)
    }
    inputCharacter = (e: KeyboardEvent, currentRange: Range|undefined) => {
        assert(!!currentRange, 'no range')
        this.tryUseDefaultBehavior(e)
        this.updateRange(currentRange!, e.key)
        this.resetUseDefaultBehavior()
    }
    changeLine = (e: Event|undefined, currentRange: Range|undefined) => {
        assert(!!currentRange, 'no range selected')
        // 本身就破坏结构了，不需要支持 defaultBehavior
        e?.preventDefault()
        e?.stopPropagation()
        if (currentRange!.collapsed) {
            const docRange = this.createDocRange(currentRange!)
            const {startOffset, startText, startNode} = docRange
            if (startOffset === 0 && startText.isFirstContent()) {
                // 1. 头部。就在当前节点前面 prepend 一个空行或者别的空节点，例如空的 listItem
                this.doc.prependDefaultPreviousSibling(startNode)
            } else if(!startText.next && startOffset === startText.value.length){
                // 2. 尾部，在下面添加个默认的就行
                this.doc.appendDefaultNextSibling(startNode)
            } else {
                // 3. 中间
                const removedContent = this.doc.spliceContent(startNode, startText, startOffset)
                this.doc.appendDefaultNextSibling(startNode, removedContent)
            }
        } else {
            // TODO 有 range 的情况。range 清空，但是剩下的部分单独变成 Para，要不要复用 updateRange ?
        }

        // TODO setCursor(splitPointNode, 0)
    }
    deleteContent = (e: Event|undefined, currentRange: Range|undefined) => {
        assert(!!currentRange, 'no range selected')
        this.tryUseDefaultBehavior(e)
        if (currentRange!.collapsed) {
            // 删除单个字符，或者进行结构变化
            const docRange = this.createDocRange(currentRange!)
            const {startOffset, startText, startNode} = docRange
            if (startOffset === 0 && startText.isFirstContent()) {
                // 1. 如果自己身的结构可以破坏，不影响其他节点。那么就只破坏自身，例如 Section 的 title、list 等
                if(DocNode.typeHasChildren(startNode)) {
                    this.doc.unwrap(startText.parent())
                } else {
                    // 2. TODO 如果自身的结构不能破坏。那就就是和前一个节点的内容合并了。这是 Para 合到 section title 或者 listItem 里面。
                    this.doc.mergeByPreviousSiblingInTree(startNode)
                }

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
    createTextDOMNode(textNode: DocNode) {
        const textDOMNode = textNode.render({}, {createElement, Fragment})
        this.elementToTextNode.set(textDOMNode, textNode as Text)
        this.textNodeToElement.set(textNode as Text, textDOMNode)
        return textDOMNode
    }
    createBlockUnitFragment(docNode: DocNode) : DocumentFragment{
        const renderProps: RenderProps = {}

        if ((docNode.constructor as typeof DocNode).hasContent) {
            // CAUTION 为了性能决定不用 LinkedList，靠监听 Document 的变化来手动维护 blockUnit。
            renderProps.content = DocNode.map(docNode.content, (textNode: DocNode) => {
                return this.createTextDOMNode(textNode)
            })
        }

        const fragment = document.createDocumentFragment()
        const contentDOMNode = docNode.render(renderProps, {createElement, Fragment})
        const placeholder = new Comment('placeholder')
        fragment.appendChild(placeholder)
        const host= createHost(contentDOMNode, placeholder, this.hostContext)
        host.render()

        this.blockUnitToHost.set(contentDOMNode, host)
        this.docNodeToBlockUnit.set(docNode, contentDOMNode)

        if ((docNode.constructor as typeof DocNode).hasChildren) {
            fragment.append(
                ...DocNode.map(docNode.firstChild,
                    (childDocNode) => this.createBlockUnitFragment(childDocNode)
                )
            )
        }
        return fragment
    }
    renderBlockUnitList(container: HTMLElement) {
        const blockUnitFragments = DocNode.map(this.doc.firstChild, node => this.createBlockUnitFragment(node))
        // CAUTION 为了性能，暂时决定不 reactive 化，因为操作 blockUnit 本来就是 dom 了，操作这个链表和操作 dom 是一样的。
        blockUnitFragments.forEach(fragment => {
            container.appendChild(fragment)
        })
    }
    render() {

        this.element = (
            <div contenteditable
                onKeydown={[
                    onNotComposition(onSingleKey(withCurrentRange(this.inputCharacter))),
                    onNotComposition(onEnterKey(withCurrentRange(this.changeLine))),
                    onNotComposition(onBackspaceKey(withCurrentRange(this.deleteContent))),
                    onNotComposition(onTabKey(this.changeLevel))
                ]}
            >
            </div>
        ) as unknown as HTMLElement
        this.renderBlockUnitList( this.element!)

        return this.element
    }
}

const onNotComposition = eventAlias((e: KeyboardEvent) => !(e.isComposing || e.keyCode === 229))
const onSingleKey = eventAlias((e: KeyboardEvent) => e.key.length === 1)


function insertAfter(newEle: HTMLElement|DocumentFragment, refEle: HTMLElement) {
    refEle.parentElement?.insertBefore(newEle, refEle.nextElementSibling!)
}



