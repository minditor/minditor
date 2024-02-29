import {createElement, eventAlias, onBackspaceKey, onEnterKey, onKey, onTabKey} from 'axii'
import {
    Block,
    BlockData,
    Component,
    DocNode,
    DocNodeFragment,
    DocumentContent,
    EmitData,
    FormatData,
    Inline,
    InlineComponent,
    Paragraph,
    Text
} from "./DocumentContent.js";
import {
    assert,
    IS_COMPOSITION_BEFORE_KEYDOWN,
    isAsyncFunction,
    setNativeCursor,
    setNativeRange,
    SHOULD_FIX_OFFSET_LAST,
    SHOULD_RESET_CURSOR_AFTER_BACKSPACE,
    ZWSP
} from "./util";
import {ReactiveViewState} from "./ReactiveViewState.js";
import {EventDelegator} from "./EventDelegator";
import {GlobalState} from "./globals.js";
import {DocumentContentHistory} from "./DocumentContentHistory.js";
import {DocRange} from "./Range.js";
import {Document} from "./Document.js";


type CallbackType = (...arg: any[]) => any


export const CONTENT_RANGE_CHANGE = 'contentrangechange'
export const INPUT_CHAR_EVENT= 'inputChar'


function saveHistoryPacket(target: DocumentContentView, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    // TODO should we lock the whole document when running async method?
    descriptor.value = isAsyncFunction(originalMethod) ? async function (this: DocumentContentView, ...args: Parameters<typeof originalMethod>) {
        const startRange = this.state.selectionRange()
        this.history?.openPacket(startRange)
        const result = await originalMethod.apply(this, args)
        this.history?.closePacket(result?.range)
        return result
    } : function (this: DocumentContentView, ...args: Parameters<typeof originalMethod>) {
        const startRange = this.state.selectionRange()
        this.history?.openPacket(startRange)
        const result = originalMethod.apply(this, args)
        this.history?.closePacket(result?.range)
        return result
    }

    return descriptor
}

function setEndRange(target: DocumentContentView, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = isAsyncFunction(originalMethod) ? async function (this: DocumentContentView, ...args: Parameters<typeof originalMethod>) {
        const result = await originalMethod.apply(this, args)
        if (result?.shouldSetRange) {
            this.setRange(result.range)
        }
        this.scrollIntoViewIfNeeded()

        return result
    } : function (this: DocumentContentView, ...args: Parameters<typeof originalMethod>) {
        const result = originalMethod.apply(this, args)
        if (result?.shouldSetRange) {
            this.setRange(result.range)
        }
        this.scrollIntoViewIfNeeded()

        return result
    };

    return descriptor
}



function preventPatchIfUseDefaultBehavior(target: DocumentContentView, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = function (this: DocumentContentView, ...args: Parameters<typeof originalMethod>) {
        if (!this.usingDefaultBehavior) {
            originalMethod.apply(this, args)
        }
    };

    return descriptor
}

export class DocumentContentView extends EventDelegator{
    public element: HTMLElement|null = null
    public docNodeToElement = new WeakMap<DocNode|DocNodeFragment, HTMLElement|DocumentFragment>()
    public elementToDocNode = new WeakMap<HTMLElement, DocNode>()
    public state!: ReactiveViewState
    public usingDefaultBehavior = false
    public globalState: GlobalState
    public history?: DocumentContentHistory
    public content: DocumentContent
    public attached = false
    public componentsToCallOnMount =  new Set<Component|InlineComponent>()
    public componentsToCallOnUnmount =  new Set<Component|InlineComponent>()

    constructor(public document: Document, globalState: GlobalState ) {

        super()
        this.globalState = globalState
        this.history = document.history
        this.state = new ReactiveViewState(this)
        this.content = document.content
        this.content.on('append', this.patchAppend.bind(this))
        this.content.on('prepend', this.patchPrepend.bind(this))
        this.content.on('replace', this.patchReplace.bind(this))
        this.content.on('deleteBetween', this.patchDeleteBetween.bind(this))
        this.content.on('updateText', this.patchUpdateText.bind(this))
        this.content.on('formatText', this.patchFormatText.bind(this))
    }
    renderDocNodeOrFragment(docNode: DocNode|DocNodeFragment) {
        let element = this.docNodeToElement.get(docNode)

        if (!element) {
            if (docNode instanceof Block) {
                element = this.renderBlock(docNode)
            } else if (docNode instanceof Inline) {
                element = this.renderInline(docNode)
            } else {
                // DocNodeFragment
                const docNodeFrag = docNode as DocNodeFragment
                if (docNodeFrag.head instanceof Block) {
                    element = this.renderBlockList(docNodeFrag.head, docNodeFrag.tail.next as Block)
                } else {
                    element = this.renderInlineList(docNodeFrag.head! as Inline, docNodeFrag.tail.next as Inline)
                }
            }
        }
        return element
    }
    @preventPatchIfUseDefaultBehavior
    patchAppend ({ args }: EmitData<Parameters<DocumentContent["append"]>, ReturnType<DocumentContent["append"]>>) {
    // patchAppend =({ args }: EmitData<Parameters<DocumentContent["append"]>, ReturnType<DocumentContent["append"]>>) => {
        const [docNode, ref, parent] = args
        if (ref) {
            const refElement = this.docNodeToElement.get(ref!) as HTMLElement
            const element = this.renderDocNodeOrFragment(docNode)
            insertAfter(element!, refElement)
        } else {
            if (parent instanceof DocumentContent) {
                const element = this.renderDocNodeOrFragment(docNode)
                this.element!.appendChild(element!)
            } else {
                const parentElement = this.docNodeToElement.get(parent!) as HTMLElement
                const element = this.renderDocNodeOrFragment(docNode)
                parentElement.appendChild(element!)
            }
        }

        this.callComponentOnMount()

    }
    @preventPatchIfUseDefaultBehavior
    patchPrepend ({ args }: EmitData<Parameters<DocumentContent["prepend"]>, ReturnType<DocumentContent["prepend"]>>) {
        // FIXME prepend error
        const [docNode, ref] = args
        const refElement = this.docNodeToElement.get(ref)!as HTMLElement
        const element = this.renderDocNodeOrFragment(docNode)
        insertBefore(element!, refElement)
        this.callComponentOnMount()
    }

