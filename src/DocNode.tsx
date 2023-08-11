import { atom, Atom, reactive, toRaw } from 'rata'
import {DocNode, RenderContext, RenderProps, ViewNode, DocNodeData, DocNodeText} from "./Document";


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
    render({ children, content, level, uuid}: RenderProps, {createElement, Fragment}: RenderContext) {
        return (
            <>
                <heading level={level} uuid={uuid}>{content}</heading>
                {children}
            </>
        )
    }
}


export class Paragraph extends DocNode{
    // static setCursor(node: DocNode, offset: number) : [DocNode, number] | false {
    //     return [node.content!.head.next.node, offset]
    // }
    static hasContent = true
    splitText() {
        // 当产生新的 format 的时候
    }
    combineText() {
        // 当执行删除的时候
    }
    render({ content, uuid }: RenderProps, {createElement, Fragment}: RenderContext) {
        return (
            <paragraph data-type-para uuid={uuid}>{content}</paragraph>
        )
    }
}


export class Text extends DocNodeText{
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
    public value: Atom<string>
    public props
    constructor(data: DocNodeData, parent?: DocNode) {
        super(data, parent)
        const { value = '', props = {}} = data
        this.value = atom(value)
        this.props = reactive(props)
    }

    toJSON() {
        return {type: this.data.type, value: this.value(), props: toRaw(this.props), id: this.id}
    }
    render( { uuid }: RenderProps, {createElement, Fragment}: RenderContext): ViewNode{
        // TODO format to style
        const style = () => {
            return Object.assign({}, ...Object.entries(this.props.formats || {}).map(Text.formatToStyle))
        }
        // CAUTION 注意这里没有用 children 传 content, 因为  children 会变成数组型。后面处理起来要用 children[0] 获取，太麻烦。
        return <text data-type-text uuid={uuid} style={style}>{this.value}</text>
        // return <>
        //     <span data-type-text _uuid style={style}>{value}</span>
        //     <span contenteditable={false} dangerouslySetInnerHTML={{__html: '&ZeroWidthSpace;'}}></span>
        // </>
    }
}

// CAUTION
DocNode.ContentLeaf = Text


