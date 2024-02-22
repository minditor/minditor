import {atom, createElement, eventAlias, onBackspaceKey, onEnterKey, onTabKey, onKey} from 'axii'
import {
    Block,
    BlockData,
    Component,
    DocNode,
    DocNodeFragment,
    DocumentContent,
    EmitData, EVENT_ANY,
    FormatData,
    Inline,
    InlineComponent,
    Paragraph,
    Text
} from "./DocumentContent.js";
import {
    assert,
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


type CallbackType = (...arg: any[]) => any


export const CONTENT_RANGE_CHANGE = 'contentrangechange'
export const INPUT_CHAR_EVENT= 'inputChar'


function saveHistoryPacket(target: DocumentContentView, propertyKey: string, descriptor: PropertyDescriptor) {
    // 保存原始方法的引用
    const originalMethod = descriptor.value;

    // 重写原始方法
    descriptor.value = function (this: DocumentContentView, ...args: Parameters<typeof originalMethod>) {
        const startRange = this.state.selectionRange()
        this.history?.openPacket(startRange)
        const result = originalMethod.apply(this, args)
        this.history?.closePacket(result?.range)
        return result
    };

    return descriptor
}

function setEndRange(target: DocumentContentView, propertyKey: string, descriptor: PropertyDescriptor) {
    // 保存原始方法的引用
    const originalMethod = descriptor.value;

    // 重写原始方法
    descriptor.value = function (this: DocumentContentView, ...args: Parameters<typeof originalMethod>) {
        const result = originalMethod.apply(this, args)
        if (result?.shouldSetRange) {
            this.setRange(result.range)
        }
        return result
    };

    return descriptor
}



function preventPatchIfUseDefaultBehavior(target: DocumentContentView, propertyKey: string, descriptor: PropertyDescriptor) {
    // 保存原始方法的引用
    const originalMethod = descriptor.value;
    // 重写原始方法
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
    public attached = false
    public componentsToCallOnMount =  new Set<Component|InlineComponent>()
    public componentsToCallOnUnmount =  new Set<Component|InlineComponent>()

    constructor(public content: DocumentContent, globalState: GlobalState, history?: DocumentContentHistory ) {
        super()
        this.globalState = globalState
        this.history = history
        this.state = new ReactiveViewState(this)

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
        // FIXME prepend 出错
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
        // 可能不是 body 上的 dom 操作。
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
        // 这样就能让空的 text node 也能有光标。
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
    // CAUTION 浏览器的默认行为和预期有点不一致：
    //  1. chrome/safari 如果 startOffset 是 0，并且有上一个节点，那么插入的数据变成了上一个节点的最后面，而不是 startText
    //  2. firefox 是不删除 startText, 插入到 startText 中，并且不合并 endText。
    //  结论是我们统一行为，不管 startOffset 是多少，都插入到 startText 中。
    updateRange(range: DocRange, replaceTextValue = '', dontMergeBlock = false) {
        const { startBlock, startText, startOffset, endBlock, endText, endOffset } = range
        // 1. 先更新大的 block 和 inline 结构
        if (range.isInSameBlock ) {
            if (!range.isInSameInline&& !range.isSibling) {
                this.content.deleteBetween(startText.next!, endText, startBlock)
            }
        } else {
            // 跨越 block 的输入
            if (startText.next) {
                this.content.deleteBetween(startText.next!, null, startBlock)
            }
            const remainEndFragment = this.content.deleteBetween(endText, null, endBlock)
            // 删除中间和结尾的的 block
            this.content.deleteBetween(startBlock.next!, endBlock.next, this.content)

            // 如果有剩余的 fragment，插入到 startBlock 后面
            // TODO 还要判断是不是 endText 也删完了。
            if (remainEndFragment) {
                if (!dontMergeBlock) {
                    this.append(remainEndFragment, startText, startBlock)
                } else {
                    // 创建个新的 para
                    const newPara = this.content.createParagraph(remainEndFragment)
                    this.append(newPara, startBlock, this.content)
                }
            }
        }

        // 2. 再更新 startText 和 endText 的值
        if (range.isInSameInline) {
            const newTextValue = startText.data.value.slice(0, startOffset) + replaceTextValue + startText.data.value.slice(endOffset)
            this.updateText(newTextValue, startText)
        } else {
            const newStartTextValue = startText.data.value.slice(0, startOffset) + replaceTextValue
            const newEndTextValue = endText.data.value.slice(endOffset)

            // CAUTION 分开更新才是正确的。因为加入 startText 上面有 format，那么合并进来的 endText 也会带上，这就不符合预期了。
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
        const canUseDefaultBehaviorInBackspace = !SHOULD_RESET_CURSOR_AFTER_BACKSPACE &&
            !(e instanceof KeyboardEvent && e.key === 'Backspace' && isCollapsed && startOffset < 2 && startText.data.value.length < 2)


        // CAUTION 特别注意，这里能这么判断是因为 docRange 在创建的时候已经把 focus 在上个节点尾部和下个节点头部之类的特殊情况抹平了。
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
    inputOrReplaceWithChar ( e: KeyboardEvent) {
        const range = this.state.selectionRange()!
        const {startText,startBlock,  startOffset, endText, endOffset, isCollapsed, isInSameInline} = range

        const succeed = this.tryUseDefaultBehaviorForRange(range, e)

        this.updateRange(range, e.key)

        this.resetUseDefaultBehavior()
        this.dispatch(new CustomEvent(INPUT_CHAR_EVENT, {detail: e.key}))

        return {
            shouldSetRange: !succeed,
            range: DocRange.cursor(startBlock, startText, startOffset + 1)
        }
    }
    @saveHistoryPacket
    @setEndRange
    deleteRangeForReplaceWithComposition(e: KeyboardEvent) {
        const range = this.state.selectionRange()!
        // CAUTION 因为不能通过 e.preventDefault 阻止默认行为，所以这里通过手动设置 cursor 的方式阻止
        this.setCursor(range.startText, range.startOffset)
        this.updateRange(range, '')

        // CAUTION 这里要重新 set cursor 是因为 range 可能删除完了，这时候要把 cursor 调整到 ZWSP 后面。
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

    // CAUTION 如果  range 刚好删完了 startText，
    //  chrome 的行为是新增字符在后面 Text 的头部
    //  firefox/safari 是在前面 Text 的尾部
    //  我们统一行为，不删 startText，不合并 endText
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
                // 头也没有文字了，删除掉
                this.content.deleteBetween(range.startText, range.startText.next, range.startBlock)
            }
        }

        return { shouldSetRange: !succeed, range: DocRange.cursor(endCursorBlock!, endCursorText as Text, endCursorOffset)}
    }


    @saveHistoryPacket
    @setEndRange
    deleteLast(e: KeyboardEvent) {
        console.log(11111, this.globalState.selectionRange?.startContainer, this.globalState.selectionRange?.startOffset)
        const range = this.state.selectionRange()!
        const { startText, startOffset, startBlock } = range
        // 文章开头，不做任何操作
        let endCursorBlock
        let endCursorText
        let endCursorOffset

        // 1. 在 text 的中间删除，可以尝试使用默认行为
        if (startOffset !== 0) {
            const succeed = this.tryUseDefaultBehaviorForRange(range, e)
            const nextRange = this.deleteLastChar()
            this.resetUseDefaultBehavior()
            return { shouldSetRange: !succeed, range: nextRange}
        }

        // 下面的全部不用默认行为
        e.preventDefault()

        // 2. 在段落头部(!startText.prev() && startOffset === 0)
        if (!startText.prev()) {
            // 2.1 如果自己有 unwrap
            if ((startBlock.constructor as typeof Block).unwrap) {
                // 1.2.1 这个 block 有 unwrap 方法，那么调用 unwrap 方法
                // heading/listItem 之类的在头部删除会变成 paragraph
                const newPara = (startBlock.constructor as typeof Block).unwrap!(this.content, startBlock)
                endCursorBlock = newPara
                endCursorText = newPara.firstChild as Text
                endCursorOffset = 0
                return { shouldSetRange: true, range: DocRange.cursor(endCursorBlock!, endCursorText! as Text, endCursorOffset!)}

            }

            // 2.2. 前面没有了，什么也不发生
            if (!startBlock.prev()) return { shouldSetRange: true, range }


            // 2.3. 如果上一个是 Component
            if (startBlock.prev() instanceof Component) {
                this.content.deleteBetween(startBlock.prev()!, startBlock, this.content)
                return { shouldSetRange: true, range }
            }

            // 2.4. 如果上一个段落是空段落。
            if (startBlock.prev() instanceof Paragraph && (startBlock.prev() as Paragraph).isEmpty) {
                // 删除上一个空的 Para
                this.content.deleteBetween(startBlock.prev()!, startBlock, this.content)
                return { shouldSetRange: true, range }
            }

            // 2.5. 上一个段落是非空段落或者其他与 Para 兼容的 block。（不兼容的需要继承 Component）
            // 2.5.1. 自己是 Component，等同与 focus 到上个段落的极为
            if(startBlock instanceof Component) {
                return { shouldSetRange: true, range: DocRange.cursor(startBlock.prev()!, startBlock.prev()?.lastChild! as Text, Infinity)}
            }

            // 2.5.2. 自己是普通的 block，都是可以兼容的。那么把自己的内容移到上一个段落
            if(startBlock.prev()){
                const isStartBlockEmptyPara = (startBlock instanceof Paragraph) &&  (startBlock as Paragraph).isEmpty
                const previousBlock = startBlock.prev()!
                this.content.deleteBetween(startBlock, startBlock.next, this.content)
                const inlineFrag = this.content.deleteBetween(startBlock.firstChild!, null, startBlock)
                const previousBlockLastChild = previousBlock.lastChild!
                if(!isStartBlockEmptyPara){
                    // 如果自己是 empty para，那么自己的 空 Text 不要插入到上面去
                    this.append(inlineFrag, previousBlock.lastChild!, previousBlock)
                }
                endCursorBlock = previousBlock
                endCursorText = previousBlockLastChild
                endCursorOffset = previousBlockLastChild.data.value.length
            }

            return { shouldSetRange: true, range: DocRange.cursor(endCursorBlock!, endCursorText! as Text, endCursorOffset!)}
        }


        // 3. 在非段落头部，但仍然是 startOffset === 0 的情况
        //  CAUTION 能 focus 在 0 说明上一个节点一定是 InlineComponent，因为如果是 Text，就会自动 focus 到上个节点尾部。
        //   自身一定是 Text，InlineComponent 的内部 focus 我们不管理。
        assert(startText.prev() instanceof InlineComponent, 'prev should only be InlineComponent when startOffset === 0')
        // 上一个节点是 InlineComponent，直接删除
        this.content.deleteBetween(startText.prev()!, startText, startBlock)
        // 转移到上一个 Text 结尾
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
            // 文字中间
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
            // 处理 startText 也变空的问题
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
    changeLevel () {
        // TODO
        return null
    }

    @saveHistoryPacket
    @setEndRange
    formatCurrentRange(formatData: FormatData) {
        const currentRange = this.state.selectionRange()!
        const [firstFormattedText, lastFormattedText] = this.formatRange(currentRange, formatData)
        // 重置 range
        return {shouldSetRange:true, range: new DocRange(currentRange.startBlock, firstFormattedText, 0, currentRange.endBlock, lastFormattedText, lastFormattedText.data.value.length)}
    }

    render() {
        this.element = (
            <div
                spellcheck={false}
                contenteditable
                onKeydown={[
                    // CAUTION 这里用 this.onSelfView 是为了判断这个事件是不是属于当前的 view。因为我们有嵌套。
                    onNotPreventedDefault(onNotComposing(this.onSelfView(onCharKey(this.inputOrReplaceWithChar.bind(this))))),
                    onNotPreventedDefault(onComposing(this.onRangeNotCollapsed(this.deleteRangeForReplaceWithComposition.bind(this)))),

                    onNotPreventedDefault(onNotComposing(this.onRangeNotCollapsed(onBackspaceKey(this.deleteRange.bind(this))))),
                    onNotPreventedDefault(onNotComposing(this.onRangeCollapsed(onBackspaceKey(this.deleteLast.bind(this))))),

                    onNotPreventedDefault(onNotComposing(this.onRangeCollapsed(onEnterKey(this.splitContent.bind(this))))),
                    onNotPreventedDefault(onNotComposing(this.onRangeNotCollapsed(onEnterKey(this.deleteRangeWithoutMerge.bind(this))))),

                    onNotPreventedDefault(onNotComposing(onTabKey(this.changeLevel.bind(this)))),
                    // 有 range 时的输入法开始处理，等同于先删除 range
                    onNotPreventedDefault(onNotComposing(onKey('a', {meta:true})(this.selectAll.bind(this)))),
                    // onNotComposing(onKey('x', {meta:true})(this.copy.bind(this))),
                    // onNotComposing(onKey('c', {meta:true})(this.cut.bind(this))),
                    onNotPreventedDefault(onNotComposing(onKey('z', {meta:true})(this.undo.bind(this)))),
                ]}
                onPaste={this.onSelfView(this.paste.bind(this))}
                onCut={this.onSelfView(this.cut.bind(this))}
                onCopy={this.onSelfView(this.copy.bind(this))}
                // CAUTION 这里用 this.onRangeCollapsed 是为了判断这个事件是不是属于当前的 view。因为我们有嵌套。
                onCompositionEndCapture={this.onSelfView(this.inputComposedData.bind(this))}
                // safari 的 composition 是在 keydown 之前的，必须这个时候 deleteRange
                onCompositionStartCapture={this.onRangeNotCollapsed(this.deleteRangeForReplaceWithComposition.bind(this))}
            >
                {this.renderBlockList(this.content.firstChild!)}
            </div>
        ) as HTMLElement

        return this.element
    }
    // 这个函数被外部手动调用。用户可以自己决定什么时候把 element append 到 document 上。
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
    // TODO 真正才从内存 history 里面销毁的时候调用，不然元素还是可以留着复用。
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

    // deleteRangeForComposition 是 replace，要允许 allowOffset0
    createDocRange(range: Range){
        // CAUTION 为了统一所有浏览器的行为，这里创造出来的 docRange 和实际的 dom Range 不一致。
        //  1. cursor 在空节点里面是自动调整到 ZWSP 的后面，所以允许是 0。
        //  2. cursor 默认 focus 到上一个文字的尾部.
        //  3. range 默认头部是自己的，尾部也是自己的
        const { startContainer, startOffset, endContainer, endOffset, collapsed } = range
        const startContainerText = this.findFirstTextFromElement(startContainer)!
        const endContainerInline = this.findFirstTextFromElement(endContainer)
        // setNativeCursor 时会调用 removeAllRange，会触发 range 重新计算，此时是不合法的。
        if (!startContainerText || !endContainerInline) return null

        let startText = startContainerText
        let endInline = endContainerInline
        let docStartOffset = startOffset
        let docEndOffset = endOffset
        if (collapsed) {
            if (startOffset === 1 && startText.isEmpty) {
                //  1. cursor 在空节点里面是自动调整到 ZWSP 的后面，所以允许是 0。
                docStartOffset = 0
                docEndOffset = 0
            } else if (startOffset === 0 && !startText.isEmpty && startContainerText.prev() instanceof Text) {
                //  2. cursor 默认 focus 到上一个文字的尾部.
                startText = startContainerText.prev() as Text
                docStartOffset = startText.data.value.length
                endInline = startText
                docEndOffset = docStartOffset
            }
        } else {
            // 3. range 默认头部是自己的，尾部也是自己的
            // 如果 startOffset 定位到了上个节点的尾部，我们要把它修正回来。
            if (startOffset!==0 && startOffset === startContainerText.data.value.length && startContainerText.next instanceof Text) {
                startText = startContainerText.next
                docStartOffset = 0
            }

            // 如果 endOffset 定位到了下个节点的尾部，我们要把它修正回来。
            if (endOffset === 0 && endContainerInline?.prev() instanceof Text) {
                endInline = endContainerInline.prev() as Text
                docEndOffset = endInline.data.value.length
            }

            // 因为我们会在空节点里面插入一个 ZWSP，这个时候可能 endOffset 会是 1，所以也要修正回来
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
        // CAUTION 注意这里的写法，一定要先判断 range 是存在的。不然 InlineComponent 里面的行为也会被捕获
        return !!this.state.selectionRange() && !this.state.selectionRange()!.isCollapsed
    })
    onRangeCollapsed = eventAlias<any>(() => {
        // CAUTION 注意这里的写法，一定要先判断 range 是存在的。不然 InlineComponent 里面的行为也会被捕获
        return !!this.state.selectionRange() && this.state.selectionRange()!.isCollapsed
    })
    onSelfView = eventAlias<any>(() => {
        return !!this.state.selectionRange()
    })
    /**
     * 下面是 Utils
     **/
    selectAll(e: KeyboardEvent) {
        e.stopPropagation()
        e.preventDefault()
        const { isInSameBlock, startBlock, startText, endText, isFullBlock } = this.state.selectionRange()!
        if (!isInSameBlock || isFullBlock) {
            // 选中全文
            this.setRange(new DocRange(this.content.firstChild!, this.content.firstChild!.firstChild as Text, 0, this.content.lastChild!, this.content.lastChild!.lastChild as Text, Infinity))
        } else {
            // 选中完整的 block
            this.setRange(new DocRange(startBlock, startBlock.firstChild as Text, 0, startBlock, startBlock.lastChild as Text, Infinity))
        }
    }
    setCursor(docNode: DocNode, offset: number) {
        // FIXME 没考虑 InlineComponent 和 Component
        const isNodeBlock = docNode instanceof Block
        const focusText = isNodeBlock ? (docNode as Block)[offset === 0 ? 'firstChild' : 'lastChild'] as Text : docNode as Text
        const element = this.docNodeToElement.get(focusText)!
        // 可能是个空的所以没有 text child
        const startContainer = element.firstChild || element
        // CAUTION 注意这里，如果是空节点，会渲染出一个 ZWSP，要调整到这个后面，不然有的浏览器就回自动插入到上一元素的末尾。
        const startOffset = focusText.isEmpty ?
            1 :
            (offset === Infinity ? focusText.data.value.length : offset)
        setNativeCursor(startContainer as HTMLElement, startOffset)
        console.log("api setting cursor", focusText, startContainer, startOffset)
    }
    setRange(docRange: DocRange) {
        const startContainer = this.docNodeToElement.get(docRange.startText)!.firstChild!
        // CAUTION 注意这里，如果是空节点，会渲染出一个 ZWSP，要调整到这个后面，不然有的浏览器就回自动插入到上一元素的末尾。
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
            // 头部的
            const startBlockRange = new DocRange(
                startBlock,
                startText,
                startOffset,
                startBlock,
                startBlock.lastChild as Text,
                startBlock.lastChild!.data.value.length
            );
            firstFormattedText = this.formatRange(startBlockRange, formatData)[0]
            // 尾部的
            const endBlockRange = new DocRange(
                endBlock,
                endBlock.firstChild as Text,
                0,
                endBlock,
                endText,
                endOffset
            )
            lastFormattedText = this.formatRange(endBlockRange, formatData)[1]

            // 中间的
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
    paste(e: ClipboardEvent) {
        // TODO 根据是否有 shift  key 来决定是粘贴纯文本还是格式化的内容。
        e.preventDefault()

        const range = this.state.selectionRange()!
        const {startText, startBlock, isCollapsed, startOffset} = range

        // 先清理完 selection
        if (!isCollapsed) {
            this.updateRange(range, '')
        }
        if (startOffset !== startText.data.value.length) {
            this.splitText(startText, startOffset, startBlock)
        }

        // CAUTION 特别注意，由于上面对 range 进行了操作，所以下面始终只能使用 startText/startBlock，因为 endText/endBlock 很可能已经变了

        if(e.clipboardData?.types.includes('text/miditor')){

            const data = JSON.parse(e.clipboardData.getData('text/miditor')) as BlockData[]
            if (data.length === 0) return
            if (data.length === 1) {
                // inline
                const head = DocumentContent.createInlinesFromData(data[0].content, this.content.types)
                const frag = new DocNodeFragment(head)
                const lastInFrag = frag.tail as Text
                this.append(frag, startText, startBlock)
                return { shouldSetRange: true, range: DocRange.cursor(startBlock, lastInFrag, Infinity)}

            } else {
                const headParaFrag = new DocNodeFragment(DocumentContent.createInlinesFromData(data[0].content, this.content.types))
                const endParaFrag = new DocNodeFragment(DocumentContent.createInlinesFromData(data.at(-1)!.content, this.content.types))
                const middleBlockFrag = data.slice(1, -1).length ? new DocNodeFragment(DocumentContent.createBlocksFromData(data.slice(1, -1), this.content.types)) : null


                let afterCursorFrag = startText.next ? this.content.deleteBetween(startText.next, null, startBlock) : null

                // 1. 先处理头部的合并
                if (startText.isEmpty) {
                    //replace 掉这个空节点
                    this.replace(headParaFrag, startText, startBlock)
                }else {
                    // append 到后面
                    this.append(headParaFrag, startText, startBlock)
                }

                // 2. 处理结尾。创建新的 Para
                const newPara = this.content.createParagraph(endParaFrag)
                const lastInNewPara = newPara.lastChild as Text
                this.append(newPara, startBlock, this.content)
                if (afterCursorFrag) {
                    this.append(afterCursorFrag, newPara.lastChild!, newPara)
                }

                // 3. 因为中间可能有 Component，我们用 append 的时候会自动在后面价格空的 Para。而这里不需要，因为一定有后面的 Para
                if (middleBlockFrag) {
                    this.append(middleBlockFrag, startBlock, this.content)
                }

                return { shouldSetRange: true, range: DocRange.cursor(newPara, lastInNewPara, Infinity)}
            }



        } else {
            const range = this.state.selectionRange()!
            const dataToPaste = e.clipboardData!.getData('text/plain')
            this.updateRange(this.state.selectionRange()!, dataToPaste)
            return {
                shouldSetRange: true,
                range: DocRange.cursor(range.startBlock, range.startText, range.startOffset + dataToPaste.length)
            }
        }
        // TODO 解析  DOM 内容?
        // const domparser = new DOMParser()
        // const result = domparser.parseFromString(e.clipboardData!.getData('text/html'), 'text/html')
        // console.log(result)

    }
    @saveHistoryPacket
    @setEndRange
    cut(e: ClipboardEvent) {
        e.preventDefault()
        const range = this.state.selectionRange()!
        const rangeData = JSON.stringify(range.toJSON())
        e.clipboardData!.setData('text/miditor', rangeData)
        // 存一下纯文字版本？
        e.clipboardData!.setData('text/plain', range.toText())

        this.updateRange(this.state.selectionRange()!, '')
        return {
            shouldSetRange: true,
            range: DocRange.cursor(range.startBlock, range.startText, range.startOffset)
        }
    }
    copy(e: ClipboardEvent) {
        e.preventDefault()
        console.log('copy', e)
        const range = this.state.selectionRange()!
        const rangeData = JSON.stringify(range.toJSON())
        e.clipboardData!.setData('text/miditor', rangeData)
        // 存一下纯文字版本？
        e.clipboardData!.setData('text/plain', range.toText())
    }
    undo(e: KeyboardEvent) {
        e.preventDefault()
        this.history?.undo()
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
    deleteLastChar() {
        const range = this.state.selectionRange()!
        const { startText, startOffset, startBlock } = range
        // 文章开头，不做任何操作
        let endCursorBlock = startBlock
        let endCursorText = startText
        let endCursorOffset = startOffset - 1

        if (startText.data.value.length === 1 && startText.prev() instanceof Text) {
            // 不管前面是什么，都设置到末尾
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
            newBlock = Type.createEmpty()
        } else {
            newBlock = this.content.createParagraph()
        }


        // cursor 在段尾，产生一个新的空的 para
        if (!inline) {
            this.append(newBlock, block, this.content)
            return newBlock
        }

        // cursor 在段首，上面产生一个新的 Para
        if (!inline.prev()) {
            this.prepend(newBlock, block, this.content)
            return block
        }

        // 在中间
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
    // 相比 content 的 api，下面 View 的同名 api 会自动检查是否需要在头部尾部增加 ZWSP 或者空 Para。
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
        // FIXME deleteBetween 之后也要考虑是否需要增加 ZWSP 和空 Para
        return this.content.deleteBetween(...args)
    }
    updateText(...args: Parameters<DocumentContent["updateText"]>) {
        return this.content.updateText(...args)
    }
    formatText(...args: Parameters<DocumentContent["formatText"]>) {
        return this.content.formatText(...args)
    }
    destroy() {
        // TODO 销毁 ReactiveState 中的监听？
    }
}




const onNotComposing = eventAlias((e: KeyboardEvent) => !(e.isComposing || e.keyCode === 229))
const onComposing = eventAlias((e: KeyboardEvent) => e.isComposing || e.keyCode === 229)
const onNotPreventedDefault = eventAlias((e: KeyboardEvent) => !e.defaultPrevented)

const onCharKey = eventAlias((e: KeyboardEvent) => e.key.length === 1 && !e.altKey  && !e.metaKey && !e.ctrlKey)


function insertAfter(newEle: HTMLElement|DocumentFragment|Comment, refEle: HTMLElement) {
    refEle.parentElement?.insertBefore(newEle, refEle.nextElementSibling!)
}

function insertBefore(newEle: HTMLElement|DocumentFragment|Comment, refEle: HTMLElement) {
    refEle.parentElement?.insertBefore(newEle, refEle)
}



