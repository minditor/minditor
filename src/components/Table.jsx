/**@jsx createElement*/
import { createElement, useState, useEffect, StrictMode, cloneElement} from "react";
import ReactDOM from 'react-dom/client'
import {reactive} from "@ariesate/reactivity";

function Table({ value }) {
    return (
        <div data-component tabindex="-1">
            <span></span>
            <table border={1} contentEditable={true}>
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


function toReactValue(attachValue) {
    return (el) => {
        return cloneElement(el, {
            ref: (dom) => {
                if (dom) {
                    attachValue(dom)
                }
            }
        })
    }
}


export default class ExportTable {
    static isLeaf = true
    constructor(data, parent) {
        this.parent = parent
        const { value = '', props = {}} = data
        this.data = data
        this.value = reactive({ value })
    }
    render({ value }) {
        const root = document.createElement('div')
        // const root = document.getElementById('app')
        ReactDOM.createRoot(root).render(
            <Table value={toReactValue(value)}/>
        )
        return root
        // return document.createElement('div')
    }
}