    @preventPatchIfUseDefaultBehavior
    patchReplace ({ args }: EmitData<Parameters<DocumentContent["replace"]>, ReturnType<DocumentContent["replace"]>>) {
        const [docNode, ref] = args
        const refElement = this.docNodeToElement.get(ref) as HTMLElement|undefined
        // the dom may not on body
        if (refElement) {
            const element = this.renderDocNodeOrFragment(docNode)
            refElement.replaceWith(element!)
        }
        this.callComponentOnMount()
    }
    @preventPatchIfUseDefaultBehavior
    patchDeleteBetween({ args, result }: EmitData<Parameters<DocumentContent["deleteBetween"]>, ReturnType<DocumentContent["deleteBetween"]>>) {
        const { head } = result as DocNodeFragment

        const fragment = document.createDocumentFragment()
        let current = head

        while (current) {
            const element = this.docNodeToElement.get(current)!
            fragment.appendChild(element)
            current = current.next!
        }

        this.docNodeToElement.set(result, fragment)
    }
    @preventPatchIfUseDefaultBehavior
    patchUpdateText ({ args}: EmitData<Parameters<DocumentContent["updateText"]>, ReturnType<DocumentContent["updateText"]>>) {
        const [text, ref] = args
        const element = this.docNodeToElement.get(ref)!
        // ZWSP is used to keep the cursor in the empty text
        element.textContent = text.length === 0 ? ZWSP : text
    }
    patchFormatText ({ args}: EmitData<Parameters<DocumentContent["formatText"]>, ReturnType<DocumentContent["formatText"]>>) {
        const newFormats = args[0]
        Object.entries(newFormats).forEach(([key, value]) => {
          // @ts-ignore
            const styleKV = Text.formatToStyle([key, value])!
            const [styleName, styleValue] = Object.entries(styleKV)[0]

            const element = this.docNodeToElement.get(args[1]) as HTMLElement
            if (styleValue === undefined) {
                element.style.removeProperty(styleName)
            } else {
                // @ts-ignore
                element.style[styleName] = styleValue
            }
        })
    }

    renderInline(inline: Inline) {
        const element = inline.render()
        this.docNodeToElement.set(inline, element)
        this.elementToDocNode.set(element, inline)
        if (inline instanceof InlineComponent) {
            this.componentsToCallOnMount.add(inline)
        }
        return element
    }
    renderInlineList(head: Inline, end?: Inline){
        const result = document.createDocumentFragment()
        let current = head
        while (current && current !== end) {
            result.appendChild(this.renderInline(current))
            current = current.next!
        }
        return result
    }
    renderBlock(block: Block) {
        const element =  block.render({ children:  this.renderInlineList(block.firstChild!) })
        this.docNodeToElement.set(block, element)
        this.elementToDocNode.set(element, block)
        this.childDelegators['block'].bindElement(element)
        if (block instanceof Component) {
            this.componentsToCallOnMount.add(block)
        }
        return element
    }
    renderBlockList(head: Block, end?: Block) {
        const result = document.createDocumentFragment()
        let current = head
        while (current && current !== end) {
            result.appendChild(this.renderBlock(current))
            current = current.next!
        }
        return result
    }
    // CAUTION browsers default behavior is same.
    //  1. In chrome/safari, if startOffset is 0 and THERE IS previous text node, new data will be insert into last text, not this startText.
    //  2. firefox will not delete startText  and insert new text into startText, keep endText not deleted.
    //  Here we use a unique strategy: always insert to startText。
    updateRange(range: DocRange, replaceTextValue = '', dontMergeBlock = false) {
        const { startBlock, startText, startOffset, endBlock, endText, endOffset } = range
        // 1. update block and inline structure first
        if (range.isInSameBlock ) {
            if (!range.isInSameInline&& !range.isSibling) {
                this.content.deleteBetween(startText.next!, endText, startBlock)
            }
        } else {
            // handle range across blocks
            if (startText.next) {
                this.content.deleteBetween(startText.next!, null, startBlock)
            }
            const remainEndFragment = this.content.deleteBetween(endText, null, endBlock)
            // delete all blocks between startBlock and endBlock
            this.content.deleteBetween(startBlock.next!, endBlock.next, this.content)

            // insert fragments into startBlock if there are any.
            // TODO check if endText is also emtpy?
            if (remainEndFragment) {
                if (!dontMergeBlock) {
                    this.append(remainEndFragment, startText, startBlock)
                } else {
                    const newPara = this.content.createParagraph(remainEndFragment)
                    this.append(newPara, startBlock, this.content)
                }
            }
        }

        // 2. update startText and endText
        if (range.isInSameInline) {
            const newTextValue = startText.data.value.slice(0, startOffset) + replaceTextValue + startText.data.value.slice(endOffset)
            this.updateText(newTextValue, startText)
        } else {
            const newStartTextValue = startText.data.value.slice(0, startOffset) + replaceTextValue
            const newEndTextValue = endText.data.value.slice(endOffset)

            // CAUTION we should update startText and endText separately, because both of them may have formats, if we merge them, the format may be wrong.
            this.updateText(newStartTextValue, startText)

            if (newEndTextValue.length) {
                this.updateText(newEndTextValue, endText)
            } else {
                this.deleteBetween(endText, endText.next, endBlock)
            }
        }

    }
    tryUseDefaultBehaviorForRange(range: DocRange, e: Event) {
        const {startText, startOffset, endText, endOffset, isCollapsed, isInSameInline} = range
        const canUseDefaultBehaviorInBackspace = !(e instanceof KeyboardEvent && e.key === 'Backspace') ||
            !SHOULD_RESET_CURSOR_AFTER_BACKSPACE && !(isCollapsed && startOffset < 2 && startText.data.value.length < 2)

        // CAUTION these checks depend on the DocRange have handled all the odd offset cases across browsers.
        const canUseDefaultBehaviorInInputOrDeletion = isCollapsed ?
            (startOffset!== 0 && (SHOULD_FIX_OFFSET_LAST ? endOffset !== endText.data.value.length : true)) :
            (startOffset!== 0 && endOffset!== endText.data.value.length && isInSameInline)


        const canUseDefaultBehavior = e.isTrusted && canUseDefaultBehaviorInBackspace && canUseDefaultBehaviorInInputOrDeletion

        if (canUseDefaultBehavior) {
            console.warn('using default behavior')
            this.usingDefaultBehavior = true
        } else {
            if (!isCollapsed) {
                this.setCursor(startText, startOffset)
            }
            e.preventDefault()
        }
        return canUseDefaultBehavior
    }
    resetUseDefaultBehavior() {
        this.usingDefaultBehavior = false
    }
    @saveHistoryPacket
    @setEndRange
    inputNotCompositionData(e: InputEvent) {
        const range = this.state.selectionRange()!
        const {startText,startBlock,  startOffset, endText, endOffset, isCollapsed, isInSameInline} = range

        const succeed = this.tryUseDefaultBehaviorForRange(range, e)

        this.updateRange(range, e.data as string)

        this.resetUseDefaultBehavior()
        this.dispatch(new CustomEvent(INPUT_CHAR_EVENT, {detail: e.data}))

        return {
            shouldSetRange: !succeed,
            range: DocRange.cursor(startBlock, startText, startOffset + 1)
        }
    }
    @saveHistoryPacket
    @setEndRange
    deleteRangeForReplaceWithComposition(e: KeyboardEvent) {
        const range = this.state.selectionRange()!
        if(range.isCollapsed) {
           return null
        }
        // CAUTION e.preventDefault is not working here, so we reset cursor to avoid default behavior.
        this.setCursor(range.startText, range.startOffset)
        this.updateRange(range, '')

        // CAUTION we returned cursor here is because range may be all deleted, we need to set cursor to a ZWSP end.
        return { shouldSetRange: true, range: DocRange.cursor(range.startBlock, range.startText, range.startOffset)}
    }

