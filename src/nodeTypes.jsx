/**@jsx createElement*/
import {createElement} from "./DOM";
import {LinkedList} from "./linkedList";
import {createReactiveAttribute} from "./buildReactiveView";
import {patchPoint, reactive} from '@ariesate/reactivity'

import Table from './components/Table'
import Code from './components/Code'


class TextBlock {
    content = new LinkedList()
    children = new LinkedList()
    data = null
    parent = null
    static hasContent = true
    static hasChildren = true
    constructor(data, parent) {
        this.data = data
        this.parent = parent
    }
}

class Doc extends TextBlock{
    firstLeaf= null
    lastLeaf= null
    render({ content, children }) {
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
    static hasChildren = false
    render({ content }) {
        return (
            <p>{content}</p>
        )
    }
}



class Section extends TextBlock {
    render({ content, children }) {
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
    static hasContent = false
    render({ children }) {

    }
}


const patchableUpdateValue = patchPoint(function (newValue) {
    this.value.value = newValue
})

class Text {
    static isLeaf = true
    static formatToStyle = ([formatName, formatValue]) => {
        if (formatName === 'bold') {
            return ['fontWeight', 'bold']
        }
    }
    constructor(data, parent) {

        const { value = '', props = {}} = data
        this.data = data
        this.value = reactive({ value })
        this.props = reactive(props)
        this.parent = parent
    }
    updateValue = patchableUpdateValue
    render({ value, props }) {
        // TODO format to style
        const style = createReactiveAttribute(() => {

            return Object.fromEntries(Object.entries(props.formats || {}).map(Text.formatToStyle))
        })

        return <span _uuid style={style}>{value}</span>
    }
}


export const nodeTypes = {
    Doc,
    Para,
    Text,
    List,
    Section,
    Table,
    Code,
}