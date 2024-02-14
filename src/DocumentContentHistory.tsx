import {AutoEmit, DocNodeFragment, DocumentContent, EmitData, EVENT_ANY, Text} from "./DocumentContent.js";
import {assert} from "./util.js";
import EventEmitter from "eventemitter3";

type appendEmitData = EmitData<Parameters<DocumentContent["append"]>, ReturnType<DocumentContent["append"]>>
type prependEmitData = EmitData<Parameters<DocumentContent["prepend"]>, ReturnType<DocumentContent["prepend"]>>
type replaceEmitData = EmitData<Parameters<DocumentContent["replace"]>, ReturnType<DocumentContent["replace"]>>
type deleteBetweenEmitData = EmitData<Parameters<DocumentContent["deleteBetween"]>, ReturnType<DocumentContent["deleteBetween"]>>
type updateTextEmitData = EmitData<Parameters<DocumentContent["updateText"]>, ReturnType<DocumentContent["updateText"]>>
type formatTextEmitData = EmitData<Parameters<DocumentContent["formatText"]>, ReturnType<DocumentContent["formatText"]>>
type emitData = appendEmitData | prependEmitData | replaceEmitData | deleteBetweenEmitData | updateTextEmitData|formatTextEmitData

type emitMethod = 'append' | 'prepend' | 'replace' | 'deleteBetween' | 'updateText'

export type Packet = {
    stack: emitData[]
    cursor?: {
        startText: Text,
        startOffset: number,
    }
}

export class DocumentContentHistory extends EventEmitter{
    static append(doc: DocumentContent, { args, result: lastAppendNode }: appendEmitData) {
        const [, ref, parent] = args
        // ref 没有 说明原来是个空节点
        const firstAppend = ref ? ref.next! : parent!.firstChild!
        doc.deleteBetween(firstAppend, lastAppendNode.next)
    }
    static prepend(doc: DocumentContent, { args, result: firstPrependNode }: prependEmitData) {
        const [, ref, parent] = args
        doc.deleteBetween(firstPrependNode, ref, parent)
    }
    static replace(doc: DocumentContent, { args, result }: replaceEmitData) {
        const [, replacedNode] = args
        const [firstNewNode, lastNewNode] = result
        doc.prepend(replacedNode, firstNewNode)
        doc.deleteBetween(firstNewNode, lastNewNode.next)
    }
    static deleteBetween(doc: DocumentContent, { args }: deleteBetweenEmitData) {
        const [start, end, parent] = args
        const frag = new DocNodeFragment(start)
        if (end) {
            doc.prepend(frag, end)
        } else {
            doc.append(frag, parent!.lastChild!, parent)
        }
    }
    static updateText(doc: DocumentContent, { args, result: originText }: updateTextEmitData) {
        const [, textNode] = args
        doc.updateText(originText, textNode)
    }
    static formatText(doc: DocumentContent, { args, result: originFormats }: formatTextEmitData) {
        const [, textNode] = args
        const currentFormats = textNode.data.formats
        const resetFormats = {...originFormats}
        Object.entries(currentFormats).forEach(([key, value]) => {
            if (!resetFormats[key]) resetFormats[key] = null
        })

        doc.formatText(resetFormats, textNode)
    }

    public packets: Packet[] = []
    public currentPacket: Packet|null = { stack: [] }
    public undoIndex = 0
    public operating = false
    constructor(public doc: DocumentContent) {
        super()
        this.doc.on(EVENT_ANY, this.push.bind(this))
    }
    @AutoEmit
    push(event: emitData)  {
        if (this.operating) return
        this.currentPacket!.stack.push(event)
    }
    @AutoEmit
    openPacket() {
        if (this.undoIndex !== 0) {
            this.packets.splice(this.packets.length - this.undoIndex, Infinity)
            this.undoIndex = 0
        }
        this.currentPacket = { stack: [] }
    }
    // TODO cursor 位置的处理？？？
    @AutoEmit
    closePacket() {
        assert(!!this.currentPacket, 'packet should not be null')
        this.packets.push(this.currentPacket!)
        this.currentPacket = null
        // TODO updateText 的 packet 合并
    }
    @AutoEmit
    undo() {
        if (this.undoIndex === this.packets.length) return
        this.operating = true
        const packet = this.packets.at(-1-this.undoIndex)!
        for(let i = packet.stack.length - 1; i >= 0; i--) {
            const event = packet.stack[i]
            // FIXME type 应该怎么写？
            // @ts-ignore
            DocumentContentHistory[event.method](this.doc, event)
        }
        this.undoIndex++
        this.operating = false
    }
    @AutoEmit
    redo() {
        if (this.undoIndex === 0) return
        this.operating = true
        this.undoIndex--
        const packet = this.packets.at(-1-this.undoIndex)!
        for(let i = 0; i < packet.stack.length; i++) {
            const event = packet.stack[i]
            // FIXME type 应该怎么写？
            // @ts-ignore
            this.doc[event.method](...event.args)
        }
        this.operating = false
    }
}
