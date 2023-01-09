/**@jsx createElement*/
// @ts-ignore
import {createElement} from "../src/DOM.js";
import {buildReactiveView} from "../src/buildReactiveView";

import patchTextEvents  from "../src/patchTextEvents";
import { registerCommands as markdownCommands } from "../src/markdown";
import { registerCommands as insertSuggestionCommands } from "../src/insertSuggestion";
import { registerCommands as inlineToolCommands } from "../src/inlineTool";
import { registerCommands as blockToolCommands } from "../src/blockTool";
import { registerCommands } from "../src/command";
import { createDelegator} from '../src/event'

import {buildModelFromData} from "../src/editing";

// import { data } from './data/singleSection'
// import { data } from './data/multiSection'
// import { data } from './data/singlePara'
// import { data } from './data/component'
// import { data } from './data/nestedList'
import { data } from './data/multiPara'

const { on, trigger, attach, subDelegators } = createDelegator()
// CAUTION 这个事件顺序挺重要的，command 需要发生在默认输入行为之前。
const { userSelectionRange, visualFocusedBlockNode } =  patchTextEvents(on, trigger)
// TODO 这里还要做哪些只在 document 上的事件的隔离
attach(document)

const commandUtils = { on, userSelectionRange, visualFocusedBlockNode }
registerCommands(markdownCommands(), commandUtils)
registerCommands(inlineToolCommands(), commandUtils)
registerCommands(blockToolCommands(), commandUtils)
registerCommands(insertSuggestionCommands(), commandUtils)


const { result: doc } = buildModelFromData(data)
const docElement = buildReactiveView(doc, subDelegators.block)
// @ts-ignore
document.getElementById('root').appendChild(docElement)

// setTimeout(() => {
//     debugger
//     doc.content.head.next.node.value.value = 'updated'
// }, 100)
// @ts-ignore
window.doc = doc

// replaceNode({
//     type: 'Para',
//     content: [
//         {type: 'Text', value: 'newPara'},
//     ]
// }, doc.children.tail.node)
// doc.children.remove(doc.children.tail.node)
