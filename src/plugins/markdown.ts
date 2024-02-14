import {reverseFindMatchRange, reverseMatchStrPair, reversMatchStr} from "../helper";
import {DocNodeFragment, Paragraph, Text} from "../DocumentContent.js";
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
            if (!(startBlock instanceof Paragraph || startBlock instanceof Heading)) return false
            // 2. 只能在头部输入
            if (startBlock.firstChild !== startText) return false
            // 3. 头部就必须匹配
            if (startText.data.value.slice(0, initialCharacters.length) !== initialCharacters) return false

            // 支持 # 类型的 也支持 ```js 类型的
            // 去掉结尾的空格
            const textToMatch = startText.data.value.slice(0, startText.data.value.length - 1)
            const matchedText = reversMatchStr(textToMatch, initialCharacters)
            if (matchedText === false) return false

            history.openPacket()
            // 1. 先把 startText 中的 initialCharacters + 空格删掉
            const newTextAfterCursor = startText.data.value.slice(initialCharacters.length + 1)
            content.updateText(newTextAfterCursor, startText)
            // 2. 把所有的 Text 取出来
            const titleTextFrag = content.deleteBetween(startText, null, startBlock)
            // 3. 替换成新的 Heading block
            const newBlock = createBlock(titleTextFrag)
            content.replace(newBlock, startBlock, content)
            if (newBlock) {
                view.setCursor(newBlock, 0)
            }
            history.closePacket()
            return true
        }
    }
}




function createFormatCommands([startChars, closeChars]: [string, string], key: string, value = true) {
    return class FormatPlugin extends Plugin{
        public static displayName = `format(${startChars}-${closeChars})`
        public static activateEvents = {
            // inputChar 是我们的自定义事件
            inputChar: onInputKey(' ')
        }
        run({ } : PluginRunArgv): boolean | undefined  {
            const { view, content, history } = this.document
            const { startText,  startBlock,  isEndFull,isCollapsed, endText, startOffset, endOffset } = view.state.selectionRange()!

            // debugger

            // 1. 如果最后的末尾都没和 closeChars 匹配，就不用管了
            if (endText.data.value.slice(endOffset - closeChars.length -1, endOffset-1) !== closeChars) return false
            // 2. 没有找到匹配的 range
            const matchedDocRange = reverseFindMatchRange(endText!, endOffset-1, startChars, closeChars, startBlock)
            if (!matchedDocRange) return false

            history.openPacket()
            // 删除空格
            const newEndTextWithoutSpace = endText.data.value.slice(0, endOffset-1) + endText.data.value.slice(endOffset)
            content.updateText(newEndTextWithoutSpace, endText)
            //2. 再执行 format。
            const [firstFormattedText, lastFormattedText] = view.formatRange(matchedDocRange, {[key]: value})
            //3. 删掉 startText 和 endText 的 startChars 和 closeChars
            const newStartTextWithoutStartChars = firstFormattedText.data.value.slice(startChars.length)

            content.updateText(newStartTextWithoutStartChars, firstFormattedText)
            const newEndTextWithoutCloseChars = lastFormattedText.data.value.slice(0, - closeChars.length)
            content.updateText(newEndTextWithoutCloseChars, lastFormattedText)
            // 穿件一个空字符 Text 用来放 cursor
            const emptyText = new Text({value: ''})
            content.append(emptyText, lastFormattedText)
            //4. restore selection 到下一个节点的空格后面
            view.setCursor(lastFormattedText.next!, 0)
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


function createHeadingBlock(titleTextFrag: DocNodeFragment, level: number) {
    const newHeading = new Heading({ level, useIndex: false})
    newHeading.firstChild = titleTextFrag.retrieve()
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



class IndexedHeadingPlugin extends Plugin{
    public static displayName = `IndexedHeading`
    public static activateEvents = {
        inputChar: onInputKey(' ')
    }
    run({  } : PluginRunArgv) : boolean | undefined{
        // debugger
        const { view, content, history } = this.document
        const { startText,  startBlock,  isEndFull,isCollapsed, endText, endOffset } = view.state.selectionRange()!
        //  1. 只能在 Heading 的 content 里面产生
        if (!(startBlock instanceof Heading)) return false
        // 2. 只能在头部输入
        if (startBlock.firstChild !== startText) return false
        // 3. 头部就必须匹配 x.x.x. 的形式
        if (!/^(\d\.)+\s$/.test(startText.data.value.slice(0, endOffset))) return false

        history.openPacket()
        // TODO 应该允许只修改该 data，保持 reactive
        const newHeading = new Heading({...startBlock.toJSON(), useIndex: true})
        const headingContent = content.deleteBetween(startText, null, startBlock)
        newHeading.firstChild = headingContent.retrieve() as Text
        content.updateText(newHeading.firstChild!.data.value.slice(endOffset), newHeading.firstChild as Text)
        content.replace(newHeading, startBlock)
        view.setCursor(newHeading.firstChild!, 0)
        history.closePacket()
        return true
    }
}

export const plugins: (typeof Plugin)[] = [
    createFormatCommands(['*', '*'], 'bold'),
    createFormatCommands(['**', '**'], 'italic'),
    createFormatCommands(['~', '~'], 'underline'),
    createFormatCommands(['~~', '~~'], 'lineThrough'),
    IndexedHeadingPlugin
]

const sectionMaxLevel = 3
for(let i = sectionMaxLevel; i> 0; i-- ) {
    plugins.push(createBlockCommands('#'.repeat(i), (titleTextFrag: DocNodeFragment) => createHeadingBlock(titleTextFrag, i), true))
}

plugins.push(createBlockCommands('-', createUnorderedListBlock, true))

