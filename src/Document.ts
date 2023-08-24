import {DocumentContent} from "./Content";
import {DocNode, DocNodeData, Text} from "./DocNode";
import {DocumentContentView} from "./View";
import {Plugin} from './Plugin'
import {assert} from "./util";

export class Document {
    public view: DocumentContentView
    public content: DocumentContent
    public plugins: Plugin[] = []
    constructor(public container: HTMLElement, data: DocNodeData, docNodeTypes: {[k: string]: (typeof DocNode|typeof Text)}, public Plugins: (typeof Plugin)[]) {
        this.content = new DocumentContent(data, docNodeTypes)
        this.view = new DocumentContentView(this.content)
    }
    initializePlugin(PluginClass: typeof Plugin) {
        const plugin = new PluginClass(this)
        this.plugins.push(plugin)
    }
    render() {
        const element = this.renderDoc()
        const pluginViews = this.renderPluginViews()
        // 注意这里
        if (!this.container.style.position) this.container.style.position = 'relative'

        this.container.appendChild(element)
        this.container.appendChild(pluginViews)
    }
    renderDoc() {
        assert(!this.element, 'document should not rerender')
        this.element = this.view.render()

        this.Plugins.map((PluginClass: typeof Plugin) => this.initializePlugin(PluginClass))

        return this.element
    }
    renderPluginViews() {
        const fragment = document.createDocumentFragment()
        this.plugins.forEach(plugin => {
            const view = plugin.renderPluginView()
            if (view) fragment.append(view)
        })
        return fragment
    }
    toJSON() {
        return {
            type: 'Document',
            children: this.content.toArrayJSON()
        }
    }
}
