import {createElement} from 'axii'
import EventEmitter from "eventemitter3";
import {ZWSP, assert} from "./util.js";

export class DocNodeFragment {
    head: DocNode | null = null

    retrieve() {
        const head = this.head
        this.head = null
        return head
    }
}


export class DocNode {
    static displayName = 'DocNode'

    constructor(public data?: any) {
    }

    next: DocNode | null = null
    prev: DocNode | null = null

    render(props?: any): any {
        return null
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
    // 在头部按 backspace 是否变成一个普通的 Paragraph
    static unwrap?: (doc: DocumentContent, block: Block) => Block
    // 在 content 中间按回车的时候，是否应该分割成同样类型的新 Block，如果不是就默认创建 Paragraph。
    static splitAsSameType = false
    // 如果 splitAsSameType 为 true，就必须重写这个函数
    static createEmpty() {
        return new this()
    }

    next: Block | null = null
    prev: Block | null = null
    firstChild: Inline | null = null

    get lastChild(): Inline | null {
        let current = this.firstChild
        while (current && current.next) {
            current = current.next
        }
        return current
    }
}

export class Inline extends DocNode {
    static displayName = 'Inline'

    next: Inline | null = null
    prev: Inline | null = null
}


// built-ins
export class Text extends Inline {
    static displayName = 'Text'

    render() {
        const testIdProp: { 'data-testid'?: any } = {}
        if (this.data.testid) {
            testIdProp['data-testid'] = this.data.testid
        }
        // TODO formats 实现
        return <span {...testIdProp}>{this.data.value.length ? this.data.value : ZWSP}</span>
    }

    get isEmpty() {
        return this.data.value === ''
    }
    toJSON() {
        return {
            type: 'Text',
            ...this.data
        }
    }
}

export class Paragraph extends Block {
    static displayName = 'Paragraph'

    get isEmpty() {
        return this.firstChild instanceof Text && this.firstChild.isEmpty
    }

    render({children}: { children: any }) {
        return <p>{children}</p>
    }

    toJSON() {
        return {
            type: 'Paragraph',
        }
    }
}

export class Heading extends Block {
    static displayName = 'Heading'

    static unwrap(doc: DocumentContent, heading: Heading) {
        const fragment = doc.deleteBetween(heading.firstChild!, null)
        const newPara = doc.createParagraph(fragment)
        doc.replace(newPara, heading)
        return newPara
    }

    render({children}: { children: any }) {
        return <h1>{children}</h1>
    }
}

export class OLItem extends Block {
    static displayName = 'OLItem'
    static unwrap(doc: DocumentContent, olItem: OLItem) {
        if (olItem.data.level === 0) {
            const fragment = doc.deleteBetween(olItem.firstChild!, null)
            const newPara = doc.createParagraph(fragment)
            doc.replace(newPara, olItem)
            return newPara
        } else {
            const fragment = doc.deleteBetween(olItem.firstChild!, null)
            const newOlItem = new OLItem({level: olItem.data.level-1})
            newOlItem.firstChild = fragment.retrieve()
            doc.replace(newOlItem, olItem)
            return newOlItem
        }
    }
    static splitAsSameType = true
    static createEmpty(level =0) {
        const newItem = new OLItem({level})
        newItem.firstChild = new Text({value: ''})
        return newItem
    }
    render({children}: { children: any }) {
        return <div>{children}</div>
    }

    toJSON() {
        return {
            type: 'OLItem',
            level: this.data.level
        }
    }
}

export class ULItem extends Block {
    static displayName = 'ULItem'
    static unwrap(doc: DocumentContent, ulItem: ULItem) {
        if (ulItem.data.level === 0) {
            const fragment = doc.deleteBetween(ulItem.firstChild!, null)
            const newPara = doc.createParagraph(fragment)
            doc.replace(newPara, ulItem)
            return newPara
        } else {
            const fragment = doc.deleteBetween(ulItem.firstChild!, null)
            const newOlItem = new ULItem({level: ulItem.data.level-1})
            newOlItem.firstChild = fragment.retrieve()
            doc.replace(newOlItem, ulItem)
            return newOlItem
        }
    }
    static splitAsSameType = true
    static createEmpty(level =0) {
        const newItem = new ULItem({level})
        newItem.firstChild = new Text({value: ''})
        return newItem
    }
    render({children}: { children: any }) {
        return <div>{children}</div>
    }

