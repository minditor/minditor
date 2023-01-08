/**@jsx createElement*/
import { createElement } from './DOM'
import { autorun, isRef } from "@ariesate/reactivity";

import {$attr, $value, $map} from "./view";
import {CommandInstance, CommandInstanceArgv, CommandRunArgv} from "./command";
import {replaceNode} from "./editing";
import {setCursor} from "./buildReactiveView";



function InsertSuggestion({ userSelectionRange }) {
    // TODO 是两个 atom 作为指针，指向真正收到的 reactive 对象。
    const $style = $attr(() => {
        if (!userSelectionRange.value) {
            return { display: 'none'}
        } else {
            const rect = userSelectionRange.value.endContainer.getBoundingClientRect ?
                userSelectionRange.value.endContainer.getBoundingClientRect() :
                userSelectionRange.value.endContainer.parentElement.getBoundingClientRect()

            return {
                display: 'block',
                position: 'fixed',
                top: rect.top + 50,
                left: rect.left,
                background:'#eee'
            }
        }
    })

    // @ts-ignore
    return <div style={$style}>
        <div>x</div>
        <div></div>
        <div>yyyyy</div>
    </div>
}


export function registerCommands() {
    const insertSuggestion = {
        onKey: '/',
        run({ userSelectionRange }:CommandRunArgv) {
            const node = userSelectionRange.value.startNode
            if (node.previousSibling || node.value!.value.length !==1 ) {
                console.log(node.value!.value)
                return false
            }

            const newNode = replaceNode({type: 'InsertSuggestion'}, node)
            // TODO 现在这里有点问题， replaceNode 没有 patchPoint, 所以现在又用了 Promise.resolve().then() 来更新。reactivity 里面，再给一下。
            setTimeout(() => {
                setCursor(newNode, 0)
            }, 0)
        }
    }

    return [insertSuggestion]
}
