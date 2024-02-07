import {createElement, eventAlias, Host} from 'axii'
import {
    Block,
    DocumentContent,
    FormatData,
    Inline,
    Text,
    DocNode,
    EmitData,
    DocNodeFragment
} from "./DocumentContent.js";
import {nextTask, setNativeCursor, setNativeRange} from "./util";
import {ReactiveState} from "./ReactiveState";
import {EventDelegator} from "./EventDelegator";


type CallbackType = (...arg: any[]) => any


const ZWSP =  '​'

export const CONTENT_RANGE_CHANGE = 'contentrangechange'



export class DocumentContentView extends EventDelegator{
    public element?: HTMLElement
    public textNodeToElement = new WeakMap<Text, HTMLElement>()
    public docNodeToBlockUnit = new WeakMap<DocNode, HTMLElement>()
    public blockUnitToDocNode: WeakMap<HTMLElement, DocNode> = new WeakMap()
    public state: ReactiveState
    constructor(public doc: DocumentContent) {
        super()
        this.state = new ReactiveState(this)

        this.doc.on('append', this.patchAppend)
        this.doc.on('prepend', this.patchPrepend)
        this.doc.on('replace', this.patchReplace)
        this.doc.on('deleteBetween', this.patchDeleteBetween)
        this.doc.on('updateText', this.patchText)
    }
    patchAppend = ({ args }: EmitData) => {
        const [docNode, ref] = args
        if (docNode instanceof Block) {
            // render 一个 block
            if (!docNode.element) {
                docNode.element = this.renderBlock(docNode)
            }
            insertAfter(docNode.element, ref.element!)
        } else {
            // render 多个 block，包装在 DocNodeFragment 里面
            if (!docNode.element) {
                docNode.element = this.renderBlockList(docNode.head!)
                insertAfter(docNode.element, ref.element!)
            }
            // FIXME 一旦 DocumentFragment 被 append 了，里面的元素就没了，这个时候要重置一下。
            //   这里还要再想清楚一点，会不会有 里面的 DocNode 有 element，但是 DocumentFragment 没有 element 的情况。
            insertAfter(docNode.element, ref.element!)
        }
    }
    patchPrepend = () => {

    }
    patchReplace= () =>  {

    }
    patchDeleteBetween= () =>  {

    }

    patchText= ({ args}: EmitData) =>  {
        const [text] = args
        const element = this.textNodeToElement.get(text)!
        element.textContent = text.value
    }

    renderInlineList(head: Inline) {
        const result = document.createDocumentFragment()
        let current = head
        while (current) {
            result.appendChild(current.renderElement())
            current = current.nextSibling!
        }
        return result
    }
    renderBlock(block: Block) {
        const inlines = this.renderInlineList(block.firstChild!)
        return block.renderElement({ children: inlines })
    }
    renderBlockList(head: Block) {
        const result = document.createDocumentFragment()
        let current = head
        while (current) {
            result.appendChild(this.renderBlock(current))
            current = current.nextSibling!
        }
        return result
    }

    render() {
        this.element = (
            <div
                spellcheck={false}
                contenteditable
                onKeydown={[
                    // onNotComposition(onSingleKey(withCurrentRange(this.inputCharacter))),
                    // onNotComposition(onEnterKey(withCurrentRange(this.changeLine))),
                    // onNotComposition(onBackspaceKey(withCurrentRange(this.deleteContent))),
                    // onNotComposition(onTabKey(this.changeLevel))
                ]}
            >
                {this.renderBlockList(this.doc.head!)}
            </div>
        ) as unknown as HTMLElement

        // FIXME 好像还是得知道具体的 append to document 的时机，不然有时候 IntersectionObserver 可能会出问题
        nextTask(() => {
            this.bindElement(this.element!)
        })


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
        // this.doc.formatRange(this.createDocRange(range)!, formatData)
    }
    formatCurrentRange(formatData: FormatData) {
        const currentRange = this.state.contentRange()!
        // this.doc.formatRange(currentRange, formatData)
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


export type DocRange = any
