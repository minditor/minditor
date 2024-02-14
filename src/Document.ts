import {DocumentContent, DocNode, BlockData, Block, InlineData, Inline} from "./DocumentContent.js";
import {DocumentContentView} from "./View";
import {Plugin} from './Plugin'
import {assert} from "./util";
import {GlobalState, state as defaultGlobalState } from './globals'
import { DocumentContentHistory } from "./DocumentContentHistory.js";

export type DocumentData = {
    name: string,
    children: BlockData[]
}

export class Document {
    public view: DocumentContentView
    public content: DocumentContent
    public history: DocumentContentHistory
    public plugins: Plugin[] = []
    element?: HTMLElement
    constructor(
        public container: HTMLElement,
        public jsonData: DocumentData,
        public docNodeTypes: {[k: string]: typeof DocNode},
        public Plugins: (typeof Plugin)[],
        public globalState: GlobalState = defaultGlobalState
    ) {
        this.content = new DocumentContent(DocumentContent.createBlocksFromData(jsonData.children, docNodeTypes))
        this.history = new DocumentContentHistory(this)
        this.view = new DocumentContentView(this.content, globalState, this.history)
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
        return {
            type: 'Document',
            children: this.content.toJSON()
        }
    }
}
