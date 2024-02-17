import {BlockData, DocNode, DocumentContent} from "./DocumentContent.js";
import {DocumentContentView} from "./View";
import {assert} from "./util";
import {GlobalState, state as defaultGlobalState} from './globals'
import {DocumentContentHistory} from "./DocumentContentHistory.js";

export type DocumentData = {
    name: string,
    children: BlockData[]
}

export class Document {
    public view: DocumentContentView
    public content: DocumentContent
    public history: DocumentContentHistory
    element?: HTMLElement

    constructor(
        public container: HTMLElement,
        public jsonData: DocumentData,
        public docNodeTypes: { [p: string]: typeof DocNode },
        public globalState: GlobalState = defaultGlobalState
    ) {
        this.content = new DocumentContent(DocumentContent.createBlocksFromData(jsonData.children, docNodeTypes))
        this.history = new DocumentContentHistory(this)
        this.view = new DocumentContentView(this.content, globalState, this.history)
    }
    render() {
        const element = this.renderDoc()
        this.container.appendChild(element)
        // 通知插件挂载事件。
        this.view.onMount()
    }
    renderDoc() {
        assert(!this.element, 'document should not rerender')
        this.element = this.view.render()
        return this.element
    }
    toJSON() {
        return {
            type: 'Document',
            children: this.content.toJSON()
        }
    }
    destroy() {
        this.view.destroy()
        // TODO history 要进 indexDB ？
    }
}
