import {AttributesArg, JSXElementType} from "../src/DOM";

export function createElement(tag: JSXElementType, attrs: AttributesArg = {}, ...children: HTMLElement[] ) {
    return document.createElement('div')
}
