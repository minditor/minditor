import {NodeType} from "./NodeType";
import {viewToNodeMap} from "./editing";
import {scheduleUpdate} from "./buildReactiveView";
import {autorun, autorunForEach} from '@ariesate/reactivity'
import {ShallowRef, Ref} from "@vue/runtime-core";


export function $value(node: Ref | ShallowRef | Function ) {
    return function attach(dom: HTMLElement ) {
        if (dom.childNodes.length) throw new Error('reactive value container should have no siblings')
        autorun(() => {
                dom.innerHTML = typeof node === 'function' ? node() : node.value
            },
            undefined,
            scheduleUpdate
        )
    }
}

export function $attr(createAttribute: Function) {
    return function attach(dom : HTMLElement, attributeName: String, setAttribute: Function) {
        autorun(() => {
            setAttribute(dom, attributeName, createAttribute())
        }, undefined, scheduleUpdate)
    }
}

export function $map() {}