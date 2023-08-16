import { createHost, onEnterKey, onBackspaceKey, eventAlias, onTabKey, createElement, Fragment, Host, withCurrentRange } from 'axii'
import {Component, } from "../global";
import {ANY, Content, DocumentContent, FormatData} from "./Content";
import {DocNode, DocRange, Text, RenderProps} from "./DocNode";
import {state as globalKM} from "./globals";
import {assert, nextTask, removeNodesBetween, setNativeCursor, setNativeRange, unwrapChildren} from "./util";
import {ReactiveState} from "./ReactiveState";
import {EventDelegator} from "./EventDelegator";


type CallbackType = (...arg: any[]) => any

export class Observable {
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

export const CONTENT_RANGE_CHANGE = 'contentrangechange'

export class DocumentContentView extends EventDelegator{
    public element?: HTMLElement
    public elementToTextNode = new WeakMap<HTMLElement, Text>()
    public textNodeToElement = new WeakMap<Text, HTMLElement>()
    public hostContext = { skipIndicator: {skip: false} }
    public docNodeToBlockUnit = new WeakMap<DocNode, HTMLElement>()
    public blockUnitToHost: WeakMap<HTMLElement, Host> = new WeakMap()
    public blockUnitToDocNode: WeakMap<HTMLElement, DocNode> = new WeakMap()
    public state: ReactiveState
    constructor(public doc: DocumentContent) {
        super()

        this.state = new ReactiveState(this)

        this.doc.listen('updateRange', this.patchUpdateRange)
        this.doc.listen('unwrap', this.patchUnwrap)
        this.doc.listen('insertContentAfter', this.patchInsertContentAfter)
        this.doc.listen('insertContentBefore', this.patchInsertContentBefore)
        this.doc.listen('mergeByPreviousSiblingInTree', this.patchMergeByPreviousSiblingInTree)
        this.doc.listen('spliceContent', this.patchSpliceContent)
        // TODO 要不要直接就改成 prepend/append ?
        this.doc.listen('prependPreviousSibling', this.patchPrependPreviousSibling)
        this.doc.listen('appendNextSibling', this.patchAppendNextSibling)
        this.doc.listen('removeDocNode', this.patchRemoveDocNode)
        this.doc.listen('replaceDocNode', this.patchReplaceDocNode)
        this.doc.listen('updateText', this.patchUpdateText)

        this.listen('selectionchange', this.dispatchContentRangeChange)

    }
    dispatchContentRangeChange = () => {
        // 这里已经通过 EventDelegator 检查过了肯定是在 doc 内。这里只是要修正选中了整个节点的情况。
        // 没有 range 也算是 合法的
        if (!globalKM.selectionRange || this.isValidRange(globalKM.selectionRange!)) {
            console.log("selection range is valid", globalKM.selectionRange)
            nextTask(() => this.dispatch(new CustomEvent(CONTENT_RANGE_CHANGE)))
            return
        }

        console.warn("selection range is invalid")
        // 我们目前只修正选中了整个段落的情况
        const {startContainer, commonAncestorContainer} = globalKM.selectionRange
        if (startContainer.nodeType !== Node.TEXT_NODE && startContainer === commonAncestorContainer ) {
            const docNode = this.findDocNodeFromElement(startContainer)
            console.log("fix select para", docNode)
            if (docNode) {
                this.setRange(new DocRange(
                    docNode.content as Text,
                    0,
                    docNode.content?.lastSibling as Text,
                    0,
                ))
            }
        }

        // 剩下的非法情况统统修正成到文档最后。
        const lastText = this.doc.lastDescendant.content?.lastSibling as Text
        this.setRange(new DocRange(
            lastText,
            lastText.value.length,
            lastText,
            lastText.value.length,
        ))

        nextTask(() => this.dispatch(new CustomEvent(CONTENT_RANGE_CHANGE)))

    }
    defaultBehaviorEvent: Event|undefined
    tryUseDefaultBehavior(event: Event|undefined) {
        this.defaultBehaviorEvent = event
    }
    resetUseDefaultBehavior() {
        this.defaultBehaviorEvent = undefined
    }
    findDocNodeFromElement(element: Node) {
        let pointer: HTMLElement | Node | null = element
        while(pointer && pointer !== this.element && pointer !== document.body) {
            const item = this.blockUnitToDocNode.get(pointer as HTMLElement)
            if (item) {
                return item
            } else {
                pointer = pointer.parentElement
            }
        }
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
    isValidRange(range?: Range) : boolean{
        return !!range?.startContainer && !!range?.endContainer && !!(this.findTextNodeFromElement(range?.startContainer) && this.findTextNodeFromElement(range?.endContainer))
    }
    createDocRange = (range: Range) : DocRange|null => {
        // 非法选区。可能选中了整个节点。
        assert(this.isValidRange(range), 'range not valid')
        return new DocRange(
            this.findTextNodeFromElement(range.startContainer)!,
            range.startOffset,
            this.findTextNodeFromElement(range.endContainer)!,
            range.endOffset,
        )
    }
    isDefaultRangeCollapseAcceptable({startNode, endNode, startText, startOffset, endOffset, endText}: DocRange) {
        // 理论上 startNode 和 endNode 是在 paragraph/title 里面应该都可以。看是不能从头删到尾，这样会把空的 Text span 节点 也删掉。
        // if (startNode === endNode && !(startText.isFirstContent() && !startText.next && startOffset === 0 && startText.value.length ===1)) return true
        console.warn(
            "checking range acceptable",
            startNode === endNode,
            startNode.isContentEmpty(),
            startText.value,
            startText.next
        )
        // debugger
        // startNode.isContentEmpty()

        if (startNode === endNode && !startNode.isContentEmpty()) return true

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
    patchInsertContentAfter = ({ args: [newText, refText]} : {args: [Text, Text]}) => {
        const refTextDOMNode = this.textNodeToElement.get(refText)!
        // FIXME 还是要设计一个自动 destroy host 的机制才行。不然每个小节点更新都去自己找 host 太麻烦了。
        const placeholder = new Comment('text')
        refTextDOMNode.parentElement!.insertBefore(placeholder, refTextDOMNode.nextElementSibling!)
        const newTextDOM = this.createTextDOMNode(newText)

        const textHost = createHost(newTextDOM, placeholder, this.hostContext)
        textHost.render()
        // insertAfter(newTextDOM, refTextDOMNode)
    }
    patchInsertContentBefore = ({ args: [newText, refText]} : {args: [Text, Text]}) => {
        const refTextDOMNode = this.textNodeToElement.get(refText)!
        // FIXME 还是要设计一个自动 destroy host 的机制才行。不然每个小节点更新都去自己找 host 太麻烦了。
        const placeholder = new Comment('text')
        refTextDOMNode.parentElement!.insertBefore(placeholder, refTextDOMNode!)
        const newTextDOM = this.createTextDOMNode(newText)
        const textHost = createHost(newTextDOM, placeholder, this.hostContext)
        textHost.render()
        // insertAfter(newTextDOM, refTextDOMNode)
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
    patchPrependPreviousSibling = ({ result: newDocNode }: {result: DocNode}) => {
        const blockUnit = newDocNode.previousSiblingInTree ? this.docNodeToBlockUnit.get(newDocNode.previousSiblingInTree) : undefined
        const newBlockUnit = this.createBlockUnitFragment(newDocNode)
        if (blockUnit) {
            insertAfter(newBlockUnit, blockUnit)
        } else {
            this.element?.prepend(newBlockUnit)
        }
    }
    patchAppendNextSibling = ({ result: newDocNode }: {result: DocNode}) =>{
        const blockUnit = this.docNodeToBlockUnit.get(newDocNode.previousSiblingInTree)!
        const newBlockUnit = this.createBlockUnitFragment(newDocNode)
        insertAfter(newBlockUnit, blockUnit)
        this.setCursor(newDocNode.content!, 0)
    }
    patchRemoveDocNode = ({ args: [docNode]} : {args: [DocNode]}) => {
        const blockUnit = this.docNodeToBlockUnit.get(docNode)!
        const oldHost = this.blockUnitToHost.get(blockUnit)!
        oldHost.destroy()
    }
    patchReplaceDocNode = ({ args: [newDocNode, refDocNode]} : {args: [DocNode, DocNode]}) => {
        const oldBlockUnit = this.docNodeToBlockUnit.get(refDocNode)!
        const oldHost = this.blockUnitToHost.get(oldBlockUnit)!
        const newBlockUnitFrag = this.createBlockUnitFragment(newDocNode) as DocumentFragment
        oldBlockUnit.replaceWith(newBlockUnitFrag)
        oldHost.destroy(true)
    }
    patchUpdateText = ({ args: [text]} : {args: [Text]}) => {
        const newText = new Text({type: 'Text', value: text.value})
        const textDOM = this.textNodeToElement.get(text)!
        // CAUTION 用 innerHTML 才能保持住 &ZeroWidthSpace;
        textDOM.innerHTML = newText.render({}, {createElement, Fragment})!.innerHTML
    }

    // 外部也可以调用的 api
    updateRange(range: Range, newText: string) {
        return this.doc.updateRange(this.createDocRange(range)!, newText)
    }
    inputCharacter = (e: KeyboardEvent, currentRange: Range|undefined) => {
        assert(!!currentRange, 'no range')
        const originOffset = currentRange?.startOffset!
        this.tryUseDefaultBehavior(e)
        const newText = this.updateRange(currentRange!, e.key)
        this.resetUseDefaultBehavior()

        if (e.defaultPrevented) {
            this.setCursor(newText, originOffset+1)
        }
        // CAUTION 这里一定等所有完成了再 trigger，不然 useDefaultBehavior 的动作还没生效，因为这是 keydown 事件的回调。
        nextTask(() => {
            this.element?.dispatchEvent(new CustomEvent('inputChar',  { detail: {data: e.key}, cancelable: false }))
        })
    }
    changeLine = (e: Event|undefined, currentRange: Range|undefined) => {
        assert(!!currentRange, 'no range selected')
        // 本身就破坏结构了，不需要支持 defaultBehavior
        e?.preventDefault()
        e?.stopPropagation()
        if (currentRange!.collapsed) {
            const docRange = this.createDocRange(currentRange!)!
            const {startOffset, startText, startNode} = docRange
            if (startOffset === 0 && startText.isFirstContent()) {
                // 1. 头部。就在当前节点前面 prepend 一个空行或者别的空节点，例如空的 listItem
                this.doc.prependDefaultPreviousSibling(startNode)
                this.setCursor(startNode, 0)
            } else if(!startText.next && startOffset === startText.value.length){
                // 2. 尾部，在下面添加个默认的就行
                const newDocNode = this.doc.appendDefaultNextSibling(startNode)
                this.setCursor(newDocNode, 0)
            } else {
                // 3. 中间
                const removedContent = this.doc.spliceContent(startNode, startText, startOffset)
                const newDocNode = this.doc.appendDefaultNextSibling(startNode, removedContent)
                this.setCursor(newDocNode, 0)
            }
        } else {
            // 等同于先 updateRange ，再 change changeLine
            // TODO 因为 startText 肯定还在？？？如果一直选到头部呢？？？
            const newText = this.updateRange(currentRange!, '')
            const newTextDOM = this.textNodeToElement.get(newText)?.firstChild!
            const newRange = document.createRange()
            newRange.selectNodeContents(newTextDOM)
            newRange.collapse()

            this.changeLine(undefined, newRange)
        }

    }
    deleteContent = (e: Event|undefined, currentRange: Range|undefined) => {
        assert(!!currentRange, 'no range selected')
        this.tryUseDefaultBehavior(e)
        const docRange = this.createDocRange(currentRange!)!
        const {startOffset, startText, startNode} = docRange
        let newFocusDocNode: DocNode
        let newFocusOffset: number = Infinity
        if (currentRange!.collapsed) {
            // 删除单个字符，或者进行结构变化
            if (startOffset === 0 && startText.isFirstContent()) {
                // 1. 如果自己身的结构可以破坏，不影响其他节点。那么就只破坏自身，例如 Section 的 title、list 等
                if(DocNode.typeHasChildren(startNode)) {
                    newFocusDocNode = this.doc.unwrap(startText.parent())
                    newFocusOffset = 0
                } else {
                    // 2. 如果自身的结构不能破坏。那就就是和前一个节点的内容合并了。这是 Para 合到 section title 或者 listItem 里面。
                    this.doc.mergeByPreviousSiblingInTree(startNode)
                    // startText 还在
                    newFocusDocNode = startText
                    newFocusOffset = 0
                }

            } else {
                // 删除单个字符
                if(startOffset === 0) {
                    const prevText = startText.prev()
                    // 如果是 0 的位置，相当于选中上一个节点的最后一个字符进行删除。这里肯定有上一个字符，因为上面判断 isFirstContent()
                    newFocusDocNode = this.doc.updateRange(new DocRange(prevText, prevText.value.length-1, startText, 0), '')
                } else {
                    // 这里包括了是 1 的位置，然后删光了的情况。
                    newFocusDocNode = this.doc.updateRange(docRange.derive({ startOffset: startOffset - 1}), '')
                    console.log(startOffset, newFocusDocNode)
                }
            }
        } else {
            newFocusDocNode = this.doc.updateRange(this.state.contentRange()!, '')
        }
        if (e?.defaultPrevented) {
            this.setCursor(newFocusDocNode, newFocusOffset)
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
        this.blockUnitToDocNode.set(contentDOMNode, docNode)
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

    renderBlockUnitList() {
        const blockUnitFragments = DocNode.map(this.doc.firstChild, node => this.createBlockUnitFragment(node))
        // CAUTION 为了性能，暂时决定不 reactive 化，因为操作 blockUnit 本来就是 dom 了，操作这个链表和操作 dom 是一样的。
        blockUnitFragments.forEach(fragment => {
            this.element!.appendChild(fragment)
            if (fragment instanceof DocumentFragment) {
                for(let child of Array.from(fragment.children)) {
                    this.childDelegators.block?.bindElement(child as HTMLElement)
                }
            } else {
                this.childDelegators.block?.bindElement(fragment)
            }
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
        this.renderBlockUnitList()

        this.bindElement(this.element!)

        return this.element
    }
    setCursor(docNode: DocNode, offset: number) {
        const firstText = docNode instanceof Text ? docNode : docNode.content as Text
        const startContainer = this.textNodeToElement.get(firstText)!.firstChild!
        const startOffset = offset === Infinity ? firstText.value.length : offset
        setNativeCursor(startContainer, startOffset)
        console.log("setting cursor", firstText, startContainer, startOffset)
    }
    setRange(docRange: DocRange) {
        const startContainer = this.textNodeToElement.get(docRange.startText)!.firstChild!
        const endContainer = this.textNodeToElement.get(docRange.endText)!.firstChild!
        setNativeRange(startContainer, docRange.startOffset, endContainer, docRange.endOffset)
    }
    formatRange(range: Range, formatData: FormatData) {
        this.doc.formatRange(this.createDocRange(range)!, formatData)
    }
    formatCurrentRange(formatData: FormatData) {
        const currentRange = this.state.contentRange()!
        this.doc.formatRange(currentRange, formatData)
        // 重置 range
        this.setRange(currentRange)
    }
    get boundaryContainer() {
        return this.element?.parentElement
    }
}

const onNotComposition = eventAlias((e: KeyboardEvent) => !(e.isComposing || e.keyCode === 229))
const onSingleKey = eventAlias((e: KeyboardEvent) => e.key.length === 1)


function insertAfter(newEle: HTMLElement|DocumentFragment|Comment, refEle: HTMLElement) {
    refEle.parentElement?.insertBefore(newEle, refEle.nextElementSibling!)
}



