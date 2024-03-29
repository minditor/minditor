import {createElement, atom} from 'axii'
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
import {dracula as theme} from "thememirror"

export type CodeData = {
    value: string,
    language: keyof (typeof Code)['langToPlugin']
}

export class Code extends Component {
    static displayName = 'Code'
    public element?: HTMLElement
    static langToPlugin = {
        javascript: javascript(),
        js: javascript(),
        typescript: javascript({ typescript: true}),
        ts: javascript({ typescript: true}),
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
            value: this.editor?.state.doc.toString() ?? this.data.value,
            language: this.data.language
        }
    }
    toText() {
        return `\`\`\`${this.data.language}
${this.editor?.state.doc.toString() ?? this.data.value}
\`\`\``
    }
    onMount() {
        this.editor =new EditorView({
            doc: this.data.value || '',
            extensions: [
                basicSetup,
                keymap.of([indentWithTab]),
                theme,
                Code.langToPlugin[this.data.language|| 'javascript'] ?? javascript(),
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
        const style={
            padding: 10,
            border: '1px solid #f0f0f0',
            borderRadius: 4,
            outline: 'none'
        }
        this.element = <div style={style} contenteditable={false} onKeyDown={(e: KeyboardEvent) => e.stopPropagation()}/>  as HTMLElement
        return this.element
    }
}

export type CodeLanguagePickerProps = {
    languages: string[],
    onChange: (value: string) => void
}

export function CodeLanguagePicker({languages, onChange}: CodeLanguagePickerProps) {
    const selected = atom<string>(null)

    return (
        <div
            style={{padding:10}}
            onMouseLeave={() => selected(null)}
        >
            {languages.map(lang =>
                <div
                    onMouseEnter={() => selected(lang)}
                    style={() => ({
                        borderRadius:4,
                        background: selected() === lang ? '#f0f0f0' : 'transparent',
                        padding:10,
                        cursor:'pointer'}
                    )}
                    onClick={() => onChange(lang)}>
                    {lang}
                </div>
            )}
        </div>
    )
}
