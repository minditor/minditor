/**@jsx createElement*/
import {createElement} from "./src/DOM";
import {buildReactiveView, createReactiveAttribute} from "./src/buildReactiveView";

import patchTextEvents from "./src/patchTextEvents";
import { registerCommands as markdownCommands } from "./src/markdown";
import { registerCommands as suggestionCommands } from "./src/suggestion";
import { registerCommands } from "./src/command";
import { on, trigger } from './src/event'

import {buildModelFromData} from "./src/editing";

const { result: doc, firstLeaf, lastLeaf } = buildModelFromData({
    type: 'Doc',
    content: [{ type: 'Text', value: 'test title'} ],
    children: [{
        type: 'Para',
        content: [
            {type: 'Text', value: 'p123'},
            {type: 'Text', value: 'p456'},
            {type: 'Text', value: 'p789'}
        ]
    }, {
        type: 'Section',
        content: [{ type: 'Text', value: 'section 1'} ],
        children: [{
            type: 'Para',
            content: [
                {type: 'Text', value: 's1p12345'},
                {type: 'Text', value: 's1p12345'},
                {type: 'Text', value: 's1p12345'}
            ]
        }]
    }, {
        type: 'Section',
        content: [{ type: 'Text', value: 'section 2'} ],
        children: [{
            type: 'Para',
            content: [
                {type: 'Text', value: 's2p12345', props: { formats: { bold: true }}},
                {type: 'Text', value: 's2p12345'},
                {type: 'Text', value: 's2p12345'}
            ]
        }]
    }, {
        type: 'Section',
        content: [{ type: 'Text', value: 'section 3'} ],
        children: [{
            type: 'Table',
            value: 'test'
        }, {
            type: 'Para',
            content: [
                {type: 'Text', value: '#jsp123'},
                {type: 'Text', value: 'p456'},
                {type: 'Text', value: 'p789'}
            ]
        }]
    }]
})

doc.firstLeaf = firstLeaf
doc.lastLeaf = lastLeaf
const docElement = buildReactiveView(doc)
document.getElementById('root').appendChild(docElement)

// CAUTION 这个事件顺序挺重要的，command 需要发生在默认输入行为之前。
registerCommands(markdownCommands(), on)
registerCommands(suggestionCommands(), on)

patchTextEvents(on, trigger)



// setTimeout(() => {
//     debugger
//     doc.content.head.next.node.value.value = 'updated'
// }, 100)

window.doc = doc

// replaceNode({
//     type: 'Para',
//     content: [
//         {type: 'Text', value: 'newPara'},
//     ]
// }, doc.children.tail.node)
// doc.children.remove(doc.children.tail.node)
