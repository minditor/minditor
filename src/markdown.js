import { nodeTypes } from './nodeTypes'
import {formatRange, replaceNode, setCursor} from "./editing";


// TODO 执行 block 命令时，空格后面可能还有其他的内容，要交给 block 处理。
function createBlockCommands(initialCharacters, createBlock) {
    return {
        onInput: ' ',
        run({ charReader, node }) {
            //  1. 只能在 Para 的 content 里面产生
            if (node.parent.constructor !== nodeTypes.Para) return
            if (node !== node.parent.content.head.next.node) return

            const innerText = charReader.match([initialCharacters])
            debugger
            if(!innerText) return false

            createBlock(innerText, node.parent)
        }
    }
}


// TODO 还有更复杂的 inline 命令，例如插入链接？？？这个 pair match 不合适 它的形式是 ![text](link)
function createInlineComponentCommands() {

}


function createFormatCommands([startChars, closeChars], key, value = true) {
    return {
        onInput: ' ',
        run({ charReader, node }) {
            // TODO 这里并不支持跨节点的 format，需要改造，应该要支持。
            const innerText = charReader.match([startChars, closeChars])
            if (!innerText) return false


            const startOffset = charReader.offset - innerText.length - closeChars.length - startChars.length
            const endOffset = charReader.offset

            //1. 先删了 starChar/closeChars
            node.value.value = node.value.value.slice(0, startOffset) +
                node.value.value.slice(startOffset + startChars.length, endOffset - closeChars.length) +
                node.value.value.slice(endOffset)

            //2. 再执行 format。这时非 innerText 中的内容会独立出去，node 里面只剩下 innerText 的内容了。
            formatRange({
                startNode: node,
                endNode: node,
                startOffset,
                endOffset: endOffset - startChars.length - closeChars.length
            }, { [key]: value })

            //3. restore selection 到末尾
            setCursor(node, node.value.value.length)

        }
    }
}



function createCodeBlock(lang, blockNode) {
    replaceNode({
        type: 'Code',
        props: {
            lang
        }
    }, blockNode)
}

// TODO level 实现，这个时候要往上插入，删除当前节点。
function createSectionBlock(title, blockNode, level) {
    replaceNode({
        type: 'Section',
        content: [{type: 'Text', value: title}],
    }, blockNode)
}


export function registerCommands() {
    const commands = [
        // createBlockCommands('1.', modelMap.Section),
        // createBlockCommands('[]', modelMap.Section),
        // createBlockCommands('>', modelMap.Section),
        createFormatCommands(['*', '*'], 'bold'),
        // createFormatCommands(['**', '**'], createFormatCallback('italic')),
        // createFormatCommands(['~', '~'], createFormatCallback('underline')),
        // createFormatCommands(['~~', '~~'], createFormatCallback('lineThrough')),
        // createFormatCommands(['`', '`']),
        // createFormatCommands(['$$', '$$']),
    ]

    const sectionMaxLevel = 3
    for(let i = sectionMaxLevel; i> 0; i-- ) {
        commands.push(createBlockCommands('#'.repeat(i), (title, node) => createSectionBlock(title, node, i)))
    }

    commands.push(createBlockCommands('```', createCodeBlock))

    // TODO 不支持图片插入命令，这样就解决了去做复杂匹配的问题。想插图片用 /pic 这样的方式。

    return commands
}
