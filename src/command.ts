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


export type RectSizeObserver = {
    observe: (argv: HTMLElement | Node) => ([Ref, Function])
}

export type CommandInstanceArgv = {
    container: HTMLElement,
    userSelectionRange: Ref,
    on: Function,
    rectSizeObserver : RectSizeObserver
}

export type Command = {
    onKey?: string
    onInput?: string
    allowDefault? : boolean
    createInstance?: (argv: CommandInstanceArgv) => CommandInstance
    run?: (argv: CommandRunArgv) => any
}

export class CommandInstance {
    activate(argv: CommandRunArgv) {}
    deactivate?: Function
}

export type CommandRunArgv = {
    userSelectionRange: Ref,
    charReader: CharReader
}


type Utils = {on: Function, userSelectionRange: Ref}

export function registerCommands(commands: (Command)[], utils: Utils ) {
    commands.forEach(command => registerCommand(command, utils))
}

export const rectSizeObserver = (() => {
    const rectTargetToCallback = new WeakMap()
    const rectTargetToValue = new WeakMap()
    const rectTargetObserverCount = new WeakMap()

    const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
            // TODO 目前同时只有一个 callback
            console.log(entry)
            const callback = rectTargetToCallback.get(entry.target)
            callback(entry.contentRect)
        }
    })

    return {
        observe(inputElement: HTMLElement | Node) {
            const element = (inputElement instanceof HTMLElement) ? inputElement : inputElement.parentElement!

            let value: Ref = rectTargetToValue.get(element)
            if (!value) {
                rectTargetToValue.set(element, (value = shallowRef(element.getBoundingClientRect())))
                rectTargetToCallback.set(element, (newRect: DOMRectReadOnly) => value.value = newRect)
                rectTargetObserverCount.set(element, (rectTargetObserverCount.get(element) || 0) + 1)
                observer.observe(element)
            }

            return [
                value,
                function unobserve() {
                    const count = rectTargetObserverCount.get(element)
                    if (!(count > 0)) throw new Error('unexpected unobserve called')
                    const newCount = count -1
                    if (newCount) {
                        rectTargetObserverCount.set(element, newCount)
                    } else {
                        rectTargetToValue.delete(element)
                        rectTargetToCallback.delete(element)
                        rectTargetObserverCount.delete(element)
                        observer.unobserve(element)
                    }
                }]
        }
    } as RectSizeObserver
})()


// TODO 应该注册一个事件，在回调里面统一准备参数就好了，现在有点浪费。
//  而且 command 是不是同时只能执行一个？如果是的，那么有一个执行就够了。

type CommandCallback = Function & {
    allowDefault? : boolean
}

const commandsByEvent: {[key: string] : Set<CommandCallback>} = {}

function createEventCommandCallback(commandCallbacks: Set<CommandCallback>) {
    return function(e: Event) {
        for(let callback of commandCallbacks) {
            const callbackMatch = callback(e)
            // 只要不是显示 return false，就表示匹配成功了。
            // command test 不匹配的时候也会主动 return false，下面自动处理了
            if (callbackMatch !== false) {
                if (!callback.allowDefault) {
                    console.log('not allow default ')
                    e.preventDefault()
                }

                e.stopPropagation()
                break
            }
        }
    }

}


// TODO activated ? 的变量？
function registerCommand(command: Command, utils: Utils) {
    const {on, userSelectionRange} = utils
    // activate: key/selection/scrollIntoView/hover?
    let event: string | undefined
    let test : Function|undefined
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


    let caretContainer: Node

    if (command.createInstance) {
        if (event) throw new Error('command with instance should handle event by itself')
        const container = document.createElement('div')
        document.body.appendChild(container)

        // 让 instance 自己决定什么时候开始接受值的变化，什么时候不接受。这样可以设计一直  activate 的 instance.
        command.createInstance({
            container,
            userSelectionRange,
            on,
            rectSizeObserver,
        })
    } else {
        const callback = (e: Event) => {
            const selection = window.getSelection()!
            // TODO 这里对于是否是作用在 selection 上面的 command 还要判断下。目前没有实现在 selection 上的 command，理论上是有的，例如高亮，加粗，评论。
            if (!selection.rangeCount || !selection.isCollapsed) return


            if (test && test(e)) {
                /**
                 * 准备参数
                 * charReader ?
                 */
                const charReader = new CharReader(userSelectionRange.value.startNode, userSelectionRange.value.startOffset)

                // command 失败或者不匹配需要显示 return false。
                // 否则认为成功了，我们在这里 return false 给 event handle 表示要阻止默认的输入事件


                // 如果显式地 return false，表示执行过程中发现不匹配，还是可以让其他命令继续执行。
                // 如果直接是失败，应该 throw new Error
                return command.run!({ charReader, userSelectionRange })
            } else {
                // 表示不匹配，一定要显示地表达出来
                return false
            }
        }


        if (event) {
            if (!commandsByEvent[event!]) {
                commandsByEvent[event!] = new Set()
                on(event!, createEventCommandCallback(commandsByEvent[event!]) )
            }

            commandsByEvent[event!].add(callback)
        }
    }



}
