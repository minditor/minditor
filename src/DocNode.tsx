import { atom, Atom, reactive, toRaw, LinkedList, computed,  } from 'rata'
import { Fragment, createElement } from "axii"
import {DocumentContent} from "./Document";
import {assert} from "./util";

export type DocNodeData = {
    [k: string]: any,
    type: string,
    children?: DocNodeData[],
    content?: DocNodeData[],
}

export type ViewNode = {
    [k: string]: any,
    type: string|typeof Fragment,

}


export type RenderProps = {
    children?: (HTMLElement|DocumentFragment)[]
    content?: ViewNode[]
    level?: Atom<number>,
    serialNumber?: Atom<null|number[]>,
}

export type RenderContext = {
    createElement: typeof createElement
    Fragment: typeof Fragment
}

function mapDocNodeList(start: DocNode|undefined, mapFn:(n:DocNode) => any) {
    let current = start
    const result = []
    while(current) {
        result.push(mapFn(current))
        current = current.next
    }
    return result
}

function forEachNode(start: DocNode|undefined, fn:(n:DocNode)=> any) {
    let current = start
    while(current) {
        fn(current)
        current = current.next
    }
}

function findPath(node: DocNode, end: DocNode, includeEnd? :boolean) : DocNode[] |undefined {
    let current = node
    const result = []
    while(current && current !== end) {
        result.push(current)
        current = current.parent()
    }

    // 没找到
    if (current !== end) return undefined

    return includeEnd ? result.concat(end) : result
}


export class DocNode {
    static hasChildren?: Boolean
    static hasContent?: Boolean
    static map = mapDocNodeList
    static forEach = forEachNode
    static findPath = findPath
    static id = 0

    public parent: Atom<DocNode> =  atom(undefined)
    public prev: Atom<DocNode> = atom(undefined)
    public next?: DocNode
    public level: Atom<number>
    public useAutoSerialNumber = atom(false)
    public serialNumber: Atom<null|number[]> // 格式: [1, 2, 2, 1]
    public manualSerialNumber = atom(false)
    public firstChild?: DocNode
    public content?: Text
    public id: number
    constructor(public data: DocNodeData, parent?: DocNode) {
        this.id = ++DocNode.id
        this.parent(parent)
        this.level = computed(() => ((this.parent()?.level?.() ?? 0) + 1))
        // 序号问题
        this.serialNumber = computed(() => {
            if (!this.useAutoSerialNumber()) return null
            if (this.manualSerialNumber()) return this.manualSerialNumber()
            const index = (this.prev()?.serialNumber()?.at(-1) ?? 0) + 1

            return (this.parent.serialNumber() || []).concat(index)
        })

        if ((this.constructor as typeof DocNode).hasContent) {
            // 节点一定有 content。空行也有。
            this.content = data.content? this.buildContentList(data.content): new Text()
        }
    }
    buildContentList(data: DocNodeData[]) {

        let first: Text
        let prev: Text
        data.forEach(nodeData => {
            const newNode = new Text(nodeData, this)

            if (!first) first = newNode
            if (prev) {
                newNode.prev(prev)
                prev.next = newNode
            }
            prev = newNode
        })
        return first!
    }

    render(props: RenderProps, context: RenderContext) : HTMLElement|DocumentFragment{
        return <></> as unknown as DocumentFragment
    }
    replaceFirstChild(newFirstChild: DocNode) {
        this.firstChild = newFirstChild
        forEachNode(this.firstChild, (docNode: DocNode) => {
            docNode.parent(this)
        })
    }
    findPath(ancestor: DocNode) {
        return findPath(this, ancestor)
    }
    updateRange({startText, endText, startOffset, endOffset}: DocRange, textToInsert: string) {
        // TODO update content
        assert(startText.parent() === this && endText.parent() === this, `not this node range, use DocumentContent to updateRange`)

        if (startText === endText) {

            startText.value = startText.value.slice(0, startOffset) + textToInsert + endText.value.slice(endOffset)

        } else {
            startText.value = startText.value.slice(0, startOffset) + textToInsert
            endText.value = endText.value.slice(endOffset)
            const newStart = startText.value ? startText : startText.prev()
            const newEnd = endText.value? endText : endText.next

            if (newStart) {
                newStart.append(newEnd)
            } else {
                // 说明 start 是头。
                startText.parent().content = newEnd
            }
        }
    }
    isContentEmpty() {
        return !!this.content.value && !this.content.next
    }
    append(next?: DocNode) {
        this.next = next
        next?.prev(this)
        forEachNode(next, (newDocNode: DocNode) => newDocNode.parent(this.parent()))
    }
    toJSON() {
        const result: DocNodeData = {type: this.data.type, id: this.id}
        if ((this.constructor as typeof DocNode).hasContent) {
            result.content = DocNode.map(this.content!, listNode => listNode.toJSON())
        }

        if ((this.constructor as typeof DocNode).hasChildren) {
            result.children = DocNode.map(this.firstChild, child => child.toJSON())
        }
        return result
    }
    get lastChild() {
        let current = this.firstChild
        while(current?.next) {
            current = current.next
        }
        return current
    }
    get lastDescendant() {
        if (!this.firstChild) return this
        return this.lastChild!.lastDescendant
    }
    get previousSibling() {
        // 上一个 Doc 节点
        // 1. 如果有 prev，那么就是 prev 或者 prev 的最后一个 children
        // 2. 就是父节点。
        return this.prev() ? this.prev().lastDescendant : this.parent()
    }
}




