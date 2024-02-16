import {createElement} from 'axii'
import 'highlight.js/styles/xcode.css'
import {Component} from "../DocumentContent.js";


import {basicSetup} from "codemirror"
import {EditorView, keymap} from "@codemirror/view"
import {javascript,} from "@codemirror/lang-javascript"
import {python} from "@codemirror/lang-python"
import {php} from "@codemirror/lang-php"
import {cpp} from "@codemirror/lang-cpp"
import {java} from "@codemirror/lang-java"
import {sql} from "@codemirror/lang-sql"
import {json} from "@codemirror/lang-json"
import {rust} from "@codemirror/lang-rust"
import {css} from "@codemirror/lang-css"
import {html} from "@codemirror/lang-html"
import {sass} from "@codemirror/lang-sass"
import {less} from "@codemirror/lang-less"
import {xml} from "@codemirror/lang-xml"
import {yaml} from "@codemirror/lang-yaml"
import {indentWithTab} from "@codemirror/commands"


export type CodeData = {
    value: string,
    language: keyof (typeof Code)['langToPlugin']
}

// TODO language selection
export class Code extends Component {
    static displayName = 'Code'
    public element?: HTMLElement
    static langToPlugin = {
        javascript: javascript(),
        js: javascript(),
        typescript: javascript({ typescript: true}),
        jsx: javascript({ jsx: true}),
        tsx: javascript({ jsx: true, typescript: true}),
        python: python(),
        php: php(),
        cpp: cpp(),
        java: java(),
        sql: sql(),
        json: json(),
        rust: rust(),
        css: css(),
        html: html(),
        sass: sass(),
        less: less(),
        xml: xml(),
        yaml: yaml()
    }
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
            language: this.data.language
        }
    }
    onMount() {
        console.log('code mirror mount')
        this.editor =new EditorView({
            doc: this.data.value,
            extensions: [
                basicSetup,
                keymap.of([indentWithTab]),
                Code.langToPlugin[this.data.language],
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

