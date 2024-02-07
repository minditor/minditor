import {DocumentContent, DocNode, BlockData, Block, InlineData, Inline} from "./DocumentContent.js";
import {DocumentContentView} from "./View";
import {Plugin} from './Plugin'
import {assert} from "./util";


export type DocumentData = {
    name: string,
    content: BlockData[]
}

export class Document {
    public view: DocumentContentView
    public content: DocumentContent
    public plugins: Plugin[] = []
    element?: HTMLElement
    createBlocks(jsonData: BlockData[], docNodeTypes: {[k: string]: typeof DocNode}) : Block {

        let head: Block|undefined
        let prevNode: Block|undefined
        jsonData.forEach(docNodeData => {
            const BlockClass = docNodeTypes[docNodeData.type]! as typeof Block
            const docNode = new BlockClass(docNodeData.props)

            docNode.firstChild =  this.createInlines(docNodeData.content, docNodeTypes)

            if (!head) {
                head = docNode
            }
            if (prevNode) {
                prevNode.nextSibling = docNode
                docNode.previousSibling = prevNode
            }
            prevNode = docNode!
        })
        return head!
    }
    createInlines(jsonData: InlineData[], docNodeTypes: {[k: string]: typeof DocNode}): Inline {
        let head: Inline|undefined
        let prevNode: Inline|undefined
        jsonData.forEach(inlineData => {
            const InlineClass = docNodeTypes[inlineData.type]! as typeof Inline
            const inline = new InlineClass(inlineData.props)
            if (!head) {
                head = inline
            }
            if (prevNode) {
                prevNode.nextSibling = inline
                inline.previousSibling = prevNode
            }
            prevNode = inline
        })
        return head!
    }
    constructor(public container: HTMLElement, public jsonData: DocumentData, public docNodeTypes: {[k: string]: typeof DocNode}, public Plugins: (typeof Plugin)[]) {
        this.content = new DocumentContent(this.createBlocks(jsonData.content, docNodeTypes))
        this.view = new DocumentContentView(this.content)
    }
    initializePlugin(PluginClass: typeof Plugin) {
        const plugin = new PluginClass(this)
        this.plugins.push(plugin)
    }
    render() {
        const element = this.renderDoc()
        // const pluginViews = this.renderPluginViews()
        // 注意这里
        if (!this.container.style.position) this.container.style.position = 'relative'

        this.container.appendChild(element)
        // this.container.appendChild(pluginViews)
    }
    renderDoc() {
        assert(!this.element, 'document should not rerender')
        this.element = this.view.render()

        this.Plugins.map((PluginClass: typeof Plugin) => this.initializePlugin(PluginClass))

        return this.element
    }
    renderPluginViews() {
        // const fragment = document.createDocumentFragment()
        // this.plugins.forEach(plugin => {
        //     const view = plugin.renderPluginView()
        //     if (view) fragment.append(view)
        // })
        // return fragment
    }
    toJSON() {
        // return {
        //     type: 'Document',
        //     children: this.content.toArrayJSON()
        // }
    }
}
