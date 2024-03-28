import {createElement, atom, Atom} from 'axii'
import {Component} from "../DocumentContent.js";
import {Input} from "../lib/Input.js";

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
import {AxiiComponent} from "../AxiiComponent.js";
import {Radio} from "../lib/Radio.js";
import {ConfigurableBlock} from "../plugins/BlockTool.js";

export type CodeData = {
    value: string,
    language: keyof (typeof Code)['langToPlugin'],
    codeId?: string,
    codeRunnerUrl?: string
    passCodeThrough?: 'localstorage' | 'url',
}

export class Code extends AxiiComponent implements ConfigurableBlock {
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
    public codeId: Atom<string> = atom('')
    public codeRunnerUrl: Atom<string> = atom('')
    public passCodeThrough: Atom<'localstorage' | 'url'> = atom('localstorage')
    constructor(public data: CodeData) {
        super(data);
        this.codeId(data.codeId || '')
        this.codeRunnerUrl(data.codeRunnerUrl || '/playground.html')
        this.passCodeThrough(data.passCodeThrough || 'localstorage')

    }
    focus() {
        this.editor?.focus()
    }

    toJSON() {
        return {
            type: 'Code',
            value: this.editor?.state.doc.toString() ?? this.data.value,
            language: this.data.language,
            codeId: this.codeId(),
            codeRunnerUrl: this.codeRunnerUrl(),
            passCodeThrough: this.passCodeThrough()
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
    renderInner() : HTMLElement{
        const style={
            padding: 10,
            border: '1px solid #f0f0f0',
            borderRadius: 4,
            outline: 'none'
        }
        const buttonStyle= {
            display: 'inline-block',
            padding: '5px 10px',
            fontSize:12,
            backgroundColor: '#050404',
            color: 'white',
            borderRadius: 4,
            cursor: 'pointer'
        }

        return <div>
            {this.element = <div style={style} contenteditable={false} onKeyDown={(e: KeyboardEvent) => e.stopPropagation()}></div> as HTMLElement}
            {() => this.codeId() ? (<div style={{display: 'flex', justifyContent: 'flex-end', marginTop: 4, gap: 8}}>
                <div style={buttonStyle}>
                    Copy
                </div>
                <div style={buttonStyle} onClick={this.openCodeRunner}>
                    Play
                </div>
            </div>) : null}

        </div> as HTMLElement
    }

    renderSettings() {
        return (
            <div style={{display:'flex', flexDirection:'column', gap:8}}>
                <div>
                    <Input value={this.codeId} placeholder="code id"/>
                </div>
                <div>
                    <Input value={this.codeRunnerUrl} placeholder="runner url"/>
                </div>
                <div>
                    <Radio value={this.passCodeThrough} options={['localstorage', 'url']}/>
                </div>
            </div>
        )
    }
    copyCode = () => {
        navigator.clipboard.writeText(this.editor?.state.doc.toString() ?? this.data.value)
    }

    openCodeRunner = () => {
        const code = this.editor?.state.doc.toString() ?? this.data.value
        const codeId = this.codeId()
        const passCodeThrough = this.passCodeThrough()
        const codeRunnerUrl = this.codeRunnerUrl()

        if (passCodeThrough === 'localstorage') {
            localStorage.setItem(codeId, code)
            window.open(`${codeRunnerUrl!}?codeId=${codeId}`, '_blank')
        } else if (passCodeThrough === 'url') {
            window.open(`${codeRunnerUrl!}?codeId=${codeId}&code=${encodeURIComponent(code)}`,'_blank')
        } else {
            throw new Error(`unknown passCodeThrough ${this.data.passCodeThrough}`)
        }
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
