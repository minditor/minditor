import {createElement} from 'axii'
import 'highlight.js/styles/xcode.css'
import {Component} from "../DocumentContent.js";


import {basicSetup} from "codemirror"
import {EditorView, keymap} from "@codemirror/view"
import {javascript,} from "@codemirror/lang-javascript"
import {indentWithTab} from "@codemirror/commands"


export type CodeData = {
    value: string,
    language: string
}

// TODO language selection
// TODO 语言支持
export class Code extends Component {
    static displayName = 'Code'
    public element?: HTMLElement
    static langAlias = {
        'js' : 'javascript',
        'ts': 'typescript',
    } as any
    public editor?: EditorView
    constructor(public data: CodeData) {
        super(data);
    }
    focus() {
        this.editor?.focus()
    }

    toJSON() {
        return {
            type: 'Code',
            value: this.element!.innerText,
            language: Code.langAlias[this.data.language] || this.data.language
        }
    }
    onMount() {
        this.editor =new EditorView({
            doc: this.data.value,
            extensions: [
                basicSetup,
                keymap.of([indentWithTab]),
                javascript(),
                EditorView.updateListener.of((e) => {
                    if (e.docChanged) {
                        this.data.value = this.editor!.state.doc.toString()
                    }
                })
            ],
            parent: this.element
        })
    }
    render() : HTMLElement{
        this.element = <div contenteditable={false} onKeyDown={(e: KeyboardEvent) => e.stopPropagation()}/> as unknown as HTMLElement
        return this.element
    }
}

