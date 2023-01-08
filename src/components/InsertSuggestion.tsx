/**@jsx createElement*/
// @ts-ignore
import { createElement} from "../DOM";
// @ts-ignore
// @ts-ignore
import {reactive} from "@ariesate/reactivity";
import {NodeType, RenderProp} from "../NodeType";
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


export default class ExportInsertSuggestion extends NodeType{
    static isLeaf = true
    static isComponent = true
    dom: HTMLElement|null = null
    constructor(data: any, container: LinkedList) {
        super(data, container)
        const { value = ''} = data
        this.data = data
        this.value = reactive({ value })
    }
    static setCursor(node: NodeType, offset: number, setNativeCursor?: Function) {
        ((node as ExportInsertSuggestion).dom!.lastElementChild as HTMLInputElement)!.select()
    }
    render(props: RenderProp) {
        this.dom = InsertSuggestion(props)
        return this.dom
    }
}


