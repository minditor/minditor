import {NodeData, findPreviousSiblingInTree, createDefaultContent, Doc} from "./editing";
import {LinkedList} from "./linkedList";
import {createElement} from "./DOM";
export type RenderProp = {content?: Function, children?: Function, value?: Object, props?:any}

export class DocNode {
    children? : LinkedList
    content? : LinkedList
    syncValue? : Function
    value?: {
        value: string
    }
    props? : any
    data? :any
    root?: Doc
    constructor(data: NodeData, container?:LinkedList, root?: Doc) {
        this.data = data
        this.container = container
        this.root = root

        if ((this.constructor as typeof DocNode).hasContent) {
            this.content = new LinkedList(this)
        }
        if ((this.constructor as typeof DocNode).hasChildren) {
            this.children = new LinkedList(this)
        }
    }
    static createDefaultContent?: () => NodeData[]
    static createDefaultChildren?: () =>  NodeData[]
    static setCursor?: (node: DocNode, offset: number, setNativeCursor?: Function) => [DocNode, number] | false | void
    static hasContent?: Boolean
    static hasChildren?: Boolean
    static isLeaf?: Boolean
    static isComponent?: Boolean
    static display: 'block' | 'inline' | 'inlineBlock' = 'block'
    container?: LinkedList
    get parent() {
        return this.container?.owner
    }
    get previousSibling() {
        return this.container?.getItem(this).prev?.node
    }
    get previousSiblingInTree() {
        return findPreviousSiblingInTree(this)
    }
    get nextSibling() {
        return this.container?.getItem(this).next?.node
    }
    cloneEmpty() {
        const data: NodeData = { type: this.data.type }
        const Type = this.constructor as typeof DocNode
        if (Type.hasContent) {
            data.content = createDefaultContent()
        }

        if (Type.hasChildren) {
            data.children = []
        }

        // FIXME CAUTION 这样才会递归建立 content,children
        return this.root!.buildModelFromData(data).result
    }
    remove() {
        return this.container?.removeBetween(this.previousSibling, this)
    }

    render(prop: RenderProp): HTMLElement {
        // @ts-ignore
        return <div>define your own render</div>
    }
    toJSON() {
        const result : { type: string, content?: any[], children? : any[], value?: any } = { type: this.data.type }
        if ((this.constructor as typeof DocNode).hasContent) {
            result.content = []
            this.content?.forEach((item:DocNode) => {
                result.content!.push(item.toJSON())
            })
        }

        if ((this.constructor as typeof DocNode).hasChildren) {
            result.children = []
            this.children?.forEach((item: DocNode) => {
                result.children!.push(item.toJSON())
            })
        }

        if (this.value) {
            result.value = this.value.value
        }

        return result
    }
}