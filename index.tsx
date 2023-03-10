/**@jsx createElement*/
// @ts-ignore
import {createElement} from "./src/DOM.js";
import {buildReactiveView} from "./src/buildReactiveView";

import patchRichTextEvents from "./src/patchRichTextEvents";
import { registerCommands as markdownCommands } from "./src/markdown";
// import { registerCommands as suggestionCommands } from "../src/suggestion";
import { registerPlugins } from "./src/plugin";
import { on, trigger } from './src/event'

import {buildModelFromData} from "./src/editing";

import { data } from './playground/data/singleSection'
// // import { data } from './data/multiSection'
// // import { data } from './data/singlePara'
// // import { data } from './data/component'
// // import { data } from './data/nestedList'
// // import { data } from './data/multiPara'
//
//
//
const { result: doc } = buildModelFromData(data)
//
// doc.firstLeaf = firstLeaf
// doc.lastLeaf = lastLeaf
const docElement = buildReactiveView(doc)
// @ts-ignore
document.getElementById('root').appendChild(docElement)

// CAUTION 这个事件顺序挺重要的，command 需要发生在默认输入行为之前。
registerPlugins(markdownCommands(), on)
// registerCommands(suggestionCommands(), on)

patchRichTextEvents(on, trigger)



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
