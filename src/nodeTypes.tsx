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
    constructor(data: NodeData, container?:LinkedList) {
        this.data = data
        this.container = container
    }
    static hasContent?: Boolean
    static hasChildren?: Boolean
    static isLeaf?: Boolean
    container?: LinkedList
    // @ts-ignore
    parent?: NodeType
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
    content = new LinkedList(this)
    children = new LinkedList(this)
    data: NodeData
    container?: LinkedList
    static hasContent = true
    static hasChildren = true
    constructor(data: NodeData, container?:LinkedList) {
        this.data = data
        this.container = container
    }
    // @ts-ignore
    get parent() {
        return this.container?.owner
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
    container
    constructor(data: NodeData, container: LinkedList) {
        const { value = '', props = {}} = data
        this.data = data
        this.container = container
        this.value = reactive({ value })
        this.props = reactive(props)
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
    // @ts-ignore
    get parent() {
        return this.container?.owner
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