    toJSON() {
        return {
            type: 'ULItem',
            level: this.data.level
        }
    }
}


export type EmitData<T, U> = {
    method: string,
    args: T,
    result: U
}


// 方法装饰器
function AutoEmit(target: EventEmitter, propertyKey: string, descriptor: PropertyDescriptor) {
    // 保存原始方法的引用
    const originalMethod = descriptor.value;

    // 重写原始方法
    descriptor.value = function (this: EventEmitter, ...args: Parameters<typeof originalMethod>) {
        // 调用原始方法
        const result = originalMethod.apply(this, args);

        // 触发事件
        this.emit(propertyKey, {
            method: propertyKey,
            args,
            result
        } as EmitData<Parameters<typeof originalMethod>, ReturnType<typeof originalMethod>>);

        // 返回原始方法的结果
        return result;
    };

    return descriptor;
}


export class DocumentContent extends EventEmitter {
    static createBlocksFromData(jsonData: BlockData[], docNodeTypes: { [k: string]: typeof DocNode }): Block {
        let head: Block | undefined
        let prevNode: Block | undefined
        jsonData.forEach(docNodeData => {
            const BlockClass = docNodeTypes[docNodeData.type]! as typeof Block
            const docNode = new BlockClass(docNodeData)

            docNode.firstChild = DocumentContent.createInlinesFromData(docNodeData.content, docNodeTypes)

            if (!head) {
                head = docNode
            }
            if (prevNode) {
                prevNode.next = docNode
                docNode.prev = prevNode
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
                inline.prev = prevNode
            }
            prevNode = inline
        })
        return head!
    }

    static fromData(jsonData: BlockData[], docNodeTypes: { [k: string]: typeof DocNode }) {
        return new DocumentContent(DocumentContent.createBlocksFromData(jsonData, docNodeTypes))
    }

    constructor(public firstChild: Block) {
        super();
    }

    createParagraph(child?: Inline | DocNodeFragment) {
        const para = new Paragraph()
        para.firstChild = child ? (child instanceof DocNodeFragment ? child.retrieve() : child) : new Text({value: ''})
        return para
    }

    @AutoEmit
    append(docNode: DocNode | DocNodeFragment, ref: DocNode) {
        const originalNext = ref.next
        const appendNode = docNode instanceof DocNode ? docNode : docNode.retrieve()!
        let lastAppendNode = appendNode
        while (lastAppendNode.next) {
            lastAppendNode.next.prev = lastAppendNode
            lastAppendNode = lastAppendNode.next
        }

        lastAppendNode.next = originalNext
        if (originalNext) {
            originalNext.prev = lastAppendNode
        }
        ref.next = appendNode
        appendNode.prev = ref
    }

    @AutoEmit
    prepend(docNode: DocNode | DocNodeFragment, ref: DocNode) {
        const originalPrevious = ref.prev
        const prependNode = docNode instanceof DocNode ? docNode : docNode.retrieve()!

        let lastPrependNode = prependNode
        while (lastPrependNode.next) {
            lastPrependNode = lastPrependNode.next
        }

        prependNode.prev = ref.prev
        if (ref.prev) {
            ref.prev.next = prependNode
        }

        lastPrependNode.next = ref
        ref.prev = lastPrependNode

        if (this.firstChild === ref) {
            this.firstChild = prependNode as Block
        }
    }

    @AutoEmit
    replace(docNode: DocNode | DocNodeFragment, ref: DocNode, parent: DocumentContent|Block = this) {
        const toReplace = docNode instanceof DocNode ? docNode : docNode.retrieve()!

        let lastOfToReplace = toReplace
        while (lastOfToReplace.next) {
            lastOfToReplace = lastOfToReplace.next
        }

        toReplace.prev = ref.prev
        if (ref.prev) {
            ref.prev.next = toReplace
        }
        lastOfToReplace.next = ref.next
        if (ref.next) {
            ref.next.prev = lastOfToReplace
        }
        ref.prev = null
        ref.next = null

        if (parent.firstChild === ref) {
            parent.firstChild = toReplace as Block
        }
    }

    @AutoEmit
    deleteBetween<T extends DocNode>(start: T, end: T | null) {
        const fragment = new DocNodeFragment()
        const beforeStart = start.prev
        const afterEnd = end?.next || null
        if (afterEnd) {
            afterEnd.prev = beforeStart
        }
        if (beforeStart) {
            beforeStart.next = afterEnd
        }

        start.prev = null
        if (end) {
            end.next = null
        }
        fragment.head = start
        return fragment
    }

    @AutoEmit
    updateText(newTextValue: string, text: Text) {
        text.data.value = newTextValue
    }
    @AutoEmit
    formatText(text: Text, format: FormatData) {
        if (!text.data.formats) {
            text.data.formats = {}
        }

        text.data.formats = {
            ...text.data.formats,
            ...format
        }
    }

    toJSON() {
        const result: BlockData[] = []
        let current = this.firstChild
        while (current) {
            const inlineData: InlineData[] = []
            let currentInline = current.firstChild
            while (currentInline) {
                inlineData.push(currentInline.toJSON())
                currentInline = currentInline.next as Inline
            }
            result.push({
                ...current.toJSON(),
                content: inlineData
            })
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