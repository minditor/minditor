/**@jsx createElement*/
import {createElement} from "./src/DOM";
import {buildReactiveView, createReactiveAttribute} from "./src/buildReactiveView";

import patchTextEvents from "./src/patchTextEvents";
import { registerCommands as markdownCommands } from "./src/markdown";
import { registerCommands as suggestionCommands } from "./src/suggestion";
import { registerCommands } from "./src/command";
import { on, trigger } from './src/event'

import {buildModelFromData, insertContentNodeAfter} from "./src/editing";

const { result: doc, firstLeaf, lastLeaf } = buildModelFromData({
    type: 'Para',
    content: [
        {type: 'Text', value: '11'},
        {type: 'Text', value: '22'},
        {type: 'Text', value: '33'}
    ]
})

doc.firstLeaf = firstLeaf
doc.lastLeaf = lastLeaf
const docElement = buildReactiveView(doc)
document.getElementById('root').appendChild(docElement)



window.doc = doc


// replaceNode({
//     type: 'Para',
//     content: [
//         {type: 'Text', value: 'newPara'},
//     ]
// }, doc.children.tail.node)
// doc.children.remove(doc.children.tail.node)

for(let i of doc.content) {
    console.log(i.value.value)
}
console.log("111111111111111")
insertContentNodeAfter({type:'Text', value:'44'}, doc.content.head.next.next.node)

for(let i of doc.content) {
    console.log(i.value.value)
}
console.log("222222222")
setTimeout(() => {
    insertContentNodeAfter({type:'Text', value:'555'}, doc.content.head.next.next.next.node)
    for(let i of doc.content) {
        console.log(i.value.value)
    }
}, 1)
