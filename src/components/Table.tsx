/**@jsx createElement*/
// @ts-ignore
import { createElement, cloneElement} from "react";
// @ts-ignore
import ReactDOM from 'react-dom/client'
// @ts-ignore
import {reactive} from "@ariesate/reactivity";
import {NodeType, RenderProp} from "../NodeType";
import {LinkedList} from "../linkedList";

function Table({ value } : {value: any}) {
    return (
        <div data-component tabindex="-1">
            <span></span>
            <table contenteditable={true}>
                <thead>
                <tr>
                    <th>head</th>
                </tr>
                </thead>
                <tbody>
                <tr>
                    <td>1111111</td>
                </tr>
                </tbody>
            </table>
            <span></span>
        </div>
    )
}


function toReactValue(attachValue: Function) {
    return (el: HTMLElement) => {
        return cloneElement(el, {
            ref: (dom: HTMLElement) => {
                if (dom) {
                    attachValue(dom)
                }
            }
        })
    }
}


export default class ExportTable extends NodeType{
    static isLeaf = true
    constructor(data: any, container: LinkedList) {
        super(data, container)
        const { value = ''} = data
        this.data = data
        this.value = reactive({ value })
    }
    render({ value }: RenderProp) {
        const root = document.createElement('div')
        // const root = document.getElementById('app')
        ReactDOM.createRoot(root).render(
            <Table value={toReactValue(value as Function)}/>
        )
        return root
        // return document.createElement('div')
    }
}


