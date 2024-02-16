import {Block, Text} from "./DocumentContent.js";

export class DocRange {
    static cursor(startBlock: Block, startText: Text, startOffset: number,) {
        return new DocRange(startBlock, startText, startOffset, startBlock, startText, startOffset)
    }

    constructor(public startBlock: Block, public startText: Text, public startOffset: number, public endBlock: Block, public endText: Text, public endOffset: number) {
    }

    get isCollapsed() {
        return this.startText === this.endText && this.startOffset === this.endOffset
    }

    get isInSameBlock() {
        return this.startBlock === this.endBlock
    }

    get isInSameInline() {
        return this.startText === this.endText
    }

    get isSibling() {
        return this.startText.next === this.endText
    }

    get isFull() {
        return this.startOffset === 0 && this.endOffset === this.endText.data.value.length
    }

    get isEndFull() {
        return this.endOffset === this.endText.data.value.length
    }
}