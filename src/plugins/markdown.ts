import {reverseFindMatchRange, reverseMatchStrPair, reversMatchStr} from "../helper";
import {Block, Component, DocNodeFragment, Paragraph, Text} from "../DocumentContent.js";
import {Plugin, PluginRunArgv} from "../Plugin";
import {Heading} from "../components/Heading.js";
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
        run({} : PluginRunArgv) : boolean | undefined{
            const { view, history } = this.document
            const startRange = view.state.selectionRange()
            const { startText,  startBlock,  isEndFull,isCollapsed, endText } = startRange!
            //  1. should only in Paragraph content
            if (!(startBlock instanceof Paragraph || startBlock instanceof Heading)) return false
            // 2. should on at head of content
            if (startBlock.firstChild !== startText) return false
            // 3. start text should match initialCharacters
            if (startText.data.value.slice(0, initialCharacters.length) !== initialCharacters) return false

            // support only initialCharacters link '##' or initialCharacters with more info like '```js'
            // remove trailing space
            const textToMatch = startText.data.value.slice(0, startText.data.value.length - 1)
            const matchedText = reversMatchStr(textToMatch, initialCharacters)
            if (matchedText === false) return false

            history.openPacket(startRange)
            // 1. remove initialCharacters and space
            const newTextAfterCursor = startText.data.value.slice(initialCharacters.length + 1)
            view.updateText(newTextAfterCursor, startText)
            // 2. get all text from startText
            const titleTextFrag = view.deleteBetween(startText, null, startBlock)
            // 3. replace with new Heading block
            const newBlock = createBlock.call(this, titleTextFrag)
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
            // inputChar is a custom event dispatched by View
            inputChar: onInputKey(' ')
        }
        run({ } : PluginRunArgv): boolean | undefined  {
            const { view, history } = this.document
            const startRange = view.state.selectionRange()
            const { startBlock, endText, endOffset } = startRange!

            // 1. if last chars is not match with closeChars, we can return.
            if (endText.data.value.slice(endOffset - closeChars.length -1, endOffset-1) !== closeChars) return false
            // 2. if no range matched, we can return.
            const matchedDocRange = reverseFindMatchRange(endText!, endOffset-1, startChars, closeChars, startBlock)
            if (!matchedDocRange) return false

            history.openPacket(startRange)
            // 1. delete space in text.
            const newEndTextWithoutSpace = endText.data.value.slice(0, endOffset-1) + endText.data.value.slice(endOffset)
            view.updateText(newEndTextWithoutSpace, endText)
            //2. do format.
            const [firstFormattedText, lastFormattedText] = view.formatRange(matchedDocRange, {[key]: value})
            //3. delete startChars and closeChars
            const newStartTextWithoutStartChars = firstFormattedText.data.value.slice(startChars.length)

            view.updateText(newStartTextWithoutStartChars, firstFormattedText)
            const newEndTextWithoutCloseChars = lastFormattedText.data.value.slice(0, - closeChars.length)
            view.updateText(newEndTextWithoutCloseChars, lastFormattedText)
            // 4. add an empty text after lastFormattedText for cursor
            const emptyText = this.document.content.createFromData({type: 'Text', value: ''}) as Text
            view.append(emptyText, lastFormattedText, startBlock)
            // 5. restore cursor to the empty text
            view.setCursor(emptyText!, 0)
            // CAUTION we should return true to indicate that we have handled the event.
            const endRange = new DocRange(startBlock, emptyText!, 0, startBlock, emptyText!, 0)
            history.closePacket(endRange)
            return true
        }
    }
}


function createHeadingBlock(this: Plugin, titleTextFrag: DocNodeFragment, level: number) {
    const newHeading = this.document.content.createFromData({type: 'Heading', level, useIndex: false, content:[]}) as Block
    newHeading.firstChild = titleTextFrag.retrieve()
    return newHeading
}

function createUnorderedListBlock(this: Plugin, titleTextFrag: DocNodeFragment,) {
    const newListItem = this.document.content.createFromData({type: 'ULItem', level:0,content:[]}) as Block
    newListItem.firstChild = titleTextFrag.retrieve()
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
        //  1. only in Heading content
        if (!(startBlock instanceof Heading)) return false
        // 2. range should at head of content
        if (startBlock.firstChild !== startText) return false
        // 3. text should match `x.x.x.` pattern
        if (!/^(\d\.)+\s$/.test(startText.data.value.slice(0, endOffset))) return false

        history.openPacket(startRange)
        // TODO should use Heading.level() to change instead of replace block
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
        const { startText,  startBlock, endOffset } = startRange!
        //  1. only in Paragraph content
        if (!(startBlock instanceof Paragraph)) return false
        // 2. only at head of content
        if (startBlock.firstChild !== startText) return false
        // 3. text should match `x.x.x.` pattern
        if (!/^(\d\.)+\s$/.test(startText.data.value.slice(0, endOffset))) return false

        history.openPacket(startRange)
        const newHeading = this.document.content.createFromData({type: 'OLItem', level:0, content:[]}) as Block
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
    run({} : PluginRunArgv) : boolean | undefined{
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

        const newInlineCode = this.document.content.createFromData({type: 'InlineCode',value: matchedText})
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
        //  1. only in Paragraph content
        if (!(startBlock instanceof Paragraph)) return false
        // 2. only at head of content, and the start text should be the only child of its parent Paragraph
        if (startText.prev() || startText.next) return false
        // 3. should match '```language' pattern
        const matched = startText.data.value.match(/^```(\w+)\s$/)
        if (!matched) return false
        const language = matched?.[1]

        history.openPacket(startRange)
        const newCodeBlock = this.document.content.createFromData({ type: 'Code', value:'', language})
        view.replace(newCodeBlock, startBlock);

        (newCodeBlock as Component).focus()
        history.closePacket(null)
        return true
    }
}

export const defaultMarkdownPlugins: (typeof Plugin)[] = [
    createFormatCommands(['*', '*'], 'bold'),
    createFormatCommands(['**', '**'], 'italic'),
    createFormatCommands(['~', '~'], 'underline'),
    createFormatCommands(['~~', '~~'], 'lineThrough'),
    IndexedHeadingPlugin,
    OrderedListPlugin,
    // CAUTION Code Block must be placed before InlineCodePlugin, or it will first match InlineCodePlugin
    BlockCodePlugin,
    InlineCodePlugin,
]

const sectionMaxLevel = 3
for(let i = sectionMaxLevel; i> 0; i-- ) {
    defaultMarkdownPlugins.push(createBlockCommands('#'.repeat(i), function(this: Plugin, titleTextFrag: DocNodeFragment) { return createHeadingBlock.call(this, titleTextFrag, i-1) }, true))
}

defaultMarkdownPlugins.push(createBlockCommands('-', createUnorderedListBlock, true))