    @saveHistoryPacket
    @setEndRange
    inputComposedData (e: CompositionEvent) {
        const cursorBeforeComposition = this.state.rangeBeforeComposition()!
        const succeed = this.tryUseDefaultBehaviorForRange(cursorBeforeComposition, e)

        this.updateRange(cursorBeforeComposition, e.data)

        this.resetUseDefaultBehavior()
        this.dispatch(new CustomEvent(INPUT_CHAR_EVENT, {detail: e.data}))

        return {
            shouldSetRange: !succeed,
            range: DocRange.cursor(cursorBeforeComposition.startBlock, cursorBeforeComposition.startText, cursorBeforeComposition.startOffset + e.data.length)
        }
    }

    // CAUTION if all startText is deleted,
    //  chrome will put new text at head of next text node,
    //  while firefox/safari put new text at end of the startText.
    //  we use the strategy of keeping the startText and not delete endText at same time.
    @saveHistoryPacket
    @setEndRange
    deleteRange(e: KeyboardEvent) {
        const range = this.state.selectionRange()!
        const succeed = this.tryUseDefaultBehaviorForRange(range, e)

        this.updateRange(range, '')
        this.resetUseDefaultBehavior()

        let endCursorBlock = range.startBlock
        let endCursorText = range.startText
        let endCursorOffset = range.startOffset
        if (!succeed){
            if(range.startText.data.value.length === 0 && range.startText.prev() instanceof Text) {
                endCursorBlock = range.startBlock
                endCursorText = range.startText.prev()! as Text
                endCursorOffset = range.startText.prev()!.data.value.length
                // no text, delete all.
                this.content.deleteBetween(range.startText, range.startText.next, range.startBlock)
            }
        }

        return { shouldSetRange: !succeed, range: DocRange.cursor(endCursorBlock!, endCursorText as Text, endCursorOffset)}
    }

