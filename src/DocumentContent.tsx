import EventEmitter from "eventemitter3";
import {assert, ZWSP} from "./util.js";
import {Atom, atom, createElement} from "axii";
import {v4} from 'uuid'

export class DocNodeFragment {
    public retrieved = false
    public tail:DocNode
    constructor(public head: DocNode) {
        this.tail = head
        while (this.tail.next) {
            this.tail = this.tail.next
        }
    }
    retrieve() {
        this.retrieved = true
        return this.head
    }
}


export class DocNode {
    static displayName = 'DocNode'
    id: string;
    constructor(public data?: any) {
        this.id = v4()
    }
    get type() {
        return (this.constructor as typeof DocNode).displayName
    }

    next: DocNode | null = null
    prev: Atom<DocNode|null> = atom(null)

    render(props?: any): any {
        return null
    }
    destroy() {

    }

    toJSON() {
        return {
            type: (this.constructor as typeof DocNode).displayName,
            ...this.data
        }

    }
}


export class Block extends DocNode {
    static displayName = 'Block'
    static unwrap?: (doc: DocumentContent, block: any) => void|undefined|Block
    static wrap?: (doc: DocumentContent, block: any) => void|undefined|Block
    // indicate whether the block can be split into two blocks of the same type
    static splitAsSameType = false
    // if splitAsSameType is set to true, Block should rewrite this createEmpty method
    static createEmpty(referenceBlock?: any) {
        return new this()
    }

    next: Block | null = null
    prev: Atom<Block|null> = atom(null)
    firstChild: Inline | null = null

    get lastChild(): Inline | null {
        let current = this.firstChild
        while (current && current.next) {
            current = current.next
        }
        return current
    }
    toJSON() {
        let content: InlineData[] = []
        let current = this.firstChild
        while (current) {
            content.push(current.toJSON())
            current = current.next
        }
        return {
            ...this.data,
            type: (this.constructor as typeof Block).displayName,
            content
        }
    }
}

export class Inline extends DocNode {
    static displayName = 'Inline'

    next: Inline | null = null
    prev: Atom<Inline|null> = atom(null)
}


export type EmitData<T, U> = {
    method: string,
    args: T,
    result: U
}


export const EVENT_ANY = Symbol('ANY')

// decorator to auto emit event
export function AutoEmit(target: EventEmitter, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (this: EventEmitter, ...args: Parameters<typeof originalMethod>) {
        const result = originalMethod.apply(this, args);

        this.emit(propertyKey, {
            method: propertyKey,
            args,
            result
        } as EmitData<Parameters<typeof originalMethod>, ReturnType<typeof originalMethod>>);

        this.emit(EVENT_ANY, {
            method: propertyKey,
            args,
            result
        } as EmitData<Parameters<typeof originalMethod>, ReturnType<typeof originalMethod>>);

        return result;
    };

    return descriptor;
}


export class Text extends Inline {
    static displayName = 'Text'
    static multipleValueStyleKeys = ['textDecoration']
    static formatToStyle = ([formatName, formatValue]:[string, any]) => {
        if (formatName === 'bold') {
            return { fontWeight: formatValue ? 'bold' : undefined}
        } else if (formatName === 'italic') {
            return { fontStyle: formatValue ? 'italic' : undefined}
        } else if (formatName === 'underline') {
            return { textDecoration: formatValue ? 'underline' : undefined}
        } else if (formatName === 'lineThrough') {
            return { textDecoration: formatValue ? 'line-through' : undefined }
        } else if (formatName=== 'color') {
            return { color: formatValue }
        } else if (formatName === 'fontSize') {
            return { fontSize: formatValue }
        } else if (formatName === 'fontFamily') {
            return { fontFamily: formatValue }
        } else if (formatName === 'backgroundColor') {
            return { backgroundColor: formatValue }
        }
    }
    render() {
        const testIdProp: { 'data-testid'?: any } = {}
        if (this.data.testid) {
            testIdProp['data-testid'] = this.data.testid
        }
        // CAUTION textDecoration 是可以多重的
        const formatStyle: {[k:string]: string} = {}
        Object.entries(this.data.formats || {}).forEach(([formatName, formatValue]) => {
            if (Text.multipleValueStyleKeys.includes(formatName)) {
                if (!formatStyle[formatName]) formatStyle[formatName] = ''
                formatStyle[formatName] = `${formatStyle[formatName]} ${formatValue}`
            } else {
                Object.assign(formatStyle, Text.formatToStyle([formatName, formatValue]))
            }
        })
        return <span {...testIdProp} style={formatStyle}>{this.data.value.length ? this.data.value : ZWSP}</span>
    }

