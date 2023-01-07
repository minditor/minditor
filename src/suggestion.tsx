/**@jsx createElement*/
import { createElement } from './DOM'
import { autorun, isRef } from "@ariesate/reactivity";

import {$attr, $value, $map} from "./view";
import {CommandInstance, CommandInstanceArgv, CommandRunArgv} from "./command";

type SuggestionProp = Omit<CommandInstanceArgv, 'container'>


function Suggestion({ activateAllReactive, deactivateAllReactive, boundingRect, inputValue }: SuggestionProp) {
    // TODO 是两个 atom 作为指针，指向真正收到的 reactive 对象。
    const $style = $attr(() => ({position: 'fixed', top: boundingRect.value.bottom, left: boundingRect.value.left, background:'#eee'}))

    // @ts-ignore
    return <div style={$style}>
        <div>x</div>
        <div></div>
        <div>{$value(() => JSON.stringify(boundingRect.value))}</div>
    </div>
}


export function registerCommands() {
    const insertSuggestion = {
        onInput: '/',
        allowDefault: true,
        createInstance({ container, ...props } : CommandInstanceArgv) : CommandInstance {

            container.appendChild(Suggestion(props))

            return {
                activate( argv :CommandRunArgv) {
                    console.log("activate suggestion")
                    props.activateAllReactive()
                }
            }
        }
    }

    return [insertSuggestion]
}
