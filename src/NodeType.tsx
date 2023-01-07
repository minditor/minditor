import {NodeData, findPreviousSiblingInTree, createDefaultContent, buildModelFromData} from "./editing";
import {LinkedList} from "./linkedList";
import {createElement} from "./DOM";
export type RenderProp = {content?: Function, children?: Function, value?: Object, props?:any}

export class NodeType {
    constructor(data: NodeData, container?:LinkedList) {
        this.data = data
        this.container = container
        if ((this.constructor as typeof NodeType).hasContent) {
            this.content = new LinkedList(this)
        }
        if ((this.constructor as typeof NodeType).hasChildren) {
            this.children = new LinkedList(this)
        }
    }
    static createDefaultContent?: () => NodeData[]
    static createDefaultChildren?: () =>  NodeData[]
    static setCursor?: (node: NodeType, offset: number) => [NodeType, number] | false
    static hasContent?: Boolean
    static hasChildren?: Boolean
    static isLeaf?: Boolean
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
        const Type = this.constructor as typeof NodeType
        if (Type.hasContent) {
            data.content = createDefaultContent()
        }

        if (Type.hasChildren) {
            data.children = []
        }

        // CAUTION 这样才会递归建立 content,children
        return buildModelFromData(data).result
    }
    remove() {
        return this.container?.removeBetween(this.previousSibling, this)
    }
    children? : LinkedList
    content? : LinkedList
    syncValue? : Function
    value?: {
        value: string
    }
    props? : any
    data? :any
    render(prop: RenderProp): HTMLElement {
        // @ts-ignore
        return <div>define your own render</div>
    }
    toJSON() {
        const result : { type: string, content?: any[], children? : any[], value?: any } = { type: this.data.type }
        if ((this.constructor as typeof NodeType).hasContent) {
            result.content = []
            this.content?.forEach((item:NodeType) => {
                result.content!.push(item.toJSON())
            })
        }

        if ((this.constructor as typeof NodeType).hasChildren) {
            result.children = []
            this.children?.forEach((item: NodeType) => {
                result.children!.push(item.toJSON())
            })
        }

        if (this.value) {
            result.value = this.value.value
        }

        return result
    }
}