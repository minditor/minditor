import {atom, createElement, eventAlias, onBackspaceKey, onEnterKey, onTabKey} from 'axii'
import {
    Block,
    BlockData,
    DocNode,
    DocNodeFragment,
    DocumentContent,
    EmitData,
    FormatData,
    Inline, Paragraph, Text
} from "./DocumentContent.js";
import {
    assert,
    nextTask,
    setNativeCursor, setNativeRange,
    SHOULD_FIX_OFFSET_LAST,
    SHOULD_RESET_CURSOR_AFTER_BACKSPACE,
    ZWSP
} from "./util";
import {ReactiveViewState} from "./ReactiveViewState.js";
import {EventDelegator} from "./EventDelegator";
import {GlobalState} from "./globals.js";
import {DocumentContentHistory} from "./DocumentContentHistory.js";


type CallbackType = (...arg: any[]) => any


export const CONTENT_RANGE_CHANGE = 'contentrangechange'


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
        this.debugJSONContent(this.doc.toJSON())
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
    public debugJSONContent = atom<BlockData>(null)

    constructor(public doc: DocumentContent, globalState: GlobalState, history?: DocumentContentHistory ) {
        super()
        this.globalState = globalState
        this.history = history
        this.state = new ReactiveViewState(this)

        this.doc.on('append', this.patchAppend.bind(this))
        this.doc.on('prepend', this.patchPrepend.bind(this))
        this.doc.on('replace', this.patchReplace.bind(this))
        this.doc.on('deleteBetween', this.patchDeleteBetween.bind(this))
        this.doc.on('updateText', this.patchUpdateText.bind(this))
        this.doc.on('formatText', this.patchFormatText.bind(this))
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

    }
    @preventPatchIfUseDefaultBehavior
    patchPrepend ({ args }: EmitData<Parameters<DocumentContent["prepend"]>, ReturnType<DocumentContent["prepend"]>>) {
        // FIXME prepend 出错
        const [docNode, ref] = args
        const refElement = this.docNodeToElement.get(ref)!as HTMLElement
        const element = this.renderDocNodeOrFragment(docNode)
        insertBefore(element!, refElement)
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
                this.doc.deleteBetween(startText.next!, endText, startBlock)
            }
        } else {
            // 跨越 block 的输入
            if (startText.next) {
                this.doc.deleteBetween(startText.next!, null, startBlock)
            }
            const remainEndFragment = this.doc.deleteBetween(endText, null, endBlock)
            // 删除中间和结尾的的 block
            this.doc.deleteBetween(startBlock.next!, endBlock.next, this.doc)

            // 如果有剩余的 fragment，插入到 startBlock 后面
            // TODO 还要判断是不是 endText 也删完了。
            if (remainEndFragment) {
                if (!dontMergeBlock) {
                    this.doc.append(remainEndFragment, startText, startBlock)
                } else {
                    // 创建个新的 para
                    const newPara = this.doc.createParagraph(remainEndFragment)
                    this.doc.append(newPara, startBlock, this.doc)
                }
            }
        }

        // 2. 再更新 startText 和 endText 的值
        if (range.isInSameInline) {
            const newTextValue = startText.data.value.slice(0, startOffset) + replaceTextValue + startText.data.value.slice(endOffset)
            this.doc.updateText(newTextValue, startText)
        } else {
            const newStartTextValue = startText.data.value.slice(0, startOffset) + replaceTextValue
            const newEndTextValue = endText.data.value.slice(endOffset)

            // CAUTION 分开更新才是正确的。因为加入 startText 上面有 format，那么合并进来的 endText 也会带上，这就不符合预期了。
            this.doc.updateText(newStartTextValue, startText)

            if (newEndTextValue.length) {
                this.doc.updateText(newEndTextValue, endText)
            } else {
                this.doc.deleteBetween(endText, endText.next, endBlock)
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
    splitByInline(block: Block, inline: Inline|null) {

        let newBlock: Block

        const currentType = block.constructor as typeof Block
        if (currentType.splitAsSameType) {
            const Type = block.constructor as typeof Block
            newBlock = Type.createEmpty()
        } else {
            newBlock = this.doc.createParagraph()
        }


        // cursor 在段尾，产生一个新的空的 para
        if (!inline) {
            this.doc.append(newBlock, block, this.doc)
            return newBlock
        }

        // cursor 在段首，上面产生一个新的 Para
        if (!inline.prev()) {
            this.doc.prepend(newBlock, block, this.doc)
            return block
        }

        // 在中间
        const inlineFrag = this.doc.deleteBetween(inline, null, block)
        this.doc.replace(inlineFrag, newBlock.firstChild!, newBlock)

        this.doc.append(newBlock, block, this.doc)
        return newBlock
    }
    splitText(text:Text, offset: number, block: Block) {
        const originValue = text.data.value
        this.doc.updateText(originValue.slice(0, offset), text)
        const splitInline = new Text({value: originValue.slice(offset)})
        this.doc.append(splitInline, text, block)
        return splitInline
    }
    @saveHistoryPacket
    @setEndRange
    inputOrReplaceWithChar ( e: KeyboardEvent) {
        const range = this.state.selectionRange()!
        const {startText,startBlock,  startOffset, endText, endOffset, isCollapsed, isInSameInline} = range

        const succeed = this.tryUseDefaultBehaviorForRange(range, e)

        this.updateRange(range, e.key)

        this.resetUseDefaultBehavior()

        this.dispatch(new CustomEvent('inputChar', {detail: e.key}))

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

        this.dispatch(new CustomEvent('inputChar', {detail: e.data}))

        return {
            shouldSetRange: true,
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
                this.doc.deleteBetween(range.startText, range.startText.next, range.startBlock)
            }
        }

        return { shouldSetRange: !succeed, range: DocRange.cursor(endCursorBlock!, endCursorText as Text, endCursorOffset)}
    }
    @saveHistoryPacket
    @setEndRange
    deleteLast(e: KeyboardEvent) {
        const range = this.state.selectionRange()!
        const { startText, startOffset, startBlock } = range
        // 文章开头，不做任何操作
        let endCursorBlock
        let endCursorText
        let endCursorOffset

        const succeed = this.tryUseDefaultBehaviorForRange(range, e)
        if (startOffset === 0) {
            // 理论上不会发生前面还有text，但当前是 offset 0 的情况，因为我们默认只能选中文字的尾部。
            assert(!(startText.prev() instanceof Text), 'should not happen')
            if (!startText.prev()) {
                if (startBlock.prev() instanceof Paragraph && (startBlock.prev() as Paragraph).isEmpty) {
                    // 删除上一个空的 Para
                    this.doc.deleteBetween(startBlock.prev()!, startBlock, this.doc)
                } else {
                    if ((startBlock.constructor as typeof Block).unwrap) {
                        // heading/listItem 之类的在头部删除会变成 paragraph
                        const newPara = (startBlock.constructor as typeof Block).unwrap!(this.doc, startBlock)
                        endCursorBlock = newPara
                        endCursorText = newPara.firstChild as Text
                        endCursorOffset = 0
                    } else if(startBlock.prev()){
                        // 往上合并
                        // FIXME 判断 paragraph 之类的能不能合并
                        // CAUTION 这里不用考虑 startBlock 是 Component 的情况，因为 Component 无法 focus 在头部
                        const previousBlock = startBlock.prev()!
                        // CAUTION  先把 block detach，再去操作 inline，性能高点
                        this.doc.deleteBetween(startBlock, startBlock.next, this.doc)
                        const inlineFrag = this.doc.deleteBetween(startBlock.firstChild!, null, startBlock)
                        const previousBlockLastChild = previousBlock.lastChild!
                        this.doc.append(inlineFrag, previousBlock.lastChild!, previousBlock)
                        endCursorBlock = previousBlock
                        endCursorText = previousBlockLastChild
                        endCursorOffset = previousBlockLastChild.data.value.length
                    }
                }

            } else {
                // TODO 删除删一个 InlineComponent
                //  如果只有一个组件，那么还要生成一个空的 Text
            }
        } else {
            if (startText.data.value.length === 1) {
                if (startText.prev()) {
                    // 不管前面是什么，都设置到末尾
                    endCursorBlock = startBlock
                    endCursorText = startText.prev()!
                    endCursorOffset = Infinity
                    this.doc.deleteBetween(startText, startText.next, startBlock)
                } else {
                    this.doc.updateText('', startText)
                }
            } else {
                this.doc.updateText(startText.data.value.slice(0, startOffset - 1) + startText.data.value.slice( startOffset), startText)
                if (!succeed) {
                    endCursorBlock = startBlock
                    endCursorText = startText
                    endCursorOffset = startOffset - 1
                }
            }
        }

        this.resetUseDefaultBehavior()

        return { shouldSetRange: !succeed, range: DocRange.cursor(endCursorBlock!, endCursorText! as Text, endCursorOffset!)}
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
                this.doc.deleteBetween(startText, startText.next, startBlock)
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
    render() {
        this.element = (
            <div
                spellcheck={false}
                contenteditable
                onKeydown={[
                    onNotComposing(onCharKey(this.inputOrReplaceWithChar.bind(this))),
                    onComposing(this.onRangeNotCollapsed(this.deleteRangeForReplaceWithComposition.bind(this))),

                    onNotComposing(this.onRangeNotCollapsed(onBackspaceKey(this.deleteRange.bind(this)))),
                    onNotComposing(this.onRangeCollapsed(onBackspaceKey(this.deleteLast.bind(this)))),

                    onNotComposing(this.onRangeCollapsed(onEnterKey(this.splitContent.bind(this)))),
                    onNotComposing(this.onRangeNotCollapsed(onEnterKey(this.deleteRangeWithoutMerge.bind(this)))),

                    onNotComposing(onTabKey(this.changeLevel.bind(this))),
                    // 有 range 时的输入法开始处理，等同于先删除 range
                ]}
                onCompositionEndCapture={this.inputComposedData.bind(this)}
                // safari 的 composition 是在 keydown 之前的，必须这个时候 deleteRange
                onCompositionStartCapture={this.onRangeNotCollapsed(this.deleteRangeForReplaceWithComposition.bind(this))}
            >
                {this.renderBlockList(this.doc.firstChild!)}
            </div>
        ) as unknown as HTMLElement

        // FIXME 好像还是得知道具体的 append to document 的时机，不然有时候 IntersectionObserver 可能会出问题
        nextTask(() => {
            this.bindElement(this.element!)
        })

        return this.element
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
        const startOffset = docRange.startText.isEmpty ? 1 : docRange.startOffset
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

                this.doc.formatText(formatData, toFormatInline)
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
                        this.doc.formatText(formatData, currentInline )
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
    formatCurrentRange(formatData: FormatData) {
        const currentRange = this.state.selectionRange()!
        const [firstFormattedText, lastFormattedText] = this.formatRange(currentRange, formatData)
        // 重置 range
        return {shouldSetRange:true, range: new DocRange(currentRange.startBlock, firstFormattedText, 0, currentRange.endBlock, lastFormattedText, lastFormattedText.data.value.length)}
    }
    get boundaryContainer() {
        return this.element?.parentElement
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
            } else if (startOffset === 0 && !startText.isEmpty && startContainerText.prev() instanceof Text) {
                //  2. cursor 默认 focus 到上一个文字的尾部.
                startText = startContainerText.prev() as Text
                docStartOffset = startText.data.value.length
                endInline = startText
                docEndOffset = docStartOffset
            }
        } else {
            // 3. range 默认头部是自己的，尾部也是自己的
            if (startOffset!==0 && startOffset === startContainerText.data.value.length && startContainerText.next instanceof Text) {
                startText = startContainerText.next
                docStartOffset = 0
            }

            if (endOffset === 0 && endContainerInline?.prev() instanceof Text) {
                endInline = endContainerInline.prev() as Text
                docEndOffset = endInline.data.value.length
            }
        }

        const startBlock = this.findFirstBlockFromElement(this.docNodeToElement.get(startText!)!)
        const endBlock = this.findFirstBlockFromElement(this.docNodeToElement.get(endInline!)!)
        return new DocRange(startBlock!, startText!, docStartOffset, endBlock!, endInline!, docEndOffset)
    }
    onRangeNotCollapsed = eventAlias<KeyboardEvent>(() => {
        return this.globalState.selectionRange?.collapsed === false
    })
    onRangeCollapsed = eventAlias<KeyboardEvent>(() => {
        return this.globalState.selectionRange?.collapsed === true
    })
}

