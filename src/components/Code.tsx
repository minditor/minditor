import {DocNode, DocNodeData, IsolatedComponent, RenderContext, RenderProps} from "../DocNode";
import { atom } from 'axii'
import {createElement} from 'axii'
import {SuggestionWidget} from "../plugins/SuggestionTool";
import highlight from 'highlight.js';
import 'highlight.js/styles/tokyo-night-light.css'
import {deepClone, setNativeCursor} from "../util";

export class Code extends IsolatedComponent {
    public value: string
    public element?: HTMLElement
    public props: {[k: string]: any}
    constructor(public data: DocNodeData, parent?: DocNode) {
        super(data, parent);
        this.value = data.value || ``
        this.props = data.props || { language: 'javascript'}
    }
    focus(offset: number = 0) {
        setNativeCursor(this.element!, offset)
    }
    getHighlightCode() {
        return highlight.highlight(this.element?.innerText||this.value, { language: this.props.language }).value
    }
    onBlur = () => {
        this.element!.innerHTML = this.getHighlightCode()
    }
    toJSON() {
        return {type: 'Code', value: this.element.innerText, props: deepClone(this.props)}
    }
    // TODO language selection
    render({content}:RenderProps, {createElement}: RenderContext) : HTMLElement{
        this.element = <code
            contenteditable={true}
            dangerouslySetInnerHTML={this.getHighlightCode()}
        ></code> as unknown as HTMLElement

        return <pre
            data-isolated
            style={{background:"#eee", padding:10}}
            contenteditable={false}
            onFocusout={this.onBlur}
            onKeydown={e => {
                e.stopPropagation()
            }}
        >
            {this.element}
        </pre> as unknown as HTMLElement
    }
}

export class CodeSuggestionWidget extends SuggestionWidget {
    static displayName =`ImageSuggestionWidget`
    insertCodeBlock = (event: Event) =>{
        const codeDocNode = new Code({type: 'Code', value: ''})
        this.document.content.replaceDocNode(codeDocNode, this.document.view.state.contentRange().startNode)
        this.parent.activated(false)
        // TODO 如果有 nextSibling ，就 focus 上去，如果没有，就创建一个新的 para，然后 focus
        codeDocNode.focus()
    }
    render() {
        return <div >
            <button onClick={this.insertCodeBlock}>code</button>
        </div>
    }
}
