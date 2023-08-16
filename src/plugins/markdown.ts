import {onSpaceKeyDown, Atom} from 'axii'
import {reverseMatchStrPair, reversMatchStr} from "../helper";
import {DocNode, Section, Text, ListItem} from "../DocNode";
import {DocumentContent} from "../Content";
import {DocumentContentView} from "../View";
import {PluginRunArgv, Plugin} from "../Plugin";

function onInputKey(key: string) {
    return (e: CustomEvent): boolean => {
        return e.detail.data === key
    }
}

function createBlockCommands(initialCharacters: string, createBlock: Function, atStart = true) {
    return class BlockPlugin extends Plugin{
        public static displayName = `creatBlock${initialCharacters}`
        public static activateEvents = {
            inputChar: onInputKey(' ')
        }
        run({ content, docRange, view } : PluginRunArgv) : boolean | undefined{
            const { startText, startNode } = docRange
            //  1. 只能在 Para 的 content 里面产生
            if (startNode.constructor !== DocNode.ParagraphType) return false
            // 2. 只能在头部
            if (!startText.isFirstContent()) return false
            // 支持 # 类型的 也支持 ```js 类型的
            const innerText = reversMatchStr(startText.value, initialCharacters)
            if (innerText === false) return false

            const newNode = createBlock(content, startNode,innerText)
            if (newNode) {
                view.setCursor(newNode, 0)
            }
            return true
        }
    }
}




function createFormatCommands([startChars, closeChars]: [string, string], key: string, value = true) {
    return class FormatPlugin extends Plugin{
        public static displayName = `format(${startChars-closeChars})`
        public static activateEvents = {
            // inputChar 是我们的自定义事件
            inputChar: onInputKey(' ')
        }
        run({ content, docRange, view } : PluginRunArgv): boolean | undefined  {

            const text = docRange!.startText.value.slice(0, docRange!.startOffset)

            const innerText = reverseMatchStrPair(text!, [startChars, closeChars])
            if (!innerText) return false
            console.info("running plugin for", {startChars, closeChars, text}, docRange?.startOffset)
            //1. 原节点先删了 starChar/closeChars

            const originTextAfterCursor = docRange!.startText.value.slice(docRange?.startOffset!)
            // CAUTION 注意后面计算式里的 +1，那个代表触发 command 的空格
            content.updateText(docRange?.startText!, text!.slice(0, -(startChars.length + innerText.length + closeChars.length+1)) )

            //2. 再执行 format。
            console.log({innerText, originTextAfterCursor})
            const newFormattedText = new Text({ type: 'Text', value: innerText, props: { formats: {[key]: value}} })
            content.insertContentAfter(newFormattedText, docRange?.startText!)

            //3. 把原来身下的内容接上
            if (originTextAfterCursor) {
                // TODO 要不要考虑原来的样式？？？
                const originText = new Text({ type: 'Text', value: ' ' + originTextAfterCursor})
                content.insertContentAfter(originText, newFormattedText)
            } else {
                // 插一个空格字符，会生成 &ZeroWidthSpace;，这样才能让 cursor 不在之前的节点里。
                const emptyNext = new Text({type: 'Text', value: ''})
                content.insertContentAfter(emptyNext, newFormattedText)
            }
            //4. restore selection 到下一个节点的空格后面
            view.setCursor(newFormattedText.next!, 1)
            // CAUTION 异地昂要 return true，表示执行了
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
// function createListBlock(lang: string, blockNode: NodeType) {
//     return blockNode.root!.replaceNode({
//         type: 'List',
//     }, blockNode)
// }


function createSectionBlock(content: DocumentContent,  para: DocNode, title: string, level: number) {
    const newSection = new Section({type: 'Section'})
    newSection.replaceContent(para.content)

    // 处理掉前面的 # 号以及空格 TODO 处理的更优雅一点？
    newSection.content.value = newSection.content.value.slice(level + 1)

    const previousSiblingInTree = para.previousSiblingInTree
    if (!previousSiblingInTree) {
        // 头部。
        content.replaceDocNode(newSection, para)
    } else {
        content.removeDocNode(para)
        if (previousSiblingInTree.level() > level) {
            const acceptableSibling = previousSiblingInTree.findParentByLevel(level - previousSiblingInTree.level())
            content.appendNextSibling(acceptableSibling, newSection)
        } else if (previousSiblingInTree.level() === level){
            content.appendNextSibling(previousSiblingInTree, newSection)
        } else {
            content.appendNextSibling(previousSiblingInTree, newSection, true)
        }
    }

    return newSection
}

function createListBlock(content: DocumentContent,  para: DocNode) {
    console.log("create list block")
    const newListItem = new ListItem({type: 'ListItem'})
    newListItem.replaceContent(para.content)
    // 处理掉前面的 - 和空格
    newListItem.content.value = newListItem.content.value.slice(2)
    content.replaceDocNode(newListItem, para)

    return newListItem
}


// export function registerCommands() {
//     const commands = [
//         createFormatCommands(['*', '*'], 'bold'),
//         createFormatCommands(['**', '**'], 'italic'),
//         createFormatCommands(['~', '~'], 'underline'),
//         createFormatCommands(['~~', '~~'], 'lineThrough'),
//     ]
//
//     const sectionMaxLevel = 3
//     for(let i = sectionMaxLevel; i> 0; i-- ) {
//         commands.push(createBlockCommands('#'.repeat(i), (title: string, node: NodeType) => createSectionBlock(title, node, i), true))
//     }
//
//     commands.push(createBlockCommands('```', createCodeBlock))
//     commands.push(createBlockCommands('-', createListBlock))
//
//     // CAUTION 不支持图片插入命令，这样就解决了去做复杂匹配的问题。想插图片用 /pic 这样的方式。
//     return commands
// }

export const plugins = [
    createFormatCommands(['*', '*'], 'bold'),
    createFormatCommands(['**', '**'], 'italic'),
    createFormatCommands(['~', '~'], 'underline'),
    createFormatCommands(['~~', '~~'], 'lineThrough')
]

const sectionMaxLevel = 3
for(let i = sectionMaxLevel; i> 0; i-- ) {
    plugins.push(createBlockCommands('#'.repeat(i), (content: DocumentContent, node: DocNode, title: string) => createSectionBlock(content, node, title, i), true))
}

plugins.push(createBlockCommands('-', (content: DocumentContent, node: DocNode, title: string) => createListBlock(content, node), true))

