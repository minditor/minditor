import {reverseFindMatchRange, reverseMatchStrPair, reversMatchStr} from "../helper";
import {DocNodeFragment, Paragraph, Text} from "../DocumentContent.js";
import {Plugin, PluginRunArgv} from "../Plugin";
import {Heading} from "../components/Heading.js";
import {ULItem} from "../components/ULItem.js";
import {OLItem} from "../components/OLItem.js";
import {InlineCode} from "../components/InlineCode.js";
import {Code} from "../components/CodeMirror.js";
import {DocRange} from "../Range.js";

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
            const { view, history } = this.document
            const startRange = view.state.selectionRange()
            const { startText,  startBlock,  isEndFull,isCollapsed, endText } = startRange!
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

            history.openPacket(startRange)
            // 1. 先把 startText 中的 initialCharacters + 空格删掉
            const newTextAfterCursor = startText.data.value.slice(initialCharacters.length + 1)
            view.updateText(newTextAfterCursor, startText)
            // 2. 把所有的 Text 取出来
            const titleTextFrag = view.deleteBetween(startText, null, startBlock)
            // 3. 替换成新的 Heading block
            const newBlock = createBlock(titleTextFrag)
            view.replace(newBlock, startBlock, this.document.content)
            view.setCursor(newBlock, 0)
            const endRange = new DocRange(newBlock, newBlock.firstChild!, 0, newBlock, newBlock.firstChild!, 0, )
            history.closePacket(endRange)
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
            const { view, history } = this.document
            const startRange = view.state.selectionRange()
            const { startText,  startBlock,  isEndFull,isCollapsed, endText, startOffset, endOffset } = startRange!

            // debugger

            // 1. 如果最后的末尾都没和 closeChars 匹配，就不用管了
            if (endText.data.value.slice(endOffset - closeChars.length -1, endOffset-1) !== closeChars) return false
            // 2. 没有找到匹配的 range
            const matchedDocRange = reverseFindMatchRange(endText!, endOffset-1, startChars, closeChars, startBlock)
            if (!matchedDocRange) return false

            history.openPacket(startRange)
            // 删除空格
            const newEndTextWithoutSpace = endText.data.value.slice(0, endOffset-1) + endText.data.value.slice(endOffset)
            view.updateText(newEndTextWithoutSpace, endText)
            //2. 再执行 format。
            const [firstFormattedText, lastFormattedText] = view.formatRange(matchedDocRange, {[key]: value})
            //3. 删掉 startText 和 endText 的 startChars 和 closeChars
            const newStartTextWithoutStartChars = firstFormattedText.data.value.slice(startChars.length)

            view.updateText(newStartTextWithoutStartChars, firstFormattedText)
            const newEndTextWithoutCloseChars = lastFormattedText.data.value.slice(0, - closeChars.length)
            view.updateText(newEndTextWithoutCloseChars, lastFormattedText)
            // 穿件一个空字符 Text 用来放 cursor
            const emptyText = new Text({value: ''})
            view.append(emptyText, lastFormattedText, startBlock)
            //4. restore selection 到下一个节点的空格后面
            view.setCursor(emptyText!, 0)
            // CAUTION 异地昂要 return true，表示执行了
            const endRange = new DocRange(startBlock, emptyText!, 0, startBlock, emptyText!, 0)
            history.closePacket(endRange)
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


class IndexedHeadingPlugin extends Plugin{
    public static displayName = `IndexedHeading`
    public static activateEvents = {
        inputChar: onInputKey(' ')
    }
    run({  } : PluginRunArgv) : boolean | undefined{
        const { view, history } = this.document
        const startRange = view.state.selectionRange()
        const { startText,  startBlock,  isEndFull,isCollapsed, endText, endOffset } = startRange!
        //  1. 只能在 Heading 的 content 里面产生
        if (!(startBlock instanceof Heading)) return false
        // 2. 只能在头部输入
        if (startBlock.firstChild !== startText) return false
        // 3. 头部就必须匹配 x.x.x. 的形式
        if (!/^(\d\.)+\s$/.test(startText.data.value.slice(0, endOffset))) return false

        history.openPacket(startRange)
        // TODO 应该允许只修改该 data，保持 reactive
        const newHeading = new Heading({...startBlock.toJSON(), useIndex: true})
        const headingContent = view.deleteBetween(startText, null, startBlock)
        newHeading.firstChild = headingContent.retrieve() as Text
        view.updateText(newHeading.firstChild!.data.value.slice(endOffset), newHeading.firstChild as Text)
        view.replace(newHeading, startBlock)
        view.setCursor(newHeading.firstChild!, 0)
        const endRange = new DocRange(newHeading, newHeading.firstChild! as Text, 0, newHeading, newHeading.firstChild! as Text, 0)
        history.closePacket(endRange)
        return true
    }
}

