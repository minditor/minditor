/**@jsx createElement*/
// @ts-ignore
import {createElement} from "./DOM";
import {LinkedList} from "./linkedList";
import {createReactiveAttribute} from "./buildReactiveView";
// @ts-ignore
import {patchPoint, reactive} from '@ariesate/reactivity'

// @ts-ignore
import Table from './components/Table'
// @ts-ignore
import Code from './components/Code'
import {NodeData} from "./editing";

type RenderProp = {content?: Function, children?: Function, value?: Object, props?:any}


export class NodeType {
    constructor(data: NodeData, parent?:NodeType) {
    }
    static hasContent?: Boolean
    static hasChildren?: Boolean
    static isLeaf?: Boolean
    parent?:NodeType
    children? : LinkedList
    content? : LinkedList
    updateValue? : Function
    value?: {
        value: string
    }
    props? : any
    data? :any
    render?: Function
}


class TextBlock implements NodeType{
    content = new LinkedList()
    children = new LinkedList()
    data: NodeData
    parent?: NodeType
    static hasContent = true
    static hasChildren = true
    constructor(data: NodeData , parent?: NodeType) {
        this.data = data
        this.parent = parent
    }
}

class Doc extends TextBlock{
    firstLeaf= null
    lastLeaf= null
    render({ content, children }:RenderProp) {
        return (
            <div>
                <h1>{content}</h1>
                <div>
                    {children}
                </div>
            </div>
        )
    }
}

class Para extends TextBlock{
    static readonly hasChildren = false
    render({ content }: RenderProp) {
        return (
            <p>{content}</p>
        )
    }
}



class Section extends TextBlock {
    render({ content, children }:RenderProp) {
        return (
            <div>
                <h1>{content}</h1>
                <div>
                    {children}
                </div>
            </div>
        )
    }
}



class List extends TextBlock{
    static readonly hasContent = false
    render({ children }:RenderProp) {

    }
}


const patchableUpdateValue = patchPoint(function (this: NodeType, newValue: string) {
    this.value!.value = newValue
})

class Text implements NodeType{
    static readonly isLeaf = true
    static formatToStyle = ([formatName, formatValue]:[string, any]) => {
        if (formatName === 'bold') {
            return ['fontWeight', 'bold']
        }
    }
    data
    value
    props
    parent
    constructor(data: NodeData, parent: NodeType) {
        const { value = '', props = {}} = data
        this.data = data
        this.value = reactive({ value })
        this.props = reactive(props)
        this.parent = parent
    }
    updateValue = patchableUpdateValue
    render({ value, props }: RenderProp) {
        // TODO format to style
        const style = createReactiveAttribute(() => {

            // @ts-ignore
            return Object.fromEntries(Object.entries(props.formats || {}).map(Text.formatToStyle))
        })

        // @ts-ignore
        return <span _uuid style={style}>{value}</span>
    }
}


export const nodeTypes: {[key: string]: typeof NodeType} = {
    Doc,
    Para,
    Text,
    List,
    Section,
    Table,
    Code,
}