    get isEmpty() {
        return this.data.value === ''
    }
    toText()  {
        return this.data.value
    }
    toJSON() {
        return {
            type: 'Text',
            ...this.data
        }
    }
}


export class TextBasedBlock extends Block {
    toText() {
        let content = ''
        let current = this.firstChild
        while (current) {
            if (current instanceof Text) {
                content += current.data.value
            } else if( (current as Text).toText ){
                content += (current as Text).toText()
            } else {
                // ignore Inline which cannot be converted to text
            }
            current = current.next
        }
        return content
    }
}

export class Paragraph extends TextBasedBlock {
    static displayName = 'Paragraph'

    get isEmpty() {
        return this.firstChild instanceof Text && this.firstChild.isEmpty && !this.firstChild.next
    }
    render({children}: { children: any }) {
        return <p style={{minHeight:'1ex', wordWrap:'break-word'}}>{children}</p>
    }
}

export class DocumentContent extends EventEmitter {
    static createBlocksFromData(jsonData: BlockData[], docNodeTypes: { [k: string]: typeof DocNode }): Block {
        let head: Block | undefined
        let prevNode: Block | undefined
        jsonData.forEach(docNodeData => {
            const BlockClass = docNodeTypes[docNodeData.type]! as typeof Block
            const docNode = new BlockClass(docNodeData)

            if(docNodeData.content) {
                // only TextBasedBlock have content
                docNode.firstChild = DocumentContent.createInlinesFromData(docNodeData.content, docNodeTypes)
            }

            if (!head) {
                head = docNode
            }
            if (prevNode) {
                prevNode.next = docNode
                docNode.prev(prevNode)
            }
            prevNode = docNode!
        })
        return head!
    }

    static createInlinesFromData(jsonData: InlineData[], docNodeTypes: { [k: string]: typeof DocNode }): Inline {
        let head: Inline | undefined
        let prevNode: Inline | undefined
        jsonData.forEach(inlineData => {
            const InlineClass = docNodeTypes[inlineData.type]! as typeof Inline
            const inline = new InlineClass(inlineData)
            if (!head) {
                head = inline
            }
            if (prevNode) {
                prevNode.next = inline
                inline.prev(prevNode)
            }
            prevNode = inline
        })
        return head!
    }

    static fromData(jsonData: BlockData[], docNodeTypes: { [k: string]: typeof DocNode }) {
        return new DocumentContent(DocumentContent.createBlocksFromData(jsonData, docNodeTypes), docNodeTypes)
    }

    static createEmptyContentData(): BlockData[] {
        return [{
            type: 'Paragraph',
            content: [
                {
                    type: 'Text',
                    value: ''
                }
            ]
        }]
    }

    constructor(public firstChild: Block, public types: {[k:string]: typeof DocNode}) {
        super();
    }

    createParagraph(child?: Inline | DocNodeFragment) {
        const para = new Paragraph()
        para.firstChild = child ? (child instanceof DocNodeFragment ? child.retrieve() : child) : new Text({value: ''})
        return para
    }
    createText(value: string = '', formats?: FormatData) {
        return new Text({value, formats})
    }
    createFromData(data: InlineData|BlockData) {
        const Type = this.types[data.type]!
        return new Type(data)
    }

    @AutoEmit
    append(docNode: DocNode | DocNodeFragment, ref: DocNode|null, parent : DocumentContent|Block) {
        assert(!(!ref && !parent), 'ref and parent should not be both null')
        assert(!(!ref && parent!.firstChild), 'ref should not be null when parent is not empty')

        const originalNext = ref?.next || null
        const appendNode = docNode instanceof DocNode ? docNode : docNode.retrieve()!
        let lastAppendNode = appendNode
        while (lastAppendNode.next) {
            lastAppendNode.next.prev(lastAppendNode)
            lastAppendNode = lastAppendNode.next
        }

        lastAppendNode.next = originalNext
        if (originalNext) {
            originalNext.prev(lastAppendNode)
        }

        if (ref) {
            ref.next = appendNode
        } else {
            // if there is no ref that means the parent is empty
            parent!.firstChild = appendNode
        }

        appendNode.prev(ref)
        return lastAppendNode
    }

