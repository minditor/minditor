import {
    Block,
    BlockData,
    Inline,
    InlineData,
    Text,
    TextBasedBlock,
} from "./DocumentContent.js";

export class DocRange {
    static cursor(startBlock: Block, startText: Text, startOffset: number,) {
        return new DocRange(startBlock, startText, startOffset, startBlock, startText, startOffset)
    }

    constructor(public startBlock: Block, public startText: Text, public startOffset: number, public endBlock: Block, public endText: Text, public endOffset: number) {
    }

    get isCollapsed() {
        return (this.startText === this.endText && this.startOffset === this.endOffset)
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

    get isFullInline() {
        return this.startOffset === 0 && this.endOffset === this.endText.data.value.length && this.startText === this.endText
    }

    get isFullBlock() {
        return this.startText === this.startBlock.firstChild && this.startOffset === 0
            && this.endText === this.endBlock.lastChild && this.endOffset === this.endText.data.value.length
    }

    get isEndFull() {
        return this.endOffset === this.endText.data.value.length
    }
    toJSON() {
        const blocks: BlockData[] = []

        let currentBlock:Block|null = this.startBlock
        while(currentBlock && currentBlock !== this.endBlock.next) {
            // CAUTION here include the situation that startBlock and endBlock are the same
            if (currentBlock === this.startBlock) {
                // 从 startText 一直到尾部都存起来
                let currentText:Inline|null = this.startText
                const contentData: InlineData[] = []
                while(currentText && currentText!== this.endText.next) {
                    if (currentText === this.startText && currentText instanceof Text) {
                        const value = currentText === this.startText  ?
                            currentText.data.value.slice(this.startOffset, currentText === this.endText ? this.endOffset : currentText.data.value.length) :
                            currentText.data.value
                        contentData.push({ type: 'Text', value })
                    } else {
                        contentData.push(currentText.toJSON())
                    }

                    currentText = currentText.next
                }
                blocks.push({
                    type: 'Paragraph',
                    content: contentData
                })
            } else if (currentBlock === this.endBlock) {
                // save from start to endText
                let currentText:Inline|null = this.endBlock.firstChild
                const contentData: InlineData[] = []
                while(currentText && currentText !== this.endText.next) {
                    if (currentText === this.endText && currentText instanceof Text) {
                        const value = currentText.data.value.slice(0, this.endOffset)
                        contentData.push({ type: 'Text', value })
                    } else {
                        contentData.push(currentText.toJSON())
                    }
                    currentText = currentText.next
                }
                blocks.push({
                    type: 'Paragraph',
                    content: contentData
                })
            } else {
                // save the whole block
                blocks.push(currentBlock.toJSON())
            }
            currentBlock = currentBlock.next
        }

        return blocks
    }
    toText() {
        let content = ''
        let currentBlock:Block|null = this.startBlock
        while(currentBlock && currentBlock !== this.endBlock.next) {
            if (currentBlock === this.startBlock) {
                let currentText:Inline|null = this.startText
                // CAUTION here include the situation that startBlock and endBlock are the same
                while(currentText && currentText!== this.endText.next) {
                    if (currentText instanceof Text) {
                        content += currentText === this.startText  ?
                            currentText.data.value.slice(this.startOffset, currentText === this.endText ? this.endOffset : currentText.data.value.length) :
                            currentText.data.value
                    } else if ((currentText  as Text).toText)  {
                        content += (currentText as Text).toText()
                    } else {
                        // ignore those Inline nodes that can't be converted to text
                    }
                    currentText = currentText.next
                }

            } else if (currentBlock === this.endBlock) {
                let currentText:Inline|null = this.endBlock.firstChild
                while(currentText && currentText !== this.endText.next) {
                    if (currentText instanceof Text) {
                        content += currentText === this.endText ? currentText.data.value.slice(0, this.endOffset) :currentText.data.value
                    } else  if ((currentText  as Text).toText)  {
                        content += (currentText as Text).toText()
                    } else {
                        // ignore those Inline nodes that can't be converted to text
                    }
                    currentText = currentText.next
                }
            } else {
                if ((currentBlock as TextBasedBlock).toText) {
                    content += (currentBlock as TextBasedBlock).toText()
                } else {
                    // ignore those block that can't be converted to text
                }
            }
            currentBlock = currentBlock.next
        }

        return content
    }
}