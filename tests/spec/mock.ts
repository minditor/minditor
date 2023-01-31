function Fragment() {}
type AttributesArg = {
    [k: string] : any
}
type Component = (props: any) => HTMLElement
type JSXElementType =  string | typeof Fragment | Component

export function createElement(tag: JSXElementType, attrs: AttributesArg = {}, ...children: HTMLElement[] ) {
    return document.createElement('div')
}
