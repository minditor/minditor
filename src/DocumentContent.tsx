import {assert} from "./util";
import { createElement } from 'axii'
import EventEmitter from "eventemitter3";

export class DocNodeFragment {
    head: DocNode | null = null
    element?: DocumentFragment
}

export class DocNode{
    constructor(public props?:any) {
    }
    nextSibling: DocNode | null = null
    previousSibling: DocNode | null = null
    element?: HTMLElement
    render(props?: any): any {
        return null
    }
    renderElement(props?: any) {
        this.element = this.render(props)
        return this.element!
    }

}


export class Block extends DocNode  {
    nextSibling: Block | null = null
    previousSibling: Block | null = null
    firstChild: Inline | null = null
}

export class Inline extends DocNode {
    nextSibling: Inline | null = null
    previousSibling: Inline | null = null
}


// built-ins
export class Text extends Inline {
    render() {
        return <span>{this.props.value}</span>
    }
}

export class Paragraph extends Block {
    render({ children }: {children: any}) {
        return <p>{children}</p>
    }
}

export class Heading extends Block {

}

export class OLItem extends Block {

}

export class ULItem extends Block {

}


export type EmitData = {
    method: string,
    args: any[],
    result: any,
}


// 方法装饰器
function AutoEmit(target: EventEmitter, propertyKey: string, descriptor: PropertyDescriptor) {
    // 保存原始方法的引用
    const originalMethod = descriptor.value;

    // 重写原始方法
    descriptor.value = function (this: EventEmitter, ...args: any[]) {
        // 调用原始方法
        const result = originalMethod.apply(this, args);

        // 触发事件
        this.emit(propertyKey, {method: propertyKey, args, result} as EmitData);

        // 返回原始方法的结果
        return result;
    };

    return descriptor;
}


export class DocumentContent extends EventEmitter {
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
            docNode.head!.previousSibling = ref
            ref.nextSibling = docNode.head
            docNode.head = null
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
            docNode.head!.nextSibling = ref
            ref.previousSibling = docNode.head
            docNode.head = null
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
            docNode.head!.previousSibling = originalPrevious
            docNode.head!.nextSibling = originalNext
            ref.previousSibling = null
            ref.nextSibling = null
            docNode.head = null
        }
    }
    @AutoEmit
    deleteBetween<T extends DocNode>( start: T, end: T) {
        const fragment = new DocNodeFragment()
        const beforeStart = start.previousSibling
        const afterEnd = end.nextSibling
        if (afterEnd) {
            afterEnd.previousSibling = beforeStart
        }
        if (beforeStart) {
            beforeStart.nextSibling = afterEnd
        }

        start.previousSibling = null
        end.nextSibling = null
        fragment.head = start
        return fragment
    }
    @AutoEmit
    updateText(newTextValue: string, text: Text) {
        text.props.value = newTextValue
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
    value?: string,
    testid?: string,
}
