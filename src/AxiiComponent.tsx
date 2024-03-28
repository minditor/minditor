import {createElement, createRoot} from "axii";
import {Component, InlineComponent, Text} from "./DocumentContent.js";

export class AxiiInlineComponent extends InlineComponent {
    public axiiRoot: any

    destroy() {
        super.destroy();
        this.axiiRoot.destroy()
    }
    renderContainer() {
        return <div style={{display: 'inline-block'}}></div>
    }
    renderInner(...argv: any[]): JSX.Element | null {
        return null
    }
    render(...argv: any[]) {
        const rootElement = this.renderContainer()
        this.axiiRoot = createRoot(rootElement as HTMLElement)
        this.axiiRoot.render(this.renderInner(...argv))
        return rootElement
    }
}

export class AxiiComponent extends Component {

    public axiiRoot: any
    public axiiSettingsRoot: any
    renderContainer() {
        return <div style={{display: 'block'}} contenteditable={false}></div>
    }
    renderInner(...argv: any[]): JSX.Element | null {
        return null
    }
    destroy() {
        super.destroy();
        this.axiiRoot.destroy()
    }
    render(...argv: any[]) {
        const rootElement = this.renderContainer()
        this.axiiRoot = createRoot(rootElement as HTMLElement)
        this.axiiRoot.render(this.renderInner(...argv))
        return rootElement
    }
}

export class AxiiTextBasedComponent extends AxiiComponent {
    static asTextNode = true
    renderContainer() {
        return <div style={{display: 'block'}} contenteditable={true}></div>
    }
    toText() {
        let content = ''
        let current = this.firstChild
        while (current) {
            if (current instanceof Text) {
                content += current.data.value
            } else if( (current as Text).toText ){
                content += (current as Text).toText()
            } else {
                // ignore Inline which cannot be converted to text
            }
            current = current.next
        }
        return content
    }
}