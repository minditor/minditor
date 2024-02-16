import {createElement} from 'axii'
import highlight from 'highlight.js';
import 'highlight.js/styles/xcode.css'
import {setNativeCursor} from "../util";
import {Component} from "../DocumentContent.js";


export type CodeData = {
    value: string,
    language: string
}

export class Code extends Component {
    static displayName = 'Code'
    public element?: HTMLElement
    static langAlias = {
        'js' : 'javascript',
        'ts': 'typescript',
    } as any
    constructor(public data: CodeData) {
        super(data);
    }
    focus(offset: number = 0) {
        setNativeCursor(this.element!, offset)
    }
    getHighlightCode() {
        return highlight.highlight(this.element?.innerText||this.data.value, { language: this.data.language }).value
    }
    onBlur = () => {
        this.element!.innerHTML = this.getHighlightCode()
    }
    toJSON() {
        return {
            type: 'Code',
            value: this.element!.innerText,
            language: Code.langAlias[this.data.language] || this.data.language
        }
    }
    // TODO language selection
    render() : HTMLElement{
        this.element = <code
            contenteditable={true}
            dangerouslySetInnerHTML={this.getHighlightCode()}
        ></code> as unknown as HTMLElement

        return <pre
            data-isolated
            style={{background:"#eee", padding:10}}
            contenteditable={false}
            onFocusout={this.onBlur}
            onKeydown={(e: KeyboardEvent) => {
                e.stopPropagation()
            }}
        >
            {this.element}
        </pre> as unknown as HTMLElement
    }
}

