/**@jsx createElement*/
import { createElement } from './DOM'

import {$attr, $value, $map} from "./view";
import {CommandInstance, CommandInstanceArgv, CommandRunArgv} from "./command";

type Ref = {
    value: any
}

type InlineToolProps = {
    userSelectionRange: Ref,
}


function InlineTool({ userSelectionRange} : InlineToolProps) {
    const $style = $attr(() => {
        if (!userSelectionRange.value || userSelectionRange.value.collapsed) {
            return { display: 'none'}
        } else {
            const rect = userSelectionRange.value.startContainer.getBoundingClientRect ?
                userSelectionRange.value.startContainer.getBoundingClientRect() :
                userSelectionRange.value.startContainer.parentElement.getBoundingClientRect()

            return {
                display: 'block',
                position: 'fixed',
                top: rect.top - 50,
                left: rect.left,
                background:'#eee'
            }
        }
    })

    // @ts-ignore
    return <div style={$style}>
        <div>x</div>
        <div></div>
        <div>xxxxxx</div>
    </div>
}


export function registerCommands() {
    const inlineTool = {
        allowDefault: true,
        createInstance({ container, on, userSelectionRange } : CommandInstanceArgv) : CommandInstance {
            container.appendChild(InlineTool({userSelectionRange}))

            return {
                activate( argv :CommandRunArgv) {
                    console.log("activate suggestion")
                }
            }
        }
    }

    return [inlineTool]
}
