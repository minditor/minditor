/**@jsx createElement*/
// @ts-ignore
import {createElement} from "./DOM";
import {LinkedList, LinkedListFragment} from "./linkedList";
import {createReactiveAttribute} from "./buildReactiveView";
// @ts-ignore
import {patchPoint, reactive} from '@ariesate/reactivity'
import { NodeType, RenderProp } from "./NodeType";
// @ts-ignore
import Table from './components/Table'
// @ts-ignore
// import Code from './components/Code'
import {createDefaultNode as defaultCreateDefaultNode, NodeData} from "./editing";


class TextBlock extends NodeType{
    content = new LinkedList(this)
    children = new LinkedList(this)
    data?: NodeData
    container?: LinkedList
    static hasContent = true
    static hasChildren = true
}

class Doc extends TextBlock{
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
    static unwrap(node: NodeType, createDefaultNode: (content?: LinkedList) => NodeType = defaultCreateDefaultNode) {
        const parent = node.parent
        if (parent.constructor === ListItem) {

            // TODO 要不要 waitUpdate?
            const { removed: removedSiblings } = parent.children.removeBetween(node)
            // 自己不是一级节点，往上提一级，接管父节点后面的兄弟节点。
            node.remove()

            // 接管了 父元素的所有兄弟节点。
            // TODO 要不要 waitUpdate?
            if (removedSiblings?.from) {
                node.children!.insertBefore(new LinkedListFragment(removedSiblings!))
            }

            // 提了一级上来
            parent.parent.children.insertAfter(node, parent)

        } else if (parent.constructor === List)  {
            // 1. content 变 para。2. children 提上了，如果没有了，那么整个结构都不要了。 3. 如果自己不是第一个，还要和前面的 List 断开变成两个结构。
            const previousSibling = node.previousSibling

            // 把自己后面的都移除掉，用来创建新的 List
            const {removed: removedSiblings} = parent.children.removeBetween(node)

            node.remove()
            const newNode = createDefaultNode(node.content!.move())

            // 把转化成了普通节点的新节点插入
            parent.parent.children.insertAfter(newNode, parent)
            // 把前面的兄弟节点变成新的 list
            if (removedSiblings?.from || node.children?.tail) {
                const newList = new List({type: 'List'})
                if (node.children?.tail) {
                    newList.children.insertBefore(node.children.move())
                }

                if (removedSiblings?.from) {
                    newList.children.insertBefore(new LinkedListFragment(removedSiblings!))
                }

                parent.parent.children.insertAfter(newList, newNode)
            }

            // 说明自己是第一个，那么原来这个 List 里面什么也没有了，不要了
            if (!previousSibling) {
                parent.remove()
            }

        } else {
            throw new Error('invalid listItem, something wrong')
        }
    }
    static wrap(node: NodeType) {
        // TODO 自己降一级，其他不变
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