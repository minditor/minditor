import { atom, Atom, reactive, toRaw, computed, atomComputed } from 'rata'
import { Fragment, createElement } from "axii"
import {assert, deepClone} from "./util";
import {DocumentContent} from "./Content";
import {Doc} from "./editing";

export type DocNodeData = {
    [k: string]: any,
    type: string,
    children?: DocNodeData[],
    content?: DocNodeData[],
    testid?: string,
}

export type ViewNode = {
    [k: string]: any,
    type: string|typeof Fragment,

}


export type RenderProps = {
    content?: ViewNode[]
    level?: Atom<number>,
    serialNumber?: Atom<null|number[]>,
}

export type RenderContext = {
    createElement: typeof createElement
    Fragment: typeof Fragment
}

function mapDocNodeList<T extends DocNode>(start: T|undefined, mapFn:(n:T) => any) {
    let current = start
    const result = []
    while(current) {
        result.push(mapFn(current))
        current = current.next as T
    }
    return result
}

function forEachNode<T extends DocNode>(start: T|undefined, fn:(n:T)=> any) {
    let current = start
    while(current) {
        // CAUTION 因为在 fn 中可能会断开和 next 的连接，所以这里我们要先记住
        const next = current.next as T
        fn(current)
        current = next
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

function last(node: DocNode) {
    let last = node
    while(last.next) {
        last = last.next
    }
    return last
}

function typeHasChildren(docNode: DocNode) : boolean{
    return !!(docNode.constructor as typeof DocNode).hasChildren
}

function typeHasContent(docNode: DocNode) : boolean{
    return !!(docNode.constructor as typeof DocNode).hasContent
}

// 注意这个遍历是包括 start 和 end
function forEachInRange<T extends DocNode>(start: T, end: T, handle: (d: T) => any) {
    let current: T|null|undefined = start
    while(current) {
        handle(current)
        current = current === end ? null : current.next as T
    }
}


export class DocNode {
    static hasChildren?: Boolean
    static hasContent?: Boolean
    static map = mapDocNodeList
    static forEach = forEachNode
    static forEachInRange = forEachInRange
    static findPath = findPath
    static last = last
    static id = 0
    static typeHasChildren = typeHasChildren
    static typeHasContent = typeHasContent
    static ParagraphType?: typeof DocNode
    static createDefaultParagraph = (content? : Text) => {
        const newPara = new DocNode.ParagraphType!({type: 'Paragraph', content: [{type: 'Text', value:''}]})
        if (content) newPara.replaceContent(content)
        return newPara
    }
    static createDefaultNextSibling(docNode: DocNode, content?: Text) {
        return DocNode.createDefaultParagraph(content)
    }
    static appendDefaultAsChildren: boolean = false
    static createDefaultPreviousSibling(docNode: DocNode) {
        return DocNode.createDefaultParagraph()
    }
    // 默认往前 prepend 是会变成前面节点的 children 的。
    static prependDefaultAsSibling: boolean =false
    public parent: Atom<DocNode> =  atom(undefined)
    public prev: Atom<DocNode> = atom(undefined)
    public next?: DocNode
    public level: Atom<number> // level 是从 1 开始算的
    public useAutoSerialNumber = atom(false)
    public serialNumber: Atom<null|number[]> // 格式: [1, 2, 2, 1]
    public manualSerialNumber: Atom<null|number[]> = atom(null)
    public firstChild?: DocNode
    public content?: Text
    public id: number
    constructor(public data: DocNodeData, parent?: DocNode, public isRoot:boolean = false) {
        this.id = ++DocNode.id
        this.parent(parent)
        this.level = computed(() => {
            return this.isRoot ? 0 : ((this.parent()?.level?.() ?? 0) + 1)
        })
        // 序号问题
        this.serialNumber = atomComputed(() => {
            if (!this.useAutoSerialNumber()) return null
            if (this.manualSerialNumber()) return this.manualSerialNumber()
            const index = (this.prev()?.serialNumber()?.data?.at(-1) ?? 0) + 1

            return (this.parent().serialNumber() || []).concat(index)
        })

        if ((this.constructor as typeof DocNode).hasContent) {
            // 节点一定有 content。空行也有。
            this.content = data.content? this.buildContentList(data.content): new Text({type: 'Text', value: ''}, this)
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

    render(props: RenderProps, context: RenderContext) : HTMLElement{
        return <span>should not render</span> as unknown as HTMLElement
    }
    replaceFirstChild(newFirstChild: DocNode|undefined) {
        this.firstChild = newFirstChild
        newFirstChild?.prev(undefined)
        forEachNode(this.firstChild, (docNode: DocNode) => {
            docNode.parent(this)
        })
    }
    replaceContent(newContent?: Text) {
        // 抢夺
        if (newContent?.parent()) newContent.parent().replaceContent(undefined)
        // CAUTION 无论如何都有一个 Text
        this.content = newContent ?? new Text()
        forEachNode(this.content, (docNode: Text) => {
            docNode.parent(this)
        })
    }
    // 包括自己
    findPath(ancestor: DocNode) {
        return findPath(this, ancestor)
    }
    updateRange({startText, endText, startNode, endNode, startOffset, endOffset}: DocRange, textToInsert: string) {
        assert(startNode === this && endNode === this, `not this node range, use DocumentContent to updateRange`)
        let newStartText: Text
        if (startText === endText) {

            startText.value = startText.value.slice(0, startOffset) + textToInsert + endText.value.slice(endOffset)
            if (!startText.value) {
                const prev = startText.prev()
                startText.remove()
                // 如果没有 Prev 说明是第一个节点。那么应该focus 到变化后的第一个节点。DocNode 保证了 Content 一定会有一个节点。
                newStartText = prev || this.content
            } else {
                newStartText = startText
            }
        } else {
            startText.value = startText.value.slice(0, startOffset) + textToInsert
            endText.value = endText.value.slice(endOffset)
            newStartText = startText.value ? startText : startText.prev()
            const newEnd = endText.value? endText : endText.next
            if (!endText.value) endText.remove()

            if (newStartText) {
                newStartText.replaceNext(newEnd as DocNode)
            } else {
                // 说明 start 是头。
                startNode.replaceContent(newEnd)
                // 因为可能删到尾部，但 replaceContent 会保证始终有个 text
                newStartText = startNode.content!
            }
        }
        return newStartText!
    }
    isContentEmpty() {
        console.log("checking empty", this.content!.value, this.content!.next)
        return !this.content!.value && !this.content!.next
    }
    append(next: DocNode) {
        assert(!this.isRoot, 'root cannot append')
        assert(!!next, 'can not append empty next node')
        const originNext = this.next
        this.next = next
        // CAUTION 可能是抢夺了比人的节点。所以这里要处理一下
        if (next?.prev()) {
            next.prev().next = undefined
        }
        next?.prev(this)

        forEachNode(next, (newDocNode: DocNode) => newDocNode.parent(this.parent()))
        this.next?.lastSibling.replaceNext(originNext)
    }
    prepend(prev: DocNode) {
        assert(!this.isRoot, 'root cannot prepend')
        assert(!!prev, 'can not append empty next node')


        if (this.prev()) {
            this.prev().append(prev)
        } else {
            // 头节点
            // CAUTION 一定先把 parent 拿出来，不然 append(this) 执行完就拿不到了
            const parent = this.parent()
            prev.lastSibling.append(this)
            if (parent) parent.replaceFirstChild(prev)
        }
    }

    replaceNext(next?: DocNode,) {
        assert(!this.isRoot, 'root cannot replaceNext')
        this.next = next
        next?.prev(this)
        forEachNode(next, (newDocNode: DocNode) => newDocNode.parent(this.parent()))
    }
    remove() {
        assert(!this.isRoot, 'root cannot remove')
        if (this.prev()) {
            this.prev().replaceNext(this.next)
        } else if (this.parent()){
            this.parent()?.replaceFirstChild(this.next)
        } else {
            this.next?.prev(undefined)
        }
        this.prev(undefined)
        this.parent(undefined)
        this.next = undefined
        return this
    }
    replaceWith(newDocNode?: DocNode) {
        assert(!this.isRoot, 'root cannot replaceWith')
        if (!newDocNode) {
            this.remove()
        } else {
            if (this.prev()) {
                this.prev().replaceNext(newDocNode)
            } else {
                this.parent().replaceFirstChild(newDocNode)
            }
            this.next && newDocNode.lastSibling.append(this.next)
        }
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
    get lastChild() : undefined|DocNode{
        let current = this.firstChild
        while(current?.next) {
            current = current.next
        }
        return current
    }



    get lastDescendant(): DocNode {
        if (!this.firstChild) return this
        return this.lastChild!.lastDescendant
    }
    get previousSiblingInTree() : DocNode {
        assert(!this.isRoot, 'root cannot call previousSiblingInTree')
        // 上一个 Doc 节点
        // 1. 如果有 prev，那么就是 prev 或者 prev 的最后一个 children
        // 2. 就是父节点。
        return this.prev() ?
            this.prev().lastDescendant :
            this.parent().isRoot ?
                null:
                this.parent()
    }
    get lastSibling(): DocNode {
        assert(!this.isRoot, 'root cannot call lastSibling')
        return last(this)
    }
    findParentByLevel(levelOffset: number) {
        assert(levelOffset <= this.level(), 'levelOffset beyond this node level')
        let result = this
        while(levelOffset>0) {
            result = result.parent()
            levelOffset--
        }
        return result
    }

}




export class Section extends DocNode {
    static hasChildren = true
    static hasContent = true
    public static appendDefaultAsChildren = true
    render({ content}: RenderProps, {createElement, Fragment}: RenderContext): HTMLElement {
        return (
            <div uuid={this.id} onRemove={() => console.warn(this)}>
                {() => {
                    const Tag = `h${this.level!()}`
                    return <Tag>{content}</Tag>
                }}
            </div>
        ) as unknown as HTMLElement
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

DocNode.ParagraphType = Paragraph


export class Text extends DocNode{
    static hasContent = false
    static formatToStyle = ([formatName, formatValue]:[string, any]) => {
        if (formatName === 'bold') {
            return { fontWeight: formatValue ? 'bold' : undefined}
        } else if (formatName === 'italic') {
            return { fontStyle: formatValue ? 'italic' : undefined}
        } else if (formatName === 'underline') {
            return { textDecoration: formatValue ? 'underline' : undefined}
        } else if (formatName === 'lineThrough') {
            return { textDecoration: formatValue ? 'line-through' : undefined }
        }
    }
    public prev: Atom<Text> = atom(undefined)
    public next?: Text
    public value: string = ''
    public props
    public testid?: string
    constructor(public data: DocNodeData = { type: 'Text', value:'' }, parent?: DocNode) {
        super(data, parent)
        const { value = '', props = {}} = data
        this.value = value
        this.props = reactive(props)
        this.testid = data.testid
        if (this.props.formats) console.log(this.props.formats, Object.entries(this.props.formats || {}).map(Text.formatToStyle))
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
    clone() {
        return new Text(deepClone(this.toJSON()))
    }
    remove() {
        if (this.prev()) {
            this.prev().replaceNext(this.next)
        } else if (this.parent()){
            this.parent()?.replaceContent(this.next)
        } else {
            this.next?.prev(undefined)
        }
        this.prev(undefined)
        this.parent(undefined)
        this.next = undefined
        return this
    }
    render( { }: RenderProps, {createElement, Fragment}: RenderContext): HTMLElement{
        // TODO format to style
        const style = () => {
            if (this.props.formats)
                console.log(this.props.formats, Object.entries(this.props.formats || {}).map(Text.formatToStyle))
            return Object.assign({}, ...Object.entries(this.props.formats || {}).map(Text.formatToStyle))

        }
        // CAUTION 注意这里的 &ZeroWidthSpace 非常重要，不然遇到空行的时候，没法 setCursor 到 span 里面的空 Text 中，会导致输入的字符跑到了 span 标签的前面。
        return <span data-type-text data-testid={this.testid} uuid={this.id} style={style} dangerouslySetInnerHTML={this.value === '' ? '&ZeroWidthSpace;' : undefined}>
            {this.value}
        </span> as unknown as HTMLElement
        // return <>
        //     <span data-type-text _uuid style={style}>{value}</span>
        //     <span contenteditable={false} dangerouslySetInnerHTML={{__html: '&ZeroWidthSpace;'}}></span>
        // </>
    }
    prepend(prev: Text) {
        assert(!!prev, 'cannot prepend empty text')
        if (this.prev()) {
            this.prev().append(prev)
        } else {
            // CAUTION 这里一定要先记录一下。
            const parent = this.parent()
            prev.lastSibling.append(this)

            if (parent) {
                parent.replaceContent(prev)
            }
        }
    }
    get previousSiblingInTree() {
        assert(false,'should not call previousSibling on Text')
        return this
    }
}

export class ListItem extends DocNode {
    static hasChildren = true
    static hasContent = true
    static createDefaultNextSibling(docNode: DocNode, content?: Text) {
        const item = new ListItem({type: 'ListItem'})
        if(content) item.replaceContent(content)
        return item
    }
    static prependDefaultAsSibling: boolean = true
    static appendDefaultAsChildren: boolean = false
    static createDefaultPreviousSibling(docNode: DocNode) {
        return new ListItem({type: 'ListItem'})
    }
    constructor(public data: DocNodeData, parent?: DocNode) {
        super(data, parent)
        // 序号问题
        this.serialNumber = atomComputed(() => {
            const index = this.prev() instanceof ListItem ? this.prev()?.serialNumber()!.at(-1) + 1 : 1
            const parentSerialNumber = this.parent() instanceof ListItem ? this.parent().serialNumber() : []
            console.log("recomputed number", parentSerialNumber.concat(index).join('.'), this.prev())

            return parentSerialNumber.concat(index)
        })
    }
    render({content}:RenderProps, {createElement}: RenderContext) : HTMLElement{
        const style = () => {
            return {
                paddingLeft: this.level() * 20,
                paddingRight: 20
            }
        }
        return <div style={style}>
            <span contenteditable={false}>{() => this.serialNumber().join('.')}.</span>
            <span>{content}</span>
        </div> as unknown as HTMLElement
    }
}



type OverwriteDocRange = {
    startText?: Text,
    startOffset?: number,
    endText?: Text,
    endOffset?: number
}


export class DocRange {
    public startNode: DocNode
    public endNode: DocNode
    public commonAncestorNode?: DocNode|null
    constructor(public startText: Text, public startOffset: number, public endText: Text, public endOffset: number) {
        // CAUTION 必须在 constructor 里面固定这三个信息，因为之后这些对象的引用都可能会变
        this.commonAncestorNode = this.getCommonAncestorNode()!
        assert(!!this.commonAncestorNode, 'can not find ancestor')
        this.startNode = this.startText.parent()
        this.endNode = this.endText.parent()
    }
    findPathToRoot(startText: Text) {
        let current = startText.parent()
        const result = []
        while(current) {
            result.push(current)
            current = current.parent?.()
        }
        return result
    }
    get collapsed() {
        return this.startOffset === this.endOffset && this.startText == this.endText
    }
    getCommonAncestorNode() : DocNode|null{
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
