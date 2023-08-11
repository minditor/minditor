/**@jsx createElement*/
// @ts-ignore
import { createElement} from "../DOM";
// @ts-ignore
// @ts-ignore
import {reactive} from "@ariesate/reactivity";
import {_DocNode, RenderProp} from "../——DocNode";
import {LinkedList} from "../linkedList";


// TODO 怎么写那个 插入的浮层？？？

function InsertSuggestion({ value } : RenderProp) {
    return (
        <div data-component tabindex="-1" contenteditable={false}>
            <span>/</span>
            <input id="iii" />
        </div>
    )
}


export default class ExportInsertSuggestion extends _DocNode{
    static isLeaf = true
    static isComponent = true
    static readonly display = 'inlineBlock'
    dom: HTMLElement|null = null
    constructor(data: any, container: LinkedList) {
        super(data, container)
        const { value = ''} = data
        this.data = data
        this.value = reactive({ value })
    }
    static setCursor(node: _DocNode, offset: number, setNativeCursor?: Function) {
        ((node as ExportInsertSuggestion).dom!.lastElementChild as HTMLInputElement)!.select()
    }
    render(props: RenderProp) {
        this.dom = InsertSuggestion(props)
        return this.dom
    }
}


