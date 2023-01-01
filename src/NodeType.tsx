import {NodeData} from "./editing";
import {LinkedList} from "./linkedList";
import {createElement} from "./DOM";
export type RenderProp = {content?: Function, children?: Function, value?: Object, props?:any}

export class NodeType {
    constructor(data: NodeData, container?:LinkedList) {
        this.data = data
        this.container = container
    }
    static createDefaultContent?: Function
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
    get nextSibling() {
        return this.container?.getItem(this).next?.node
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
        if (this.content) {
            result.content = []
            this.content?.forEach((item:NodeType) => {
                result.content!.push(item.toJSON())
            })
        }

        if (this.children) {
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