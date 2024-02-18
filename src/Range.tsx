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
            // CAUTION 注意这里已经处理了 startBlock 和 endBlock 相同的情况
            if (currentBlock === this.startBlock) {
                // 从 startText 一直到尾部都存起来
                let currentText:Inline|null = this.startText
                const contentData: InlineData[] = []
                while(currentText && currentText!== this.endText.next) {
                    contentData.push(currentText.toJSON())
                    currentText = currentText.next
                }
                blocks.push({
                    type: 'Paragraph',
                    content: contentData
                })
            } else if (currentBlock === this.endBlock) {
                // 从头到 endText 都存起来
                let currentText:Inline|null = this.endBlock.firstChild
                const contentData: InlineData[] = []
                while(currentText && currentText !== this.endText.next) {
                    contentData.push(currentText.toJSON())
                    currentText = currentText.next
                }
                blocks.push({
                    type: 'Paragraph',
                    content: contentData
                })
            } else {
                // 整个 block 都存起来
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
                // 从 startText 一直到尾部都存起来
                let currentText:Inline|null = this.startText
                // CAUTION 这里处理了 startBlock 和 endBlock 相同的情况
                while(currentText && currentText!== this.endText.next) {
                    if (currentText instanceof Text) {
                        content += currentText.data.value
                    } else  if ((currentText  as Text).toText)  {
                        content += (currentText as Text).toText()
                    } else {
                        // 不能变成 text 的 Inline 节点
                    }
                    currentText = currentText.next
                }

            } else if (currentBlock === this.endBlock) {
                // 从头到 endText 都存起来
                let currentText:Inline|null = this.endBlock.firstChild
                while(currentText && currentText !== this.endText.next) {
                    if (currentText instanceof Text) {
                        content += currentText.data.value
                    } else  if ((currentText  as Text).toText)  {
                        content += (currentText as Text).toText()
                    } else {
                        // 不能变成 text 的 Inline 节点
                    }
                    currentText = currentText.next
                }
            } else {
                // 整个 block 都存起来
                if ((currentBlock as TextBasedBlock).toText) {
                    content += (currentBlock as TextBasedBlock).toText()
                } else {
                    // 不能处理的 block
                }
            }
            currentBlock = currentBlock.next
        }

        return content
    }
}