    @saveHistoryPacket
    @setEndRange
    deleteLast(e: KeyboardEvent) {
        const range = this.state.selectionRange()!
        const { startText, startOffset, startBlock } = range
        // if it is the head of the document, do nothing
        let endCursorBlock
        let endCursorText
        let endCursorOffset

        // 1. in the middle of the text, try to use default behavior
        if (startOffset !== 0) {
            const succeed = this.tryUseDefaultBehaviorForRange(range, e)
            const nextRange = this.deleteLastChar()
            this.resetUseDefaultBehavior()
            return { shouldSetRange: !succeed, range: nextRange}
        }

        // not in the middle, prevent default behavior
        e.preventDefault()

        // 2. at head of para(!startText.prev() && startOffset === 0)
        if (!startText.prev()) {
            // 2.1 if the block has unwrap method, call it
            if ((startBlock.constructor as typeof Block).unwrap) {
                // heading/listItem will unwrap into para
                const newPara = (startBlock.constructor as typeof Block).unwrap!(this.content, startBlock)
                if (newPara) {
                    endCursorBlock = newPara
                    endCursorText = newPara.firstChild as Text
                    endCursorOffset = 0
                } else {
                    // 1.2.2 if unwrap returned undefined, that means it is same block, the range should not change
                    endCursorBlock = startBlock
                    endCursorText = startText
                    endCursorOffset = 0
                }

                return { shouldSetRange: true, range: DocRange.cursor(endCursorBlock!, endCursorText! as Text, endCursorOffset!)}
            }

            // 2.2. nothing before startBlock, do nothing
            if (!startBlock.prev()) return { shouldSetRange: true, range }


            // 2.3. the last block is Component
            if (startBlock.prev() instanceof Component) {
                this.content.deleteBetween(startBlock.prev()!, startBlock, this.content)
                return { shouldSetRange: true, range }
            }

            // 2.4. the last block is an empty para
            if (startBlock.prev() instanceof Paragraph && (startBlock.prev() as Paragraph).isEmpty) {
                // delete the empty para
                this.content.deleteBetween(startBlock.prev()!, startBlock, this.content)
                return { shouldSetRange: true, range }
            }

            // 2.5. the last block is a normal block
            // 2.5.1. the last block is a component, set range to the end of the last block
            if(startBlock instanceof Component) {
                return { shouldSetRange: true, range: DocRange.cursor(startBlock.prev()!, startBlock.prev()?.lastChild! as Text, Infinity)}
            }

            // 2.5.2. if the last block and this block both are Paragraph compatible, merge them
            if(startBlock.prev()){
                const isStartBlockEmptyPara = (startBlock instanceof Paragraph) &&  (startBlock as Paragraph).isEmpty
                const previousBlock = startBlock.prev()!
                this.content.deleteBetween(startBlock, startBlock.next, this.content)
                const inlineFrag = this.content.deleteBetween(startBlock.firstChild!, null, startBlock)
                const previousBlockLastChild = previousBlock.lastChild!
                if(!isStartBlockEmptyPara){
                    // is this block is not empty para, append it to the end of previous block.
                    this.append(inlineFrag, previousBlock.lastChild!, previousBlock)
                }

                if (previousBlockLastChild instanceof Text) {
                    endCursorBlock = previousBlock
                    endCursorText = previousBlockLastChild
                    endCursorOffset = previousBlockLastChild.data.value.length
                } else {
                    endCursorBlock = previousBlock
                    endCursorText = previousBlockLastChild.next
                    endCursorOffset = 0
                }
            }

            return { shouldSetRange: true, range: DocRange.cursor(endCursorBlock!, endCursorText! as Text, endCursorOffset!)}
        }


        // 3. at the head of non-para with startOffset === 0.
        //  CAUTION The previous node MUST BE an InlineComponent, because if not, the offset will not be the end of the last text node.
        //   this node MUST BE text, because we do not manage InlineComponent range.
        assert(startText.prev() instanceof InlineComponent, 'prev should only be InlineComponent when startOffset === 0')
        // previous node is an InlineComponent, delete it
        this.content.deleteBetween(startText.prev()!, startText, startBlock)
        // change cursor to the end of the last text node
        const nextRange = startText.prev()! instanceof Text ?
            DocRange.cursor(startBlock, startText.prev()! as Text, startText.prev()!.data.value.length) :
            range
        return { shouldSetRange: true, range: nextRange}
    }
    @saveHistoryPacket
    @setEndRange
    splitContent(e: KeyboardEvent) {
        const range = this.state.selectionRange()!
        const { startText, startOffset, startBlock, isEndFull } = range
        e.preventDefault()

        assert(!(startOffset === 0 && startText.prev() instanceof Text), 'should not happen')
        let splitInline!:Inline

        if (startOffset === 0) {
            splitInline = startText
        } else if (isEndFull) {
            splitInline = startText.next!
        } else {
            // in the middle of text
            splitInline = this.splitText(startText, startOffset, startBlock)
        }
        const newPara = this.splitByInline(startBlock, splitInline)
        return { shouldSetRange: true, range: DocRange.cursor(newPara, newPara.firstChild as Text, 0)}
    }
    @saveHistoryPacket
    @setEndRange
    deleteRangeWithoutMerge (e: KeyboardEvent){
        const range= this.state.selectionRange()!
        const { startText, endBlock, startBlock} = range
        e.preventDefault()

        let endCursorBlock
        let endCursorText
        let endCursorOffset
        if (!range.isInSameBlock) {
            this.updateRange(this.state.selectionRange()!, '', true)
            endCursorBlock = endBlock
            endCursorText = endBlock.firstChild as Text
            endCursorOffset = 0
        } else {
            this.updateRange(this.state.selectionRange()!, '')
            const newPara = this.splitByInline(startBlock, startText.next)
            // handle startText empty situation
            if(startText.data.value.length === 0 && startText.prev()) {
                this.content.deleteBetween(startText, startText.next, startBlock)
            }
            endCursorBlock = newPara
            endCursorText = newPara.firstChild as Text
            endCursorOffset = 0
        }

        return { shouldSetRange: true, range: DocRange.cursor(endCursorBlock, endCursorText, endCursorOffset)}
    }
    @saveHistoryPacket
    @setEndRange
    changeLevel (e: KeyboardEvent) {
        const isUpLevel = e.shiftKey
        const method = isUpLevel ? 'unwrap' : 'wrap'
        const range = this.state.selectionRange()!
        const { startBlock, startText, startOffset, endBlock, endText, endOffset, isCollapsed, isInSameBlock, isInSameInline } = range
        e.preventDefault()
        // if it is not head of para
        if (startOffset !== 0 || startText.prev() || !(startBlock.constructor as typeof Block)[method]) {
            // we DO NOT insert TAB into text.
            return null
        }

        // it is head of para and the block has wrap/unwrap method
        const newBlock = (startBlock.constructor as typeof Block)[method]!(this.content, startBlock)
        if (newBlock) {
            return { shouldSetRange: true, range: DocRange.cursor(newBlock, newBlock.firstChild as Text, 0)}
        } else {
            return { shouldSetRange: true, range }
        }
    }

