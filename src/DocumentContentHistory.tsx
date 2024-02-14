import {AutoEmit, DocNodeFragment, DocumentContent, EmitData, EVENT_ANY, Text} from "./DocumentContent.js";
import { Document } from "./Document.js";
import {assert} from "./util.js";
import EventEmitter from "eventemitter3";
import {DocRange} from "./View.js";
import {Options} from "pretty-format";

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
    startRange: DocRange|null,
    endRange: DocRange|null
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
            doc.append(frag, parent!.lastChild!, parent!)
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
    public currentPacket: Packet|null = { stack: [], startRange:null, endRange: null }
    public undoIndex = 0
    public operating = false
    constructor(public doc: Document) {
        super()
        this.doc.content.on(EVENT_ANY, this.push.bind(this))
    }
    @AutoEmit
    push(event: emitData)  {
        if (this.operating) return
        this.currentPacket!.stack.push(event)
    }
    @AutoEmit
    openPacket(startRange: DocRange|null) {
        if (this.undoIndex !== 0) {
            this.packets.splice(this.packets.length - this.undoIndex, Infinity)
            this.undoIndex = 0
        }
        this.currentPacket = { stack: [], startRange, endRange:null }
    }
    @AutoEmit
    closePacket(endRange: DocRange|null) {
        assert(!!this.currentPacket, 'packet should not be null')
        this.currentPacket!.endRange = endRange
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
            DocumentContentHistory[event.method](this.doc.content, event)
        }
        if (packet.startRange) this.doc.view?.setRange(packet.startRange!)
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
            this.doc.content[event.method](...event.args)
        }
        if (packet.endRange) this.doc.view?.setRange(packet.endRange!)
        this.operating = false
    }
}