const onNotComposing = eventAlias((e: KeyboardEvent) => !(e.isComposing || e.keyCode === 229))
const onComposing = eventAlias((e: KeyboardEvent) => e.isComposing || e.keyCode === 229)

const onCharKey = eventAlias((e: KeyboardEvent) => e.key.length === 1 && !e.altKey  && !e.metaKey && !e.ctrlKey)



function insertAfter(newEle: HTMLElement|DocumentFragment|Comment, refEle: HTMLElement) {
    refEle.parentElement?.insertBefore(newEle, refEle.nextElementSibling!)
}

function insertBefore(newEle: HTMLElement|DocumentFragment|Comment, refEle: HTMLElement) {
    refEle.parentElement?.insertBefore(newEle, refEle)
}



export class DocRange {
    static cursor(startBlock: Block,  startText: Text,  startOffset: number,) {
        return new DocRange(startBlock, startText, startOffset, startBlock, startText, startOffset)
    }
    constructor(public startBlock: Block, public startText: Text, public startOffset: number, public endBlock: Block, public endText: Text, public endOffset: number) {}
    get isCollapsed() {
        return this.startText === this.endText && this.startOffset === this.endOffset
    }
    get isInSameBlock() {
        return this.startBlock === this.endBlock
    }
    get isInSameInline() {
        return this.startText === this.endText
    }
    get isSibling() {
        return this.startText.next === this.endText
    }
    get isFull() {
        return this.startOffset === 0 && this.endOffset === this.endText.data.value.length
    }
    get isEndFull() {
        return this.endOffset === this.endText.data.value.length
    }
}