    @saveHistoryPacket
    @setEndRange
    formatCurrentRange(formatData: FormatData) {
        const currentRange = this.state.selectionRange()!
        const [firstFormattedText, lastFormattedText] = this.formatRange(currentRange, formatData)
        // reset range
        return {shouldSetRange:true, range: new DocRange(currentRange.startBlock, firstFormattedText, 0, currentRange.endBlock, lastFormattedText, lastFormattedText.data.value.length)}
    }

    render() {
        this.element = (
            <div
                className="content-container"
                style={{whiteSpace:'pre-wrap', outline:'none'}}
                spellcheck={false}
                contenteditable
                onKeyDownCapture={[
                    onNotPreventedDefault(onNotComposing(this.onRangeCollapsed(onTabKey(this.changeLevel.bind(this)))))
                ]}
                onKeydown={[
                    // onNotPreventedDefault(onNotComposing(this.onFocused(onCharKey(this.inputOrReplaceWithChar.bind(this))))),
                    onNotPreventedDefault(onNotCompositionStartBeforeKeydown(onComposing(this.onRangeNotCollapsed(this.deleteRangeForReplaceWithComposition.bind(this))))),

                    onNotPreventedDefault(onNotComposing(this.onRangeNotCollapsed(onBackspaceKey(this.deleteRange.bind(this))))),
                    onNotPreventedDefault(onNotComposing(this.onRangeCollapsed(onBackspaceKey(this.deleteLast.bind(this))))),

                    onNotPreventedDefault(onNotComposing(this.onRangeCollapsed(onEnterKey(this.splitContent.bind(this))))),
                    onNotPreventedDefault(onNotComposing(this.onRangeNotCollapsed(onEnterKey(this.deleteRangeWithoutMerge.bind(this))))),
                    onNotPreventedDefault(onNotComposing(onKey('z', {meta:true})(this.undo.bind(this)))),

                    // 有 range 时的输入法开始处理，等同于先删除 range
                    onNotPreventedDefault(onNotComposing(this.onFocused(onKey('a', {meta:true})(this.selectAll.bind(this))))),
                ]}
                onBeforeInput={onNotPreventedDefault(onNotComposing(this.onFocused(this.inputNotCompositionData.bind(this))))}
                onPaste={this.onFocused(this.paste.bind(this))}
                onCut={this.onFocused(this.cut.bind(this))}
                onCopy={this.onFocused(this.copy.bind(this))}
                // CAUTION we bind deleteRangeForReplaceWithComposition here is because safari dispatch composition event before keydown, we must delete range here.
                onCompositionStartCapture={onCompositionStartBeforeKeydown(this.onRangeNotCollapsed(this.deleteRangeForReplaceWithComposition.bind(this)))}
                onCompositionEndCapture={this.onFocused(this.inputComposedData.bind(this))}

            >
                {this.renderBlockList(this.content.firstChild!)}
            </div>
        ) as HTMLElement

        return this.element
    }

    // this method can be called manually when the element is attached to body by user.
    onMount() {
        if(!document.body.contains(this.element!)) return

        this.attached = true
        this.bindElement(this.element!)
        this.callComponentOnMount()
    }
    callComponentOnMount() {
        this.componentsToCallOnMount.forEach(c => c.onMount())
        this.componentsToCallOnMount.clear()
    }
    // TODO should only call it when remove from memory
    callComponentOnUnmount() {
        this.componentsToCallOnUnmount.forEach(c => c.onUnmount())
        this.componentsToCallOnUnmount.clear()
    }

    get boundaryContainer() {
        return this.element?.parentElement
    }
    getContainerBoundingRect() {
        return this.boundaryContainer?.getBoundingClientRect()
    }

