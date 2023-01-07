import { nodeTypes } from './nodeTypes'
import {NodeType} from "./NodeType";
import {createDefaultTextNode, createRangeLike, formatRange, replaceNode} from "./editing";
import {CommandRunArgv} from "./command";
import {setCursor} from './buildReactiveView'


function createBlockCommands(initialCharacters: string, createBlock: Function, atStart = true) {
    return {
        onInput: ' ',
        run({ charReader, node } : CommandRunArgv) : false | undefined{
            //  1. 只能在 Para 的 content 里面产生
            if (node.parent.constructor !== nodeTypes.Para) return false
            // 2. 只能在头部
            if (node !== node.parent!.content!.head.next.node) return false
            // 支持 # 类型的 也支持 ```js 类型的
            const innerText = charReader.match([initialCharacters])
            if (innerText === false) return false

            const newNode = createBlock(innerText, node.parent)
            if (newNode) {
                setCursor(newNode, 0)
            }
        }
    }
}


function createFormatCommands([startChars, closeChars]: [string, string], key: string, value = true) {
    return {
        onInput: ' ',
        run({ charReader, node } : CommandRunArgv): false | undefined  {
            // TODO 这里并不支持跨节点的 format，需要改造，应该要支持。
            const innerText = charReader.match([startChars, closeChars])

            if (!innerText) return false

            const startOffset = charReader.offset - innerText.length - closeChars.length - startChars.length
            const endOffset = charReader.offset



            //1. 先删了 starChar/closeChars
            node.value!.value = node.value!.value.slice(0, startOffset) +
                node.value!.value.slice(startOffset + startChars.length, endOffset - closeChars.length) +
                node.value!.value.slice(endOffset)

            //2. 再执行 format。这时非 innerText 中的内容会独立出去，node 里面只剩下 innerText 的内容了。
            formatRange(createRangeLike({
                startNode: node,
                endNode: node,
                startOffset,
                endOffset: endOffset - startChars.length - closeChars.length
            }), { [key]: value })

            // CAUTION 因为无法 focus 到 0 这个位置，所以只能先不管什么情况都创造一个零宽节点来处理了。
            //3. restore selection 到下一个节点的头不
            // if (!node.nextSibling) {
                node.container?.insertAfter(createDefaultTextNode(), node)
            // }
            // debugger
            setCursor(node.nextSibling, 0)
        }
    }
}



function createCodeBlock(lang: string, blockNode: NodeType) {
    return replaceNode({
        type: 'Code',
        props: {
            lang
        }
    }, blockNode)
}

function createListBlock(lang: string, blockNode: NodeType) {
    return replaceNode({
        type: 'List',
    }, blockNode)
}

// TODO level 实现，这个时候要往上插入，删除当前节点。
function createSectionBlock(title: string, blockNode: NodeType, level: number) {
    return replaceNode({
        type: 'Section',
        content: [{type: 'Text', value: title}],
    }, blockNode)
}


export function registerCommands() {
    const commands = [
        createFormatCommands(['*', '*'], 'bold'),
        createFormatCommands(['**', '**'], 'italic'),
        createFormatCommands(['~', '~'], 'underline'),
        createFormatCommands(['~~', '~~'], 'lineThrough'),
    ]

    const sectionMaxLevel = 3
    for(let i = sectionMaxLevel; i> 0; i-- ) {
        commands.push(createBlockCommands('#'.repeat(i), (title: string, node: NodeType) => createSectionBlock(title, node, i), true))
    }

    commands.push(createBlockCommands('```', createCodeBlock))
    commands.push(createBlockCommands('-', createListBlock))

    // CAUTION 不支持图片插入命令，这样就解决了去做复杂匹配的问题。想插图片用 /pic 这样的方式。

    return commands
}
