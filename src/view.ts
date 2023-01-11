import {NodeType} from "./NodeType";
import {viewToNodeMap} from "./editing";
import {scheduleImmediateUpdate} from "./buildReactiveView";
// @ts-ignore
import {autorun, autorunForEach} from '@ariesate/reactivity'
import {ShallowRef, Ref} from "@vue/runtime-core";


export function $value(node: Ref | ShallowRef | Function ) {
    return function attach(dom: HTMLElement ) {
        if (dom.childNodes.length) throw new Error('reactive value container should have no siblings')
        autorun(() => {
                dom.innerHTML = typeof node === 'function' ? node() : node.value
            },
            undefined,
            scheduleImmediateUpdate
        )
    }
}

export function $attr(createAttribute: Function) {
    return function attach(dom : HTMLElement, attributeName: String, setAttribute: Function) {
        autorun(() => {
            setAttribute(dom, attributeName, createAttribute())
        }, undefined, scheduleImmediateUpdate)
    }
}

export function $map() {}