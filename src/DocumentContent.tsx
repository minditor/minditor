import {createElement} from 'axii'
import EventEmitter from "eventemitter3";
import {ZWSP} from "./util.js";

export class DocNodeFragment {
    head: DocNode | null = null
    retrieve() {
        const head = this.head
        this.head = null
        return head
    }
}

export class DocNode{
    constructor(public props?:any) {
    }
    nextSibling: DocNode | null = null
    previousSibling: DocNode | null = null
    render(props?: any): any {
        return null
    }
}


export class Block extends DocNode  {
    static displayName = 'Block'

    nextSibling: Block | null = null
    previousSibling: Block | null = null
    firstChild: Inline | null = null
    get lastChild() : Inline| null{
        let current = this.firstChild
        while (current && current.nextSibling) {
            current = current.nextSibling
        }
        return current
    }
}

export class Inline extends DocNode {
    static displayName = 'Inline'

    nextSibling: Inline | null = null
    previousSibling: Inline | null = null
}


// built-ins
export class Text extends Inline {
    static displayName = 'Text'
    render() {
        return <span>{this.props.value.length ? this.props.value : ZWSP}</span>
    }
    get isEmpty() {
        return this.props.value === ''
    }
}

export class Paragraph extends Block {
    static displayName = 'Paragraph'
    render({ children }: {children: any}) {
        return <p>{children}</p>
    }
}

export class Heading extends Block {
    static displayName = 'Heading'
    render({ children }: {children: any}) {
        return <h1>{children}</h1>
    }

}

export class OLItem extends Block {
    static displayName = 'OLItem'

}

export class ULItem extends Block {
    static displayName = 'ULItem'

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
        this.emit(propertyKey, {method: propertyKey, args, result} as EmitData<Parameters<typeof originalMethod>, ReturnType<typeof originalMethod>>);

        // 返回原始方法的结果
        return result;
    };

    return descriptor;
}


export class DocumentContent extends EventEmitter {
    static createBlocksFromData(jsonData: BlockData[], docNodeTypes: {[k: string]: typeof DocNode}): Block {
        let head: Block|undefined
        let prevNode: Block|undefined
        jsonData.forEach(docNodeData => {
            const BlockClass = docNodeTypes[docNodeData.type]! as typeof Block
            const docNode = new BlockClass(docNodeData.props)

            docNode.firstChild =  DocumentContent.createInlinesFromData(docNodeData.content, docNodeTypes)

            if (!head) {
                head = docNode
            }
            if (prevNode) {
                prevNode.nextSibling = docNode
                docNode.previousSibling = prevNode
            }
            prevNode = docNode!
        })
        return head!
    }
    static createInlinesFromData(jsonData: InlineData[], docNodeTypes: {[k: string]: typeof DocNode}): Inline {
        let head: Inline|undefined
        let prevNode: Inline|undefined
        jsonData.forEach(inlineData => {
            const InlineClass = docNodeTypes[inlineData.type]! as typeof Inline
            const inline = new InlineClass(inlineData.props)
            if (!head) {
                head = inline
            }
            if (prevNode) {
                prevNode.nextSibling = inline
                inline.previousSibling = prevNode
            }
            prevNode = inline
        })
        return head!
    }
    createParagraph(child?: Inline|DocNodeFragment) {
        const para = new Paragraph()
        para.firstChild = child ? (child instanceof DocNodeFragment ? child.retrieve() : child) : new Text({value: ''})
        return para
    }
    constructor(public head: Block) {
        super();
    }
    @AutoEmit
    append(docNode: DocNode|DocNodeFragment, ref: DocNode) {
        const originalNext = ref.nextSibling
        if (docNode instanceof DocNode) {
            docNode.nextSibling = originalNext
            docNode.previousSibling = ref
            ref.nextSibling = docNode
        } else {
            const head = docNode.retrieve()!
            head.previousSibling = ref
            ref.nextSibling = head
        }
    }
    @AutoEmit
    prepend(docNode: DocNode|DocNodeFragment, ref: DocNode) {
        const originalPrevious = ref.previousSibling
        if (docNode instanceof DocNode) {
            docNode.previousSibling = originalPrevious
            docNode.nextSibling = ref
            ref.previousSibling = docNode
        } else {
            const head = docNode.retrieve()!
            head!.nextSibling = ref
            ref.previousSibling = head
        }
    }
    @AutoEmit
    replace(docNode: DocNode|DocNodeFragment, ref: DocNode) {
        const originalPrevious = ref.previousSibling
        const originalNext = ref.nextSibling
        if (docNode instanceof DocNode) {
            docNode.previousSibling = originalPrevious
            docNode.nextSibling = originalNext
            ref.previousSibling = null
            ref.nextSibling = null
        } else {
            const head = docNode.retrieve()!
            head!.previousSibling = originalPrevious
            head!.nextSibling = originalNext
            ref.previousSibling = null
            ref.nextSibling = null
        }
    }
    @AutoEmit
    deleteBetween<T extends DocNode>( start: T, end: T|null) {
        const fragment = new DocNodeFragment()
        const beforeStart = start.previousSibling
        const afterEnd = end?.nextSibling || null
        if (afterEnd) {
            afterEnd.previousSibling = beforeStart
        }
        if (beforeStart) {
            beforeStart.nextSibling = afterEnd
        }

        start.previousSibling = null
        if (end) {
            end.nextSibling = null
        }
        fragment.head = start
        return fragment
    }
    @AutoEmit
    updateText(newTextValue: string, text: Text) {
        text.props.value = newTextValue
    }
    toJSON() {
        const result: BlockData[] = []
        let current = this.head
        while (current) {
            const inlineData: InlineData[] = []
            let currentInline = current.firstChild
            while (currentInline) {
                inlineData.push({
                    type: (currentInline.constructor as typeof Inline).displayName,
                    props: currentInline.props,
                })
                currentInline = currentInline.nextSibling as Inline
            }
            result.push({
                type: (current.constructor as typeof Block).displayName,
                props: current.props,
                content: inlineData
            })
            current = current.nextSibling as Block
        }
        return result
    }
}

export type FormatData = {
    [k:string] : any
}

export type BlockData = {
    type: string,
    props?: {
        [k: string]: any,
    }
    content: InlineData[]
    testid?: string,
}

export type InlineData = {
    type: string,
    props?: {
        [k: string]: any,
    }
    testid?: string,
}
