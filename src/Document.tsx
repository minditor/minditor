import { atom, Atom } from 'rata'



type DocNodeData = {
    [k: string]: any,
    type: string,
    children?: DocNodeData[],
}

type ViewNode = {
    [k: string]: any,
    type: string|typeof Array,

}

export function createElement(type: ViewNode["type"], props: object, ...children: any[]) : ViewNode{
    return {type, props, children}
}

export const Fragment = Array

export class DocNode {
    public parent: Atom<DocNode> =  atom(null)
    public prev: Atom<DocNode> = atom(null)
    public next: DocNode|null = null
    public viewNode
    constructor(public data: DocNodeData, parent: DocNode) {
        this.parent(parent)
    }
    render() : ViewNode{
        return <></>
    }
}

export class Document {
    constructor(data, public docNodeTypes) {
        this.root = this.recursiveCreateDocNode(data)
        this.buildLeafLinkedList()
        this.renderViewNode()
    }
    recursiveCreateDocNode = (data, parent) => {
        const DocNodeType =  this.docNodeTypes[data.type]
        const newNode = new DocNodeType(data, parent)

        newNode.childList = this.createChildList(data.children.map(child => this.recursiveCreateDocNode(child, newNode)))

        return newNode
    }
    createChildList = (childNodes) => {
        let head
        childNodes.forEach(node => {})
    }
    buildLeafLinkedList() {

    }
    renderViewNode() {

    }
}
