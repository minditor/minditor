import {createElement} from "axii";
import {Inline, InlineComponent} from "../DocumentContent.js";

type InlineCodeData = {
    value: string
}

export class InlineCode extends InlineComponent {
    static displayName = 'InlineCode'
    public value: string
    constructor(public data: InlineCodeData) {
        super();
        this.value = data.value
    }
    onInput = (e: InputEvent) => {
        this.value = (e.target as HTMLElement).innerText as string
        console.log('onInput', this.value)

    }
    render()  {
        return <div style={{display: 'inline-block', background: '#eee', padding: '4px 8px'}} contenteditable={false}>
            <span contenteditable={true}
                  onInput={this.onInput}>
                {this.data.value}
            </span>
        </div>
    }

    toJSON(): any {
        console.log('toJSON', {
            ...super.toJSON(),
            value: this.value
        })
        return {
            ...super.toJSON(),
            value: this.value
        };
    }

    toText() {
        return this.value
    }
}