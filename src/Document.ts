import {BlockData, DocNode, DocumentContent} from "./DocumentContent.js";
import {DocumentContentView} from "./View";
import {assert} from "./util";
import {GlobalState, state as defaultGlobalState} from './globals'
import {DocumentContentHistory} from "./DocumentContentHistory.js";
import {Clipboard} from "./Clipboard.js";

export type DocumentData = {
    name?: string,
    children: BlockData[]
}

export class Document {
    public view: DocumentContentView
    public content: DocumentContent
    public history: DocumentContentHistory
    public clipboard: Clipboard
    element?: HTMLElement
    static createEmptyDocumentData() : DocumentData {
        return {
            name: 'Document',
            children: DocumentContent.createEmptyContentData()
        }
    }
    constructor(
        public container: HTMLElement,
        public jsonData: DocumentData,
        public docNodeTypes: { [p: string]: typeof DocNode },
        public globalState: GlobalState = defaultGlobalState
    ) {
        this.content = new DocumentContent(DocumentContent.createBlocksFromData(jsonData.children, docNodeTypes), docNodeTypes)
        this.history = new DocumentContentHistory(this)
        this.clipboard = new Clipboard()
        this.view = new DocumentContentView(this, globalState)
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
        // TODO save history to IndexDB?
    }
}
