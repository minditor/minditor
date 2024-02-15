import {createElement} from "axii";
import {Inline} from "../DocumentContent.js";

type InlineCodeData = {
    value: string
}

export class InlineCode extends Inline {
    static displayName = 'InlineCode'
    constructor(public data: InlineCodeData) {
        super();
    }
    render()  {
        return <span style={{display:'inline-block', background:'#eee', padding:'4px 8px'}}>{this.data.value}</span>
    }
}