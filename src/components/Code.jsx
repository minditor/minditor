/**@jsx createElement*/
import { createElement, useState, useEffect, StrictMode, cloneElement} from "react";
import ReactDOM from 'react-dom/client'
import {reactive} from "@ariesate/reactivity";

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


function toReactValue(attachValue) {
    return (el) => {
        return cloneElement(el, {
            ref: (dom) => {
                if (dom) {
                    attachValue && attachValue(dom)
                }
            }
        })
    }
}


export default class ExportCode {
    static isLeaf = true
    constructor(data, parent) {
        this.parent = parent
        const { value = '', props = {}} = data
        this.data = data
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


