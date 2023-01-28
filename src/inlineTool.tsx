/**@jsx createElement*/
import { createElement } from './DOM'

import {$attr, $value, $map} from "./view";
import {CommandInstance, CommandInstanceArgv, CommandRunArgv} from "./command";


type InlineToolProps = Omit<Omit<CommandInstanceArgv, 'container'>, 'on'>


function InlineTool({ userSelectionRange, userMousePosition, visibleRangeRect, boundaryContainer} : InlineToolProps) {
    const $style = $attr(() => {

        // TODO range 看不见了，display 要 none
        // const rangeVisible = computed(() => rangeVisibility.value?.startEntry.isIntersecting && rangeVisibility.value?.endEntry.isIntersecting)

        console.log("111", visibleRangeRect.value?.top)

        if (!visibleRangeRect.value) {
            return { display: 'none'}
        } else {

            const rect = boundaryContainer.getBoundingClientRect()

            return {
                display: 'block',
                position: 'absolute', // CAUTION 注意 rangePosition 拿到的是相对于 modal boundary 的，所以我们这里也是相对于 modal boundary 的 absolute
                top: visibleRangeRect.value.top - rect.top + boundaryContainer.scrollTop -50,
                left: visibleRangeRect.value.left - rect.left,
                background:'#eee',
                transition: 'all'
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