class OrderedListPlugin extends Plugin{
    public static displayName = `OrderedList`
    public static activateEvents = {
        inputChar: onInputKey(' ')
    }
    run({  } : PluginRunArgv) : boolean | undefined{
        const { view, history } = this.document
        const startRange = view.state.selectionRange()
        const { startText,  startBlock,  isEndFull,isCollapsed, endText, endOffset } = startRange!
        //  1. 只能在 Heading 的 content 里面产生
        if (!(startBlock instanceof Paragraph)) return false
        // 2. 只能在头部输入
        if (startBlock.firstChild !== startText) return false
        // 3. 头部就必须匹配 x.x.x. 的形式
        if (!/^(\d\.)+\s$/.test(startText.data.value.slice(0, endOffset))) return false

        history.openPacket(startRange)
        // TODO 应该允许只修改该 data，保持 reactive
        const newHeading = new OLItem({level:0})
        const headingContent = view.deleteBetween(startText, null, startBlock)
        newHeading.firstChild = headingContent.retrieve() as Text
        view.updateText(newHeading.firstChild!.data.value.slice(endOffset), newHeading.firstChild as Text)
        view.replace(newHeading, startBlock)
        view.setCursor(newHeading.firstChild!, 0)
        const endRange = new DocRange(newHeading, newHeading.firstChild! as Text, 0, newHeading, newHeading.firstChild! as Text, 0)
        history.closePacket(endRange)
        return true
    }
}

class InlineCodePlugin extends Plugin{
    public static displayName = `InlineCode`
    public static activateEvents = {
        inputChar: onInputKey(' ')
    }
    run({  } : PluginRunArgv) : boolean | undefined{
        const { view, history } = this.document
        const startRange = view.state.selectionRange()
        const { startText,  startBlock,  isEndFull, startOffset,isCollapsed, endText, endOffset } = startRange!

        const textToMatch = startText.data.value.slice(0, startText.data.value.length - 1)
        const matchedText = reverseMatchStrPair(textToMatch, ['`', '`'])
        if (matchedText === false) return false

        history.openPacket(startRange)
        // 1.split text
        let matchedTextNode = startText
        if (startOffset > (matchedText.length +3)) {
            matchedTextNode = view.splitText(startText, startOffset - matchedText.length -3, startBlock)
        }
        if (matchedTextNode.data.value.length > matchedText.length +3) {
            view.splitText(matchedTextNode, matchedText.length +3, startBlock)
        }

        const newInlineCode = new InlineCode({value: matchedText})
        view.replace(newInlineCode, matchedTextNode, startBlock)

        view.setCursor(newInlineCode.next!, 0)
        const endRange = DocRange.cursor(startBlock, matchedTextNode.next! as Text, 0)
        history.closePacket(endRange)
        return true
    }
}

class BlockCodePlugin extends Plugin{
    public static displayName = `IndexedHeading`
    public static activateEvents = {
        inputChar: onInputKey(' ')
    }
    run({  } : PluginRunArgv) : boolean | undefined{
        const { view, history } = this.document
        const startRange = view.state.selectionRange()
        const { startText,  startBlock,  isEndFull,isCollapsed, endText, endOffset } = startRange!
        //  1. 只能在 Heading 的 content 里面产生
        if (!(startBlock instanceof Paragraph)) return false
        // 2. 只能在头部输入的唯一的字符里面输入
        if (startText.prev() || startText.next) return false
        // 3. 必须匹配 ```lang 的形式
        const matched = startText.data.value.match(/^```(\w+)\s$/)
        if (!matched) return false
        const language = matched?.[1]

        history.openPacket(startRange)
        // TODO 应该允许只修改该 data，保持 reactive
        const newCodeBlock = new Code({value:'', language})
        view.replace(newCodeBlock, startBlock)

        newCodeBlock.focus()
        history.closePacket(null)
        return true
    }
}

export const plugins: (typeof Plugin)[] = [
    createFormatCommands(['*', '*'], 'bold'),
    createFormatCommands(['**', '**'], 'italic'),
    createFormatCommands(['~', '~'], 'underline'),
    createFormatCommands(['~~', '~~'], 'lineThrough'),
    IndexedHeadingPlugin,
    OrderedListPlugin,
    // CAUTION Code Block 应该在 InlineCode 之上，不然匹配顺序错了
    BlockCodePlugin,
    InlineCodePlugin,
]

const sectionMaxLevel = 3
for(let i = sectionMaxLevel; i> 0; i-- ) {
    plugins.push(createBlockCommands('#'.repeat(i), (titleTextFrag: DocNodeFragment) => createHeadingBlock(titleTextFrag, i), true))
}

plugins.push(createBlockCommands('-', createUnorderedListBlock, true))

