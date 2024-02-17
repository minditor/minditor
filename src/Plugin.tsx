import {Document} from "./Document";
import {state as globalKM} from "./globals";
import {atom, createRoot, createElement} from 'axii'
import {assert, nextJob, nextTask} from "./util";

export type EventMatchHandle = (e: unknown) => boolean
export type EventCallback = (e: unknown, args?: PluginRunArgv) => any
export type PluginRunArgv = {

}


export class Plugin {
    public static displayName = 'Plugin'
    public static activateEventListeners: Map<string, Set<EventCallback>> = new Map()
    public static deactivateEventListeners: Map<string, Set<EventCallback>> = new Map()
    public static activateEvents: {[k: string]: (e:unknown) => boolean}
    public static deactivateEvents: {[k: string]: (e:unknown) => boolean}
    public activated = atom(false)
    public root?: ReturnType<typeof createRoot>
    public removeListenerHandles = new Set<() => any>()
    constructor(public document: Document) {
        this.addActivateEventListeners()
    }
    run(args: PluginRunArgv) : any{

    }
    render(): JSX.Element|null {
        return null
    }
    renderPluginView() {
        assert(!this.root, 'plugin view should only render once')
        // CAUTION 注意这里的 userSelect: 'none' 非常重要，防止了正文中触发的 selection change，以及对依赖于 selectionRange 的各种功能的破坏。
        const element = <div style={{userSelect: 'none'}}/> as unknown as HTMLElement
        this.root = createRoot(element)
        this.root.render(this.render()!)
        return this
    }
    destroy() {
        this.removeListenerHandles.forEach(h => h())
        this.root?.dispose()
        delete this.root
    }
    addActivateEventListeners() {
        const ThisPluginKlass = this.constructor as typeof Plugin
        Object.entries(ThisPluginKlass.activateEvents || {}).forEach(([eventName, eventMatchHandle]: [string, EventMatchHandle]) => {
            let callbacks = Plugin.activateEventListeners.get(eventName)
            if (!callbacks) {
                Plugin.activateEventListeners.set(eventName, (callbacks = new Set()))

                const remove = this.document.view.listen(eventName, (e:any) => {
                    const args = {
                        content: this.document.content,
                        view: this.document.view,
                        range: globalKM.selectionRange,
                        docRange: this.document.view.state.selectionRange
                    }

                    // CAUTION 放到 nextTask 里面 run 这样用户可以放心的处理 history 等
                    // CAUTION 同时只允许激活一个。如果用户有合并需求，自己写个合并类。
                    nextTask(() => {
                        for(let callback of callbacks!) {
                            if(callback(e, args)) break
                        }
                    })

                },  true)
                this.removeListenerHandles.add(remove)
            }

            callbacks.add((e: unknown, args?: PluginRunArgv) => {
                if (!eventMatchHandle(e)) return
                console.log("activating", this)
                this.activated(true)
                return this.run(args!)
            })
        })

        Object.entries(ThisPluginKlass.deactivateEvents || {}).forEach(([eventName, eventMatchHandle]: [string, EventMatchHandle]) => {
            let callbacks = Plugin.deactivateEventListeners.get(eventName)
            if (!callbacks) {
                Plugin.deactivateEventListeners.set(eventName, (callbacks = new Set()))
                const remove = this.document.view.listen(eventName, (e:any) => {
                    for(let callback of callbacks!) {
                        callback(e)
                    }
                })
                this.removeListenerHandles.add(remove)
            }

            callbacks.add((e: unknown) => {
                if (!eventMatchHandle(e)) return
                console.warn('deactivated', this)
                this.activated(false)
            })
        })

        if (!ThisPluginKlass.deactivateEvents && !ThisPluginKlass.activateEvents) {
            this.activated(true)
        }
    }

}
