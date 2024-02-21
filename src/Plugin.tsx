import {Document} from "./Document";
import {state as globalKM} from "./globals";
import {atom, createRoot, createElement} from 'axii'
import {assert, nextJob, nextTask} from "./util";

export type EventMatchHandle = (this:Plugin, e: unknown) => boolean
export type EventCallback = (this:Plugin, e: unknown, args?: PluginRunArgv) => any
export type PluginRunArgv = {

}


export class Plugin {
    public static displayName = 'Plugin'
    public static activateEventListeners: WeakMap<Document, Map<string, Set<EventCallback>>> = new WeakMap()
    public static deactivateEventListeners: WeakMap<Document, Map<string, Set<EventCallback>>> = new WeakMap()
    // Plugin 自己需要覆盖的
    public static activateEvents: {[k: string]: (e:any) => boolean}
    public static deactivateEvents: {[k: string]: (e:any) => boolean}
    public activated = atom(false)
    public root?: ReturnType<typeof createRoot>
    public removeListenerHandles = new Set<() => any>()
    constructor(public document: Document) {
        this.addActivateEventListeners()
    }
    run(args: PluginRunArgv) : any{

    }
    render(outsideDocBoundary = false): JSX.Element|null {
        return null
    }
    onDeactivated() {

    }
    renderPluginView(outsideDocBoundary = false) {
        assert(!this.root, 'plugin view should only render once')
        // CAUTION 注意这里的 userSelect: 'none' 非常重要，防止了正文中触发的 selection change，以及对依赖于 selectionRange 的各种功能的破坏。
        const element = <div style={{userSelect: 'none'}}/>  as HTMLElement
        this.root = createRoot(element)
        this.root.render(this.render(outsideDocBoundary)!)
        return this
    }
    deactivate() {
        this.activated(false)
        this.onDeactivated()
    }
    destroy() {
        this.removeListenerHandles.forEach(h => h())
        this.root?.destroy()
        delete this.root
    }
    addActivateEventListeners() {
        const ThisPluginKlass = this.constructor as typeof Plugin
        Object.entries(ThisPluginKlass.activateEvents || {}).forEach(([eventName, eventMatchHandle]: [string, EventMatchHandle]) => {
            let activateEventListeners = Plugin.activateEventListeners.get(this.document)
            if (!activateEventListeners) Plugin.activateEventListeners.set(this.document, (activateEventListeners = new Map()))

            let callbacks = activateEventListeners.get(eventName)
            if (!callbacks) {
                activateEventListeners.set(eventName, (callbacks = new Set()))
                const listener = (e:any) => {
                    // CAUtION 因为允许文档嵌套，所以我们需要在这里判断是否是当前文档的事件
                    //  我们没有使用阻止事件冒泡的方式是因为，万一以后有外部监听内部的需求的话，还能用事件。
                    //  而且应该 内部 document 是否应该当做一个完整的盒子不冒泡任何出来，应该是个严肃的需要讨论的事情。
                    if (!this.document.view.state.selectionRange()) return

                    const args = {
                        content: this.document.content,
                        view: this.document.view,
                        range: globalKM.selectionRange,
                        docRange: this.document.view.state.selectionRange
                    }

                    // CAUTION 所有的 plugin 合在一起，只要有一个 plugin 激活了，就不会再激活其他的 plugin
                    // CAUTION 放到 nextTask 里面 run 这样用户可以放心的处理 history 等
                    nextTask(() => {
                        for(let callback of callbacks!) {
                            if(callback.call(this, e, args)) break
                        }
                    })
                }

                this.removeListenerHandles.add(this.document.view.listen(eventName,listener, true))
            }

            callbacks.add((e: unknown, args?: PluginRunArgv) => {
                if (!eventMatchHandle.call(this, e)) return
                console.log("activating", this)
                this.activated(true)
                return this.run(args!)
            })
        })

        Object.entries(ThisPluginKlass.deactivateEvents || {}).forEach(([eventName, eventMatchHandle]: [string, EventMatchHandle]) => {
            let deactivateEventListeners = Plugin.deactivateEventListeners.get(this.document)
            if (!deactivateEventListeners) Plugin.deactivateEventListeners.set(this.document, (deactivateEventListeners = new Map()))
            let callbacks = deactivateEventListeners.get(eventName)
            if (!callbacks) {
                deactivateEventListeners.set(eventName, (callbacks = new Set()))
                const remove = this.document.view.listen(eventName, (e:any) => {
                    for(let callback of callbacks!) {
                        callback.call(this, e)
                    }
                })
                this.removeListenerHandles.add(remove)
            }

            callbacks.add((e: unknown) => {
                if (!eventMatchHandle.call(this, e)) return
                console.warn('deactivated', this)
                this.deactivate()
            })
        })

        if (!ThisPluginKlass.deactivateEvents && !ThisPluginKlass.activateEvents) {
            this.activated(true)
        }
    }

}