    @AutoEmit
    prepend(docNode: DocNode | DocNodeFragment, ref: DocNode, parent : DocumentContent|Block = this) {
        assert(!(!ref && !parent), 'ref and parent should not be both null')
        assert(!(!ref && parent!.firstChild), 'ref should not be null when parent is not empty')
        const prependNode = docNode instanceof DocNode ? docNode : docNode.retrieve()!

        let lastPrependNode = prependNode
        while (lastPrependNode.next) {
            lastPrependNode = lastPrependNode.next
        }

        prependNode.prev(ref.prev())
        if (ref.prev()) {
            ref.prev()!.next = prependNode
        }

        lastPrependNode.next = ref
        ref.prev(lastPrependNode)

        if (parent?.firstChild === ref) {
            parent.firstChild = prependNode as Block
        }

        return prependNode
    }

    @AutoEmit
    replace(docNode: DocNode | DocNodeFragment, ref: DocNode, parent: DocumentContent|Block = this) {
        const firstNewNode = docNode instanceof DocNode ? docNode : docNode.retrieve()!

        let lastNewNode = firstNewNode
        while (lastNewNode.next) {
            lastNewNode = lastNewNode.next
        }

        firstNewNode.prev(ref.prev())
        if (ref.prev()) {
            ref.prev()!.next = firstNewNode
        }
        lastNewNode.next = ref.next
        if (ref.next) {
            ref.next.prev(lastNewNode)
        }
        ref.prev(null)
        ref.next = null

        if (parent.firstChild === ref) {
            parent.firstChild = firstNewNode as Block
        }

        return [firstNewNode, lastNewNode]
    }

    // the delete method will delete start node but no end node
    @AutoEmit
    deleteBetween<T extends DocNode>(start: T, end: T | null, parent?: DocumentContent|Block) {
        // assert( !parent || (parent instanceof DocumentContent && start instanceof Block || parent instanceof Block && start instanceof Inline), 'parent and start type not match')
        const beforeStart = start.prev()

        start.prev(null)

        if (beforeStart) {
            beforeStart.next = end
        } else {
            // from first child
            parent!.firstChild = end
        }

        if (end) {
            // clean the end of list
            end.prev()!.next = null
            // reset end.prev
            end.prev(beforeStart)
        }

        return new DocNodeFragment(start)
    }

    @AutoEmit
    updateText(newTextValue: string, text: Text) {
        const origin = text.data.value
        text.data.value = newTextValue
        return origin
    }
    @AutoEmit
    formatText( format: FormatData, text: Text) {
        if (!text.data.formats) {
            text.data.formats = {}
        }
        const originFormats = text.data.formats

        text.data.formats = {
            ...text.data.formats,
        }

        for(const key in format) {
            if (format[key] === null || format[key] === undefined) {
                delete text.data.formats[key]
            } else {
                text.data.formats[key] = format[key]
            }
        }

        return originFormats
    }
    get lastChild(): Block | null {
        let current = this.firstChild
        while (current && current.next) {
            current = current.next
        }
        return current
    }
    toJSON() {
        const result: BlockData[] = []
        let current = this.firstChild
        while (current) {
            result.push(current.toJSON())
            current = current.next as Block
        }
        return result
    }
}

export type FormatData = {
    [k: string]: any
}

export type BlockData = {
    [k: string]: any,
    type: string,
    content: InlineData[]
    testid?: string,
}

export type InlineData = {
    [k: string]: any,
    type: string,
    value: any,
    testid?: string,
}


export class InlineComponent extends Inline {
    static asTextNode = false
    focus() {

    }
    onMount() {

    }
    onUnmount(){

    }
}

export class Component extends Block {
    static asTextNode = false
    onMount() {

    }
    onUnmount(){

    }
    focus() {

    }
}

