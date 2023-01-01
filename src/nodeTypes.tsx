/**@jsx createElement*/
// @ts-ignore
import {createElement} from "./DOM";
import {LinkedList} from "./linkedList";
import {createReactiveAttribute} from "./buildReactiveView";
// @ts-ignore
import {patchPoint, reactive} from '@ariesate/reactivity'
import { NodeType, RenderProp } from "./NodeType";
// @ts-ignore
import Table from './components/Table'
// @ts-ignore
// import Code from './components/Code'
import {NodeData} from "./editing";








class TextBlock extends NodeType{
    content = new LinkedList(this)
    children = new LinkedList(this)
    data?: NodeData
    container?: LinkedList
    static hasContent = true
    static hasChildren = true
}

class Doc extends TextBlock{
    firstLeaf= null
    lastLeaf= null
    render({ content, children }:RenderProp){
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
        return (
            <div>
                {children}
            </div>
        )
    }
}

class ListItem extends TextBlock{
    static readonly createSiblingAsDefault = true
    render({ children, content }:RenderProp) {
        return (
            <div data-type-listitem>
                <div data-type-listitem-content>{content}</div>
                <div data-type-listitem-children>{children}</div>
            </div>
        )
    }
}


const patchableSyncValue = patchPoint(function (this: NodeType, newValue: string) {
    this.value!.value = newValue
})

class Text extends NodeType{
    static readonly isLeaf = true
    static formatToStyle = ([formatName, formatValue]:[string, any]) => {
        if (formatName === 'bold') {
            return ['fontWeight', 'bold']
        }
    }
    value
    props
    constructor(data: NodeData, container: LinkedList) {
        super(data, container)
        const { value = '', props = {}} = data
        this.value = reactive({ value })
        this.props = reactive(props)
    }
    syncValue = patchableSyncValue
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
    ListItem,
    Section,
    Table,
}