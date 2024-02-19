import {createElement} from "axii";
import {InlineComponent} from "../DocumentContent.js";

export class Link extends InlineComponent {
    render() {
        return <a>Link: {this.data.value}</a>
    }
}