export class Section extends DocNode {
    // TODO
    // static setCursor(node: DocNode, offset: number) : [DocNode, number] | false {
    //     return [node.content!.head.next.node, offset]
    // }
    static hasChildren = true
    static hasContent = true
    // static createDefaultContent() : NodeData[]{
    //     return [{ type: 'Text', value: ''}]
    // }
    render({ children, content}: RenderProps, {createElement, Fragment}: RenderContext): DocumentFragment {
        return (
            <>
                <div uuid={this.id}>
                    {() => {
                        const Tag = `h${this.level!()}`
                        return <Tag>{content}</Tag>
                    }}
                </div>
                {children}
            </>
        ) as unknown as DocumentFragment
    }
}

export class Paragraph extends DocNode {
    static hasChildren = false
    static hasContent = true
    render({ content }: RenderProps, {createElement, Fragment}: RenderContext): HTMLElement {
        return (
            <p uuid={this.id}>
                {content}
            </p>
        ) as unknown as HTMLElement
    }
}


export class Text extends DocNode{
    static hasContent = false
    static formatToStyle = ([formatName, formatValue]:[string, any]) => {
        if (formatName === 'bold') {
            return {
                fontWeight: 'bold'
            }
        } else if (formatName === 'italic') {
            return { fontStyle: 'italic'}
        } else if (formatName === 'underline') {
            // TODO color?
            return {
                textDecorationLine: 'underline'
            }
        } else if (formatName === 'lineThrough') {
            return {
                textDecorationLine: 'line-through'
            }
        }
    }
    public value: string = ''
    public props
    constructor(public data: DocNodeData = {}, parent?: DocNode) {
        super(data, parent)
        const { value = '', props = {}} = data
        this.value = value
        this.props = reactive(props)
    }
    insertText( offset: number, textToInsert: string) {
        this.value = this.value.slice(0, offset) + textToInsert + this.value.slice(offset)
    }
    toJSON() {
        return {type: this.data.type, value: this.value, props: toRaw(this.props), id: this.id}
    }
    isFirstContent() {
        return this === this.parent().content
    }
    render( { }: RenderProps, {createElement, Fragment}: RenderContext): HTMLElement{
        // TODO format to style
        const style = () => {
            return Object.assign({}, ...Object.entries(this.props.formats || {}).map(Text.formatToStyle))
        }
        // CAUTION 注意这里没有用 children 传 content, 因为  children 会变成数组型。后面处理起来要用 children[0] 获取，太麻烦。
        return <span data-type-text uuid={this.id} style={style}>{this.value}</span> as unknown as HTMLElement
        // return <>
        //     <span data-type-text _uuid style={style}>{value}</span>
        //     <span contenteditable={false} dangerouslySetInnerHTML={{__html: '&ZeroWidthSpace;'}}></span>
        // </>
    }
    get previousSibling() {
        throw new Error('should not call previousSibling on Text')
    }
}

type OverwriteDocRange = {
    startText?: Text,
    startOffset?: number,
    endText?: Text,
    endOffset?: number
}

export class DocRange {
    constructor(public startText: Text, public startOffset: number, public endText: Text, public endOffset: number) {
    }
    findPathToRoot(startText: Text) {
        let current = startText.parent()
        const result = []
        while(current) {
            result.push(current)
            current = current.parent()
        }
        return result
    }
    get collapsed() {
        return this.startOffset === this.endOffset && this.startText == this.endText
    }
    get commonAncestorNode() : DocNode|null{
        const startPathToRoot = this.findPathToRoot(this.startText)
        const endPathToRoot = this.findPathToRoot(this.endText)
        let lastEqualNode: DocNode|null = null
        while(startPathToRoot.length && endPathToRoot.length) {
            if (startPathToRoot.at(-1) === endPathToRoot.at(-1)) {
                lastEqualNode = startPathToRoot.at(-1)!
                startPathToRoot.pop()
                endPathToRoot.pop()
            } else {
                break;
            }
        }

        return lastEqualNode
    }
    derive(overwrite:OverwriteDocRange = {}) {
        return new DocRange(
            overwrite.startText ?? this.startText,
            overwrite.startOffset ?? this.startOffset,
            overwrite.endText ?? this.endText,
            overwrite.endOffset ?? this.endOffset
        )
    }
}