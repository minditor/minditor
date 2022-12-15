import {findNodeFromElement} from "./editing";
import {reactive, shallowRef, ref} from "@ariesate/reactivity";


function matchChar(str, offset, toMatch, endOffset = toMatch.length - 1) {
    if (!toMatch) return []

    const len = toMatch.length
    let startOffset = offset
    const skippedChars = []

    while(startOffset > endOffset) {
        let i = 0
        while(i < len) {
            if (str[startOffset-1-i] !== toMatch[len-1-i]) {
                break;
            }
            i++
        }

        // 说明是完整匹配了
        if (i === len) {
            return skippedChars
        } else {
            skippedChars.unshift(str[startOffset-1])
            startOffset--
        }
    }

    return false
}


class CharReader {
    constructor(node, offset) {
        this.node = node
        this.offset = offset
    }
    match([startChars, endChars = '']) {
        let offset = this.offset
        if (!matchChar(this.node.value.value, offset, endChars, offset-1)) return false

        const matchStartCharsOffset = matchChar(this.node.value.value, offset-endChars.length, startChars)

        return matchStartCharsOffset && matchStartCharsOffset.join('')
    }
}


export function registerCommands(commands, on) {
    commands.forEach(command => registerCommand(command, on))
}



const rectSizeObserver = (() => {
    const rectTargetToCallback = new WeakMap()

    const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
            // TODO 目前同时只有一个 callback
            console.log(entry)
            const callback = rectTargetToCallback.get(entry.target)
            callback(entry.contentRect)
        }
    })
    return {
        observe(inputElement, callback, triggerAtOnce) {
            const element = (inputElement instanceof HTMLElement) ? inputElement : inputElement.parentElement
            rectTargetToCallback.set(element, callback)
            observer.observe(element)
            if (triggerAtOnce) {
                Promise.resolve().then(() => {
                    callback(element.getBoundingClientRect())
                })
            }

            return function unobserve() {
                observer.unobserve(element)
                rectTargetToCallback.delete(element)
            }
        }
    }
})()


// TODO 应该注册一个事件，在回调里面统一准备参数就好了，现在有点浪费。
//  而且 command 是不是同时只能执行一个？如果是的，那么有一个执行就够了。
function registerCommand(command, on) {
    // activate: key/selection/scrollIntoView/hover?
    let event
    let test
    // 用户的注册的 command 有两种，一种是文字输入
    // 另一种是快捷键组合。

    if (command.onInput) {
        event = 'userInput'
        test = (e) => {
            console.log(e, command.onInput)
            if (e.detail.data === command.onInput) return true
        }
    } else if (command.onKey){
        event = 'keydown'
        test = (e) => {
            console.log(e)
            if (e.key === command.onKey) return true
        }
    }


    let instance
    let inputValue
    let boundingRect
    let activateAllReactive
    let deactivateAllReactive
    let unobserveInputValue
    let unobserveBoundingRect
    let caretContainer

    if (command.createInstance) {
        const container = document.createElement('div')
        document.body.appendChild(container)


        // 监听并修改在下面的 callback 成功激活后面
        inputValue = ref('')
        boundingRect = shallowRef({left: 0, top:0, bottom:0, right:0, width: 0, height: 0})
        const deactivateAllReactive = () => {
            // unobserveInputValue()
            unobserveBoundingRect()
        }

        activateAllReactive = () => {
            // 1. 这里会立刻通知位置变化
            debugger
            unobserveBoundingRect = rectSizeObserver.observe(caretContainer, (rect) => {
                console.log('observed', rect)
                boundingRect.value = rect
            }, true)

            // 2. TODO inputValue
        }

        // 让 instance 自己决定什么时候开始接受值的变化，什么时候不接受。这样可以设计一直  activate 的 instance.
        instance = command.createInstance({ container, activateAllReactive, deactivateAllReactive, inputValue, boundingRect, on })
    }


    const callback = (e) => {
        const selection = window.getSelection()
        // TODO 这里对于是否是作用在 selection 上面的 command 还要判断下。目前没有实现在 selection 上的 command，理论上是有的，例如高亮，加粗，评论。
        if (!selection.rangeCount || !selection.isCollapsed) return


        if (test(e)) {
            /**
             * 准备参数
             * charReader ?
             */
            const { startContainer, startOffset } = selection.getRangeAt(0)
            const node = findNodeFromElement(startContainer)
            const charReader = new CharReader(node, startOffset)

            // command 失败或者不匹配需要显示 return false。
            // 否则认为成功了，我们在这里 return false 给 event handle 表示要阻止默认的输入事件

            // instance 的 activate 只是一个通知。至于到底要不要接受值，是它自己决定的。
            caretContainer = startContainer
            debugger
            const result = instance ? instance.activate({ charReader, node }) : command.run({ charReader, node })


            // 命令成功执行，阻止其他默认行为。
            if (result !== false) {
                e.preventDefault()
                return false
            }
        }
    }


    // TODO 如果有 instance，要监听 deactivate 事件，调用 deactivate，不然监听的 inputValue 和 boundingRect 都没卸载

    on(event, callback)
}
