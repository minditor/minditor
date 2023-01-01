/**@jsx createElement*/
import { createElement, useState, useEffect, StrictMode, cloneElement} from "react";
import ReactDOM from 'react-dom/client'
import {reactive} from "@ariesate/reactivity";
import { NodeType } from "../NodeType";

function Code({ value, props }) {
    return (
        <div style={{padding:10, background:'gray'}} contentEditable={false}>
            <div>
                <span>lang: </span>
                <span>{props?.lang}</span>
            </div>
            <pre>
                import xxx from
            </pre>
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


export default class ExportCode extends NodeType{
    static isLeaf = true
    constructor(data, container) {
        super(data, container)
        const { value = '', props = {}} = data
        this.props = reactive(props)
        this.value = reactive({ value })
    }
    render() {
        const root = document.createElement('div')
        // const root = document.getElementById('app')
        console.log(this.props)
        ReactDOM.createRoot(root).render(
            <Code value={toReactValue(this.value)} props={this.props}/>
        )
        return root
        // return document.createElement('div')
    }
}


