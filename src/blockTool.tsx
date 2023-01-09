/**@jsx createElement*/
import { createElement } from './DOM'

import {$attr, $value, $map} from "./view";
import {CommandInstance, CommandInstanceArgv, CommandRunArgv} from "./command";
import { findElementOrFirstChildFromNode } from "./buildReactiveView";

type Ref = {
    value: any
}

type InlineToolProps = {
    visualFocusedBlockNode: Ref,
}


function BlockTool({ visualFocusedBlockNode} : InlineToolProps) {
    const $style = $attr(() => {
        if (!visualFocusedBlockNode.value || visualFocusedBlockNode.value.collapsed) {
            return { display: 'none'}
        } else {
            const el = findElementOrFirstChildFromNode(visualFocusedBlockNode.value)
            const rect = el.getBoundingClientRect()

            return {
                display: 'block',
                position: 'fixed',
                top: rect.top,
                left: rect.left-10,
                background:'#eee'
            }
        }
    })

    // @ts-ignore
    return <div style={$style}>
        <div>x</div>
        <div></div>
        <div>blockTool</div>
    </div>
}


export function registerCommands() {
    const blockTool = {
        createInstance({ container, visualFocusedBlockNode } : CommandInstanceArgv) : CommandInstance {
            container.appendChild(BlockTool({ visualFocusedBlockNode }))

            return {
                activate( argv :CommandRunArgv) {
                    console.log("activate suggestion")
                }
            }
        }
    }

    return [blockTool]
}
