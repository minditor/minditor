import {reverseMatchStrPair, reversMatchStr} from "../helper";
import {Paragraph, Text} from "../DocumentContent.js";
import {Plugin, PluginRunArgv} from "../Plugin";
import {Heading} from "../components/Heading.js";
import {ULItem} from "../components/ULItem.js";

function onInputKey(key: string) {
    return (e: unknown): boolean => {
        return (e as CustomEvent).detail === key
    }
}

function createBlockCommands(initialCharacters: string, createBlock: Function, atStart = true) {
    return class BlockPlugin extends Plugin{
        public static displayName = `creatBlockFor(${initialCharacters})`
        public static activateEvents = {
            inputChar: onInputKey(' ')
        }
        run({  } : PluginRunArgv) : boolean | undefined{
            // debugger
            const { view, content, history } = this.document
            const { startText,  startBlock,  isEndFull,isCollapsed, endText } = view.state.selectionRange()!
            //  1. 只能在 Para 的 content 里面产生
            if (!(startBlock instanceof Paragraph)) return false
            // 2. 只能是一个普通文字节点
            if (!isCollapsed || !(startText === endText)) return false
            // 2. 只能是在尾部按空格
            if (!(isEndFull)) return false
            // 支持 # 类型的 也支持 ```js 类型的
            // 去掉结尾的空格
            const textToMatch = startText.data.value.slice(0, startText.data.value.length - 1)
            const innerText = reversMatchStr(textToMatch, initialCharacters)
            if (innerText === false) return false

            history.openPacket()
            const newBlock = createBlock(innerText)
            content.replace(newBlock, startBlock, content)
            if (newBlock) {
                view.setCursor(newBlock, Infinity)
            }
            history.closePacket()
            return true
        }
    }
}



//
function createFormatCommands([startChars, closeChars]: [string, string], key: string, value = true) {
    return class FormatPlugin extends Plugin{
        public static displayName = `format(${startChars}-${closeChars})`
        public static activateEvents = {
            // inputChar 是我们的自定义事件
            inputChar: onInputKey(' ')
        }
        run({ } : PluginRunArgv): boolean | undefined  {
            const { view, content, history } = this.document
            const { startText,  startBlock,  isEndFull,isCollapsed, endText, startOffset } = view.state.selectionRange()!
            // 1. 目前只允许在一个 text 节点里面处理。
            if (!(startText === endText)) return false

            const textToMatch = startText.data.value.slice(0, startOffset)

            const formatText = reverseMatchStrPair(textToMatch!, [startChars, closeChars])
            if (!formatText) return false

            history.openPacket()

            console.info("running plugin for", {startChars, closeChars, text: textToMatch}, startOffset)
            //1. 原节点先删了 starChar/closeChars
            const originTextAfterCursor = startText.data.value.slice(startOffset!)
            // CAUTION 注意后面计算式里的 +1，那个代表触发 command 的空格
            const textBeforeFormat = textToMatch!.slice(0, -(startChars.length + formatText.length + closeChars.length+1))

            let textNodeToFormat: Text
            if (textBeforeFormat === '') {
                textNodeToFormat = textBeforeFormat
            } else {
                textNodeToFormat = view.splitText(startText, textBeforeFormat.length!)
            }
            content.updateText(formatText, textNodeToFormat)
            //2. 再执行 format。
            content.formatText({[key]: value}, textNodeToFormat)
            //
            // //3. 把原来身下的内容接上
            if (originTextAfterCursor) {
                // TODO 要不要考虑原来的样式？？？
                const originText = new Text({ type: 'Text', value: originTextAfterCursor})
                content.append(originText, textNodeToFormat)
            } else  if (!textNodeToFormat.next) {
                // 如果没有下一个节点，就再加一个空格
                const emptyText = new Text({ type: 'Text', value: ''})
                content.append(emptyText, textNodeToFormat)
            }

            //4. restore selection 到下一个节点的空格后面
            view.setCursor(textNodeToFormat.next!, 0)
            // CAUTION 异地昂要 return true，表示执行了
            history.closePacket()
            return true
        }
    }
}

//
//
// function createCodeBlock(lang: string, blockNode: NodeType) {
//     return blockNode.root!.replaceNode({
//         type: 'Code',
//         props: {
//             lang
//         }
//     }, blockNode)
// }
//


function createHeadingBlock(title: string, level: number) {
    const newHeading = new Heading({ level, useIndex: false})
    newHeading.firstChild = new Text({value:title})
    return newHeading
}

function createUnorderedListBlock() {
    const newListItem = new ULItem({})
    newListItem.firstChild = new Text({value:''})
    return newListItem
}

// function createOrderedListBlock() {
//     // TODO 需要知道上个 block 的层级？
//     const newListItem = new OLItem({})
//     newListItem.firstChild = new Text({value:''})
//     return newListItem
// }


export const plugins: (typeof Plugin)[] = [
    createFormatCommands(['*', '*'], 'bold'),
    createFormatCommands(['**', '**'], 'italic'),
    createFormatCommands(['~', '~'], 'underline'),
    createFormatCommands(['~~', '~~'], 'lineThrough')
]

const sectionMaxLevel = 3
for(let i = sectionMaxLevel; i> 0; i-- ) {
    plugins.push(createBlockCommands('#'.repeat(i), (title: string) => createHeadingBlock(title, i), true))
}

plugins.push(createBlockCommands('-', createUnorderedListBlock, true))

