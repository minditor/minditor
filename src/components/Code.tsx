/**@jsx createElement*/
/* @ts-ignore */
import { createElement, useState, useEffect, StrictMode, cloneElement} from "react";
/* @ts-ignore */
import ReactDOM from 'react-dom/client'
/* @ts-ignore */
import {reactive} from "@ariesate/reactivity";
import { NodeType } from "../NodeType";
import {NodeData} from "../editing";
import {LinkedList} from "../linkedList";

function Code() {
    return (
        <div style={{padding:10, background:'gray'}} contenteditable={false}>
            <div>
                <span>lang: </span>
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
    static isolated = true
    constructor(data: NodeData, container: LinkedList) {
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
            <Code />
        )
        return root
        // return document.createElement('div')
    }
}


