/**@jsx createElement*/
/**@jsxFrag Fragment*/
// @ts-ignore
import {createElement, Fragment} from "./DOM";
import {LinkedList, LinkedListFragment} from "./linkedList";
import {createReactiveAttribute, setCursor, waitUpdate} from "./buildReactiveView";
// @ts-ignore
import {patchPoint, reactive} from '@ariesate/reactivity'
import { NodeType, RenderProp } from "./NodeType";
// @ts-ignore
import Table from './components/Table'
import InsertSuggestion from './components/InsertSuggestion'
// @ts-ignore
// import Code from './components/Code'
import {NodeData} from "./editing";


class TextBlock extends NodeType{
    data?: NodeData
    container?: LinkedList
    static hasContent = true
    static hasChildren = true
}

class Doc extends TextBlock{
    static hasChildren = true
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
    static setCursor(node: NodeType, offset: number) : [NodeType, number] | false {
        return [node.content!.head.next.node, offset]
    }
    render({ content }: RenderProp) {
        return (
            <p data-type-para>{content}</p>
        )
    }
}



class Section extends TextBlock {
    static setCursor(node: NodeType, offset: number) : [NodeType, number] | false {
        return [node.content!.head.next.node, offset]
    }
    static createDefaultContent() : NodeData[]{
        return [{ type: 'Text', value: ''}]
    }
    render({ content, children }:RenderProp) {
        return (
            <section data-type-section>
                <h1>{content}</h1>
                <div>
                    {children}
                </div>
            </section>
        )
    }
}



class List extends TextBlock{
    static readonly hasContent = false
    static setCursor(node: NodeType, offset: number) : [NodeType, number] | false {
        return ListItem.setCursor(node.children!.head.next.node, offset)
    }
    static createDefaultChildren() : NodeData[] {
        return [{ type: 'ListItem'}]
    }
    render({ children }:RenderProp) {
        return (
            <div data-type-list>
                {children}
            </div>
        )
    }
}

class ListItem extends TextBlock{
    static readonly createSiblingAsDefault = true
    static setCursor(node: NodeType, offset: number) : [NodeType, number] | false {
        return Para.setCursor(node.content!.head.next.node, offset)
    }
    static createDefaultContent() : NodeData[]{
        return [{ type: 'Para', content: [{ type: 'Text', value: ''}]}]
    }
    static async unwrap(node: NodeType, createDefaultNode: (content?: LinkedList) => NodeType = node.root!.createDefaultNode.bind(node.root)) {
        const parent = node.parent
        if (parent.constructor === ListItem) {

            // TODO ????????? waitUpdate?
            const { removed: removedSiblings } = parent.children!.removeBetween(node)
            // ????????????????????????????????????????????????????????????????????????????????????
            node.remove()

            // ????????? ?????????????????????????????????
            // TODO ????????? waitUpdate?
            if (removedSiblings?.from) {
                node.children!.insertBefore(new LinkedListFragment(removedSiblings!))
            }

            // ??????????????????
            parent.parent.children.insertAfter(node, parent)

        } else if (parent.constructor === List)  {
            // 1. content ??? para???2. children ??????????????????????????????????????????????????????????????? 3. ???????????????????????????????????????????????? List ???????????????????????????
            const previousSibling = node.previousSibling

            if (previousSibling) {
                // ?????????????????????????????????????????? list
                const {removed: removedSiblings} = parent.children!.removeBetween(undefined, previousSibling)
                const newList = new List({type: 'List'})
                newList.children!.insertBefore(new LinkedListFragment(removedSiblings!))
                parent.container!.insertBefore(newList, parent)
            }


            // ???????????????????????? Para
            node.remove()
            const newNode = createDefaultNode(node.content!.move())
            // const newNode = buildModelFromData({ type: 'Para', content: node.toJSON().content })
            //
            // ?????????????????????????????????????????????
            // CAUTION TODO ???????????????????????? waitUpdate ???? ???????????????????????????
            // await waitUpdate()
            parent.container!.insertBefore(newNode, parent)
            //
            // ???????????? children ??????????????????
            if (node.children!.size()) {
                parent.children!.insertAfter(node.children!.move())
            }

            // ????????????????????????????????????????????? List ?????????????????????????????????
            if (!parent.children!.size()) {
                parent.remove()
            }

        } else {
            throw new Error('invalid listItem, something wrong')
        }
    }
    static wrap(node: NodeType) {
        // TODO ??????????????????????????????
    }

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
    static readonly display = 'inline'
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
            return Object.assign({}, ...Object.entries(props.formats || {}).map(Text.formatToStyle))
        })
        // @ts-ignore
        return <span data-type-text _uuid style={style}>{value}</span>
        // return <>
        //     <span data-type-text _uuid style={style}>{value}</span>
        //     <span contenteditable={false} dangerouslySetInnerHTML={{__html: '&ZeroWidthSpace;'}}></span>
        // </>
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
    InsertSuggestion
}