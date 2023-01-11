/**@jsx createElement*/
import { createElement } from './DOM'

import {$attr, $value, $map} from "./view";
import {autorun, autorunForEach, shallowRef, computed} from '@ariesate/reactivity'
import {CommandInstance, CommandInstanceArgv, CommandRunArgv} from "./command";


type InlineToolProps = Omit<Omit<CommandInstanceArgv, 'container'>, 'on'>


function InlineTool({ userSelectionRange, userMousePosition, rangeVisibility} : InlineToolProps) {
    const $style = $attr(() => {

        // TODO range 看不见了，display 要 none
        // const rangeVisible = computed(() => rangeVisibility.value?.startEntry.isIntersecting && rangeVisibility.value?.endEntry.isIntersecting)


        if (!userSelectionRange.value || userSelectionRange.value.collapsed) {
            return { display: 'none'}
        } else {
            // TODO 自身的位置还要考虑 mousePosition 和 container 的边界？
            // TODO 还要考虑 range 整个大于 container 的情况
            // TODO 浮层位置算法
            //  1. 鼠标位置相同方向（上或者下）
            //  2. 浮层的重点不能超过最近的 rect 的边界（所以还必须知晓浮层的宽度）
            //  3. 更具 container 的边界信息对浮层位置进行必要的上下翻转？左右位置微调？
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
        <div>{$value(() => userMousePosition.value && JSON.stringify(userMousePosition.value))}</div>
    </div>
}


export function registerCommands() {
    const inlineTool = {
        allowDefault: true,
        createInstance({ container, on, ...props} : CommandInstanceArgv) : CommandInstance {

            container.appendChild(InlineTool(props))

            return {
                activate( argv :CommandRunArgv) {
                    console.log("activate suggestion")
                }
            }
        }
    }

    return [inlineTool]
}
