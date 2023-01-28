/**@jsx createElement*/
import { createElement } from './DOM'

import {$attr, $value, $map} from "./view";
import {CommandInstance, PluginInstanceArgv, PluginRunArgv} from "./plugin";
import {replaceNode} from "./editing";
import {setCursor} from "./buildReactiveView";

export function registerCommands() {
    const insertSuggestion = {
        onKey: '/',
        run({ userSelectionRange }:PluginRunArgv) {
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
