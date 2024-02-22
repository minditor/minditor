import {createElement, createRoot} from "axii";
import {Component, InlineComponent} from "./DocumentContent.js";

export class AxiiInlineComponent extends InlineComponent {
    public axiiRoot: any

    renderInner(...argv: any[]): JSX.Element | null {
        return null
    }

    destroy() {
        super.destroy();
        this.axiiRoot.destroy()
    }

    render(...argv: any[]) {
        const rootElement = <div style={{display: 'inline-block'}}></div>
        this.axiiRoot = createRoot(rootElement as HTMLElement)
        this.axiiRoot.render(this.renderInner(...argv))
        return rootElement
    }
}

export class AxiiComponent extends Component {
    public axiiRoot: any

    renderInner(...argv: any[]): JSX.Element | null {
        return null
    }

    destroy() {
        super.destroy();
        this.axiiRoot.destroy()
    }

    render(...argv: any[]) {
        const rootElement = <div style={{display: 'block'}} contenteditable={false}></div>
        this.axiiRoot = createRoot(rootElement as HTMLElement)
        this.axiiRoot.render(this.renderInner(...argv))
        return rootElement
    }
}