import {DocumentContent} from "./Content";
import {DocNode, DocNodeData, Text} from "./DocNode";
import {DocumentContentView} from "./View";
import {Plugin} from './Plugin'
import {assert} from "./util";

export class Document {
    public view: DocumentContentView
    public content: DocumentContent
    public plugins: Plugin[] = []
    constructor(data: DocNodeData[], docNodeTypes: {[k: string]: (typeof DocNode|typeof Text)}, public Plugins: (typeof Plugin)[]) {
        this.content = new DocumentContent(data, docNodeTypes)
        this.view = new DocumentContentView(this.content)
    }
    initializePlugin(PluginClass: typeof Plugin) {
        const plugin = new PluginClass(this)
        this.plugins.push(plugin)
    }
    render() {
        assert(!this.element, 'document should not rerender')
        this.element = this.view.render()

        this.Plugins.map((PluginClass: typeof Plugin) => this.initializePlugin(PluginClass))

        return this.element
    }
}
