import {findNodeFromElement} from "./editing";
// @ts-ignore
import {reactive, shallowRef, ref} from "@ariesate/reactivity";
import {NodeType} from "./NodeType";

type Ref = {
    value: any
}

type ShallowRef = {
    value: any
}

function matchChar(str: string, offset: number, toMatch: string, endOffset = toMatch.length - 1) : false | string[] {
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


export type CharPairs = [string, string?]

export class CharReader {
    node: NodeType
    offset: number
    constructor(node: NodeType, offset: number) {
        this.node = node
        this.offset = offset
    }
    match([startChars, endChars = ''] : CharPairs) {
        let offset = this.offset
        // 先判断 endChars 是否 match
        if (!matchChar(this.node.value!.value, offset, endChars, offset-1)) return false

        // 再判断 startChars
        const matchStartCharsOffset = matchChar(this.node.value!.value, offset-endChars.length, startChars)

        return Array.isArray(matchStartCharsOffset) ? matchStartCharsOffset.join('') : matchStartCharsOffset
    }
}


export type CommandInstanceArgv = {
    container: HTMLElement,
    activateAllReactive: Function,
    deactivateAllReactive: Function,
    inputValue: Ref,
    boundingRect: ShallowRef,
    on: Function
}

export type Command = {
    onKey?: string
    onInput?: string
    createInstance?: (argv: CommandInstanceArgv) => CommandInstance
    run?: (argv: CommandRunArgv) => any
}

export class CommandInstance {
    activate(argv: CommandRunArgv) {}
    deactivate?: Function
}

export type CommandRunArgv = {
    node: NodeType,
    charReader: CharReader
}



export function registerCommands(commands: (Command)[], on: Function) {
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
        observe(inputElement: HTMLElement | Node, callback: Function, triggerAtOnce: boolean) {
            const element = (inputElement instanceof HTMLElement) ? inputElement : inputElement.parentElement!
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

const commandsByEvent: {[key: string] : Set<Function>} = {}

function createEventCommandCallback(commandCallbacks: Set<Function>) {
    return function(e: Event) {
        for(let callback of commandCallbacks) {
            const callbackMatch = callback(e)
            // 只要不是显示 return false，就表示匹配成功了。
            // command test 不匹配的时候也会主动 return false，下面自动处理了
            if (callbackMatch !== false) {
                e.preventDefault()
                e.stopPropagation()
                break
            }
        }
    }

}


function registerCommand(command: Command, on: Function) {
    // activate: key/selection/scrollIntoView/hover?
    let event: string
    let test : Function
    // 用户的注册的 command 有两种，一种是文字输入
    // 另一种是快捷键组合。

    if (command.onInput) {
        event = 'userInput'
        test = (e: CustomEvent) => {
            if (e.detail.data! === command.onInput) return true
        }
    } else if (command.onKey){
        event = 'keydown'
        test = (e: KeyboardEvent) => {
            if (e.key === command.onKey) return true
        }
    }


    let instance: CommandInstance|undefined
    let inputValue
    let boundingRect: ShallowRef
    let activateAllReactive
    let deactivateAllReactive
    let unobserveInputValue
    let unobserveBoundingRect: Function
    let caretContainer: Node

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
            unobserveBoundingRect = rectSizeObserver.observe(caretContainer, (rect: DOMRect) => {
                console.log('observed', rect)
                boundingRect.value = rect
            }, true)

            // 2. TODO inputValue
        }

        // 让 instance 自己决定什么时候开始接受值的变化，什么时候不接受。这样可以设计一直  activate 的 instance.
        instance = command.createInstance({ container, activateAllReactive, deactivateAllReactive, inputValue, boundingRect, on })
    }


    const callback = (e: Event) => {
        const selection = window.getSelection()!
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

            // 如果显式地 return false，表示执行过程中发现不匹配，还是可以让其他命令继续执行。
            // 如果直接是失败，应该 throw new Error
            return instance ? instance.activate({ charReader, node }) : command.run!({ charReader, node })
        } else {
            // 表示不匹配，一定要显示地表达出来
            return false
        }
    }


    // TODO 如果有 instance，要监听 deactivate 事件，调用 deactivate，不然监听的 inputValue 和 boundingRect 都没卸载

    if (!commandsByEvent[event!]) {
        commandsByEvent[event!] = new Set()
        on(event!, createEventCommandCallback(commandsByEvent[event!]))
    }

    commandsByEvent[event!].add(callback)
}
