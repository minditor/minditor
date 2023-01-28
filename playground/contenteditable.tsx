/**@jsx createElement*/
// @ts-ignore
import {createElement} from "../src/DOM.js";
import {buildReactiveView} from "../src/buildReactiveView";
import userEvent from '@testing-library/user-event'
import patchRichTextEvents from "../src/patchRichTextEvents";
import { registerCommands as markdownCommands } from "../src/markdown";
// import { registerCommands as suggestionCommands } from "../src/suggestion";
import { registerPlugins } from "../src/plugin";
import { on, trigger } from '../src/event'

import {buildModelFromData} from "../src/editing";



function render() {
    return <div contentEditable={true}>
        <span>11111</span>
        <span>
            <span id="target2"  style={{color:'red'}} >222222</span>
        </span>
        <span contentEditable={false} dangerouslySetInnerHTML={{__html: '&ZeroWidthSpace;'}}></span>
        <span id="target" className="hasbefore">333333</span>
    </div>
}

document.body.appendChild(render())

const user = userEvent.setup()

window.keydown = true

document.addEventListener('keydown', (e) => {
    console.log(111, e)
    window.keydown = true
})

document.addEventListener('keypress', (e) => {
    console.log(333, e)
})

document.addEventListener('keyup', (e) => {
    console.log(222, e)
    window.keydown = false
    const selection = getSelection()
    console.log(selection.anchorNode)
    console.log(selection.anchorOffset)
})

document.addEventListener('input', (e) => {
    console.log(444, e)
    e.preventDefault()
})

document.addEventListener('selectionchange', (e) => {
    console.warn(window.getSelection().anchorNode)
    if (window.keydown) {
        // focusTarget()
        window.keydown = false
    } else {

    }
})

function focusTarget() {
    const range = document.createRange()
    const selection = window.getSelection()
    range.setStart(document.getElementById('target').firstChild, 0)
    range.collapse(true)

    selection.removeAllRanges()
    selection.addRange(range)
}


window.setTimeout(() => {
    const range = document.createRange()
    const selection = window.getSelection()
    range.setStart(document.getElementById('target').firstChild, 0)
    range.collapse(true)

    selection.selectAllChildren(document.getElementById('target'))
    selection.collapse(document.getElementById('target'), 0)

    // selection.removeAllRanges()
    // selection.addRange(range)
    setTimeout(async () => {
        console.log(selection.anchorNode)
        console.log(selection.anchorOffset)
        console.log(selection.focusNode)
        console.log(selection.focusOffset)
        console.log(selection.type)
        console.log(selection.rangeCount)
        console.log(1111111111111)
        // await user.keyboard('ddd')
        const range = selection.getRangeAt(0)
        console.log(range.startContainer)

    }, 1000)
}, 1)


class DocumentFragmentExtended extends DocumentFragment {

}

const f = new DocumentFragmentExtended()

f.appendChild(<div>dddd</div>)

document.body.appendChild(f)
console.log(111, f)