    createDocRange(range: Range){
        // CAUTION DocRange is not the same as browser default Range.
        //  1. native cursor in empty text will be set after ZWSP, but user will still get startOffset === 0 in DocRange.
        //  2. if previous node is text, startOffset is always the end of previous text node.
        //  3. the start and end is always set to current node in range.
        const { startContainer, startOffset, endContainer, endOffset, collapsed } = range
        const startContainerText = this.findFirstTextFromElement(startContainer)!
        const endContainerInline = this.findFirstTextFromElement(endContainer)
        // setNativeCursor will call removeAllRange and cause docRange recomputed, at this time, the range is temporary, so we should not return it.
        if (!startContainerText || !endContainerInline) return null

        let startText = startContainerText
        let endInline = endContainerInline
        let docStartOffset = startOffset
        let docEndOffset = endOffset
        if (collapsed) {
            if (startOffset === 1 && startText.isEmpty) {
                //  1. native cursor set to ZWSP end, but we still present to user as 0.
                docStartOffset = 0
                docEndOffset = 0
            } else if (startOffset === 0 && !startText.isEmpty && startContainerText.prev() instanceof Text) {
                //  2. cursor always set to last text end.
                startText = startContainerText.prev() as Text
                docStartOffset = startText.data.value.length
                endInline = startText
                docEndOffset = docStartOffset
            }
        } else {
            // 3. if range is full, the range should always represent the node itself.
            // 如果 startOffset 定位到了上个节点的尾部，我们要把它修正回来。
            if (startOffset!==0 && startOffset === startContainerText.data.value.length && startContainerText.next instanceof Text) {
                startText = startContainerText.next
                docStartOffset = 0
            }

            // if endOffset is set to next node head, we should fix it.
            if (endOffset === 0 && endContainerInline?.prev() instanceof Text) {
                endInline = endContainerInline.prev() as Text
                docEndOffset = endInline.data.value.length
            }

            // because we used ZWSP so the endOffset maybe 1, we should fix it.
            if (startText === endInline && startText.isEmpty) {
                docEndOffset = 0
            }
        }

        const startBlock = this.findFirstBlockFromElement(this.docNodeToElement.get(startText!)!)
        const endBlock = this.findFirstBlockFromElement(this.docNodeToElement.get(endInline!)!)
        return new DocRange(startBlock!, startText!, docStartOffset, endBlock!, endInline!, docEndOffset)
    }
    getBoundingRectOfBlock(block: Block) {
        const element = this.docNodeToElement.get(block)! as HTMLElement
        return element.getBoundingClientRect()
    }
    onRangeNotCollapsed = eventAlias<KeyboardEvent>(() => {
        // CAUTION should ALWAYS check range to make sure the event is from THIS document
        return !!this.state.selectionRange() && !this.state.selectionRange()!.isCollapsed
    })
    onRangeCollapsed = eventAlias<any>(() => {
        // CAUTION should ALWAYS check range to make sure the event is from THIS document
        return !!this.state.selectionRange() && this.state.selectionRange()!.isCollapsed
    })
    onFocused = eventAlias<any>(() => {
        return !!this.state.selectionRange()
    })
    /**
     *  Utils
     **/
    selectAll(e: KeyboardEvent) {
        e.stopPropagation()
        e.preventDefault()
        const { isInSameBlock, startBlock, startText, endText, isFullBlock } = this.state.selectionRange()!
        if (!isInSameBlock || isFullBlock) {
            // select all document
            this.setRange(new DocRange(this.content.firstChild!, this.content.firstChild!.firstChild as Text, 0, this.content.lastChild!, this.content.lastChild!.lastChild as Text, Infinity))
        } else {
            // select all block
            this.setRange(new DocRange(startBlock, startBlock.firstChild as Text, 0, startBlock, startBlock.lastChild as Text, Infinity))
        }
    }
    setCursor(docNode: DocNode, offset: number) {
        // FIXME focus on Component/InlineComponent?
        const isNodeBlock = docNode instanceof Block
        const focusText = isNodeBlock ? (docNode as Block)[offset === 0 ? 'firstChild' : 'lastChild'] as Text : docNode as Text
        const element = this.docNodeToElement.get(focusText)!
        // maybe empty
        const startContainer = element.firstChild || element
        // CAUTION set to 1 if empty, we will insert a ZWSP.
        const startOffset = focusText.isEmpty ?
            1 :
            (offset === Infinity ? focusText.data.value.length : offset)
        setNativeCursor(startContainer as HTMLElement, startOffset)
    }
    setRange(docRange: DocRange) {
        const startContainer = this.docNodeToElement.get(docRange.startText)!.firstChild!
        // CAUTION set to 1 if empty, we will insert a ZWSP.
        const startOffset = docRange.startText.isEmpty ?
            1 :
            (docRange.startOffset === Infinity ? docRange.startText.data.value.length : docRange.startOffset)
        const endOffset = docRange.endText.isEmpty ?
            1 :
            (docRange.endOffset === Infinity ? docRange.endText.data.value.length : docRange.endOffset)

        const endContainer = this.docNodeToElement.get(docRange.endText)!.firstChild!
        setNativeRange(startContainer, startOffset, endContainer, endOffset)
    }
    formatRange(docRange: DocRange, formatData: FormatData) {
        const {startText, startOffset, endText, endOffset, startBlock, isInSameInline, endBlock, isEndFull, isInSameBlock} = docRange
        let lastFormattedText: Text
        let firstFormattedText: Text
        if (isInSameBlock) {
            if (isInSameInline) {
                let toFormatInline = startText
                if (startOffset !== 0) {
                    toFormatInline = this.splitText(startText, startOffset, startBlock)
                }
                if (!isEndFull) {
                    this.splitText(toFormatInline, endOffset - startOffset, startBlock)
                }

                this.content.formatText(formatData, toFormatInline)
                lastFormattedText = toFormatInline
                firstFormattedText = toFormatInline
            } else {
                let startInline = startText
                if (startOffset !== 0) {
                    startInline = this.splitText(startText, startOffset, startBlock)
                }
                firstFormattedText = startInline
                let endInline = endText.next
                if (!isEndFull) {
                    endInline = this.splitText(endText, endOffset, endBlock)
                }
                let currentInline: Inline = startInline
                while (currentInline && currentInline !== endInline) {
                    if (currentInline instanceof Text) {
                        this.content.formatText(formatData, currentInline )
                        lastFormattedText = currentInline
                    }
                    currentInline = currentInline.next!
                }
            }
        } else {
            // start
            const startBlockRange = new DocRange(
                startBlock,
                startText,
                startOffset,
                startBlock,
                startBlock.lastChild as Text,
                startBlock.lastChild!.data.value.length
            );
            firstFormattedText = this.formatRange(startBlockRange, formatData)[0]
            // end
            const endBlockRange = new DocRange(
                endBlock,
                endBlock.firstChild as Text,
                0,
                endBlock,
                endText,
                endOffset
            )
            lastFormattedText = this.formatRange(endBlockRange, formatData)[1]

            // middle
            let currentBlock: Block|null = startBlock.next
            while (currentBlock && currentBlock !== endBlock) {
                const blockFullRange = new DocRange(
                    currentBlock,
                    currentBlock.firstChild! as Text,
                    0,
                    currentBlock,
                    currentBlock.lastChild! as Text,
                    currentBlock.lastChild!.data.value.length
                )
                this.formatRange(blockFullRange, formatData)
                currentBlock = currentBlock.next
            }
        }
        return [firstFormattedText!, lastFormattedText!]

    }
    @saveHistoryPacket
    @setEndRange
    async paste(e: ClipboardEvent) {
        // TODO check if shift key is pressed
        e.preventDefault()

        const range = this.state.selectionRange()!
        const {startText, startBlock, isCollapsed, startOffset} = range

        // clean selection first
        if (!isCollapsed) {
            this.updateRange(range, '')
        }
        if (startOffset !== startText.data.value.length) {
            this.splitText(startText, startOffset, startBlock)
        }

        // CAUTION we only handle startBlock/endBlock here, because startText/endText is handled above and may be changed by this step.
        if(e.clipboardData?.types.includes('application/json')){
            const data = await this.document.clipboard.getData('application/json', e) as BlockData[]

            if (data.length === 0) return
            if (data.length === 1) {
                const blockData = data[0]
                if (blockData.type === 'Paragraph') {
                    // inline
                    const head = DocumentContent.createInlinesFromData(data[0].content, this.content.types)
                    const frag = new DocNodeFragment(head)
                    const lastInFrag = frag.tail as Text
                    this.append(frag, startText, startBlock)
                    return { shouldSetRange: true, range: DocRange.cursor(startBlock, lastInFrag, Infinity)}
                } else {
                    const block = DocumentContent.createBlocksFromData([blockData], this.content.types)
                    if ( startBlock instanceof Paragraph && startBlock.isEmpty) {
                        this.replace(block, startBlock, this.content)
                    } else {
                        this.prepend(block, startBlock, this.content)
                    }
                    return { shouldSetRange: true, range: DocRange.cursor(block.next!, block.next?.firstChild as Text, Infinity)}
                }


            } else {
                const headParaFrag = new DocNodeFragment(DocumentContent.createInlinesFromData(data[0].content, this.content.types))
                const endParaFrag = new DocNodeFragment(DocumentContent.createInlinesFromData(data.at(-1)!.content, this.content.types))
                const middleBlockFrag = data.slice(1, -1).length ? new DocNodeFragment(DocumentContent.createBlocksFromData(data.slice(1, -1), this.content.types)) : null


                let afterCursorFrag = startText.next ? this.content.deleteBetween(startText.next, null, startBlock) : null

                // 1. handle start
                if (startText.isEmpty) {
                    //replace
                    this.replace(headParaFrag, startText, startBlock)
                }else {
                    // append
                    this.append(headParaFrag, startText, startBlock)
                }

                // 2. handle end, create new Para
                const newPara = this.content.createParagraph(endParaFrag)
                const lastInNewPara = newPara.lastChild as Text
                this.append(newPara, startBlock, this.content)
                if (afterCursorFrag) {
                    this.append(afterCursorFrag, newPara.lastChild!, newPara)
                }

                // 3. because paste component may have Component, and this.append always make sure there is an empty
                //  para behind Component which is not what we want HERE, so we handle endBlock first and then handle middle blocks.
                //  so use `this.append` will not append an empty para after the last block.
                if (middleBlockFrag) {
                    this.append(middleBlockFrag, startBlock, this.content)
                }

                return { shouldSetRange: true, range: DocRange.cursor(newPara, lastInNewPara, Infinity)}
            }

        } else {
            const range = this.state.selectionRange()!
            const currentRange = DocRange.cursor(range.startBlock, range.startText, range.startOffset)
            const dataToPaste = await this.document.clipboard.getData('text/plain', e)
            this.updateRange(currentRange, dataToPaste)
            return {
                shouldSetRange: true,
                range: DocRange.cursor(range.startBlock, range.startText, range.startOffset + dataToPaste.length)
            }
        }
        // TODO DOM content?
        // const domparser = new DOMParser()
        // const result = domparser.parseFromString(e.clipboardData!.getData('text/html'), 'text/html')
        // console.log(result)

    }
    @saveHistoryPacket
    @setEndRange
    cut (e: ClipboardEvent) {
        e.preventDefault()
        const range = this.state.selectionRange()!
        // e.clipboardData!.setData('application/json', rangeData)
        this.document.clipboard!.setData('application/json', range.toJSON(), e)
        // e.clipboardData!.setData('text/plain', range.toText())
        this.document.clipboard!.setData('text/plain', range.toText(), e)

        this.updateRange(this.state.selectionRange()!, '')
        return {
            shouldSetRange: true,
            range: DocRange.cursor(range.startBlock, range.startText, range.startOffset)
        }
    }
    copy(e: ClipboardEvent) {
        e.preventDefault()
        const range = this.state.selectionRange()!
        // e.clipboardData!.setData('application/json', rangeData)
        this.document.clipboard!.setData('application/json', range.toJSON(), e)

        // e.clipboardData!.setData('text/plain', range.toText())
        this.document.clipboard!.setData('text/plain', range.toText(), e)

    }
    undo(e: KeyboardEvent) {
        e.preventDefault()
        if (e.shiftKey) {
            this.history?.redo()
        } else {
            this.history?.undo()
        }
    }
    findFirstTextFromElement(startContainer: Node): Text|undefined {
        let current = startContainer
        let result = this.elementToDocNode.get(current as HTMLElement)
        while (current && !result) {
            const docNode = this.elementToDocNode.get(current as HTMLElement)
            if (docNode instanceof Text) {
                result = docNode
            }
            current = current.parentElement!
        }
        return result instanceof Text ? result : undefined
    }
    findFirstBlockFromElement(startContainer: Node): Block|undefined {
        let current = startContainer
        let result: Block|undefined
        while (current && !result) {
            const docNode = this.elementToDocNode.get(current as HTMLElement)
            if (docNode instanceof Block) {
                result = docNode as Block
            }
            current = current.parentElement!

        }
        return result
    }
    scrollIntoViewIfNeeded() {
        const range = this.state.selectionRange()!
        const startRect = this.getBoundingRectOfBlock(range.startBlock)
        const endRect = this.getBoundingRectOfBlock(range.endBlock)
        const containerRect = this.getContainerBoundingRect()
        if (!containerRect) return
        if (startRect.top < containerRect.top + 20) {
            this.boundaryContainer?.scrollBy?.(0, Math.min(startRect.top - containerRect.top, 0) -50)
        } else if (endRect.bottom > containerRect.bottom - 20) {
            this.boundaryContainer?.scrollBy?.(0, Math.max((endRect.bottom - containerRect.bottom), 0) + 50)
        }
    }
    deleteLastChar() {
        const range = this.state.selectionRange()!
        const { startText, startOffset, startBlock } = range
        let endCursorBlock = startBlock
        let endCursorText = startText
        let endCursorOffset = startOffset - 1

        if (startText.data.value.length === 1 && startText.prev() instanceof Text) {
            endCursorBlock = startBlock
            endCursorText = startText.prev()! as Text
            endCursorOffset = Infinity
            this.content.deleteBetween(startText, startText.next, startBlock)
        } else {
            this.content.updateText(startText.data.value.slice(0, startOffset - 1) + startText.data.value.slice( startOffset), startText)
        }

        return DocRange.cursor(endCursorBlock!, endCursorText! as Text, endCursorOffset!)
    }
    splitByInline(block: Block, inline: Inline|null) {

        let newBlock: Block

        const currentType = block.constructor as typeof Block
        if (currentType.splitAsSameType) {
            const Type = block.constructor as typeof Block
            newBlock = Type.createEmpty(block)
        } else {
            newBlock = this.content.createParagraph()
        }


        // cursor at the end, append newBlock after block
        if (!inline) {
            this.append(newBlock, block, this.content)
            return newBlock
        }

        // cursor at the head, prepend newBlock before block
        if (!inline.prev()) {
            this.prepend(newBlock, block, this.content)
            return block
        }

        // in middle
        const inlineFrag = this.deleteBetween(inline, null, block)
        this.replace(inlineFrag, newBlock.firstChild!, newBlock)

        this.append(newBlock, block, this.content)
        return newBlock
    }
    splitText(text:Text, offset: number, block: Block) {
        const originValue = text.data.value
        this.content.updateText(originValue.slice(0, offset), text)
        const splitInline = new Text({value: originValue.slice(offset)})
        this.append(splitInline, text, block)
        return splitInline
    }
    // These api always make sure there is an empty para after the Component.
    append(...args: Parameters<DocumentContent["append"]>) {
        const result = this.content.append(...args)
        if (!result.next && !(result.constructor as typeof Component).asTextNode) {
            if (result instanceof Component) {
                this.content.append(this.content.createParagraph(), result, this.content)
            } else if (result instanceof InlineComponent) {
                this.content.append(this.content.createText(), result, args[2])
            }
        }
        return result
    }
    prepend(...args: Parameters<DocumentContent["prepend"]>) {
        const result = this.content.prepend(...args)
        if (!(result.constructor as typeof Component).asTextNode) {
            if (result instanceof InlineComponent && !result.prev()) {
                this.content.prepend(this.content.createText(), result, args[2])
            }
        }
        return result
    }
    replace(...args: Parameters<DocumentContent["replace"]>) {
        const result = this.content.replace(...args)
        const newItem = args[0]
        if (!(newItem.constructor as typeof Component).asTextNode) {
            if (newItem instanceof InlineComponent ) {
                if (!newItem.prev()) {
                    this.content.prepend(this.content.createText(), newItem, args[2])
                }

                if (!newItem.next) {
                    this.content.append(this.content.createText(), newItem, args[2]!)
                }
            } else if (newItem instanceof Component) {

                if (!newItem.next) {
                    this.content.append(this.content.createParagraph(), newItem, args[2]!)
                }
            }
        }

        return result
    }
    // 下面三个只是为了保持接口一致，实际上只是转发调用。
    deleteBetween(...args: Parameters<DocumentContent["deleteBetween"]>) {
        // FIXME deleteBetween should handle ZWSP and empty para too.
        return this.content.deleteBetween(...args)
    }
    updateText(...args: Parameters<DocumentContent["updateText"]>) {
        return this.content.updateText(...args)
    }
    formatText(...args: Parameters<DocumentContent["formatText"]>) {
        return this.content.formatText(...args)
    }
    destroy() {
        // TODO destroy reactive state?
    }
}

const onCompositionStartBeforeKeydown = eventAlias((e: KeyboardEvent) => IS_COMPOSITION_BEFORE_KEYDOWN)
const onNotCompositionStartBeforeKeydown = eventAlias((e: KeyboardEvent) => !IS_COMPOSITION_BEFORE_KEYDOWN)


const onNotComposing = eventAlias((e: any) => !((e as KeyboardEvent).isComposing || (e as KeyboardEvent).keyCode === 229))
const onComposing = eventAlias((e: KeyboardEvent) => e.isComposing || e.keyCode === 229)
const onNotPreventedDefault = eventAlias((e: KeyboardEvent) => !e.defaultPrevented)

const onCharKey = eventAlias((e: KeyboardEvent) => e.key.length === 1 && !e.altKey  && !e.metaKey && !e.ctrlKey)


function insertAfter(newEle: HTMLElement|DocumentFragment|Comment, refEle: HTMLElement) {
    refEle.parentElement?.insertBefore(newEle, refEle.nextElementSibling!)
}

function insertBefore(newEle: HTMLElement|DocumentFragment|Comment, refEle: HTMLElement) {
    refEle.parentElement?.insertBefore(newEle, refEle)
}



