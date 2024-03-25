import {Document} from "./Document";
import {state as globalKM} from "./globals";
import {atom, createElement, createRoot} from 'axii'
import {assert, nextTask} from "./util";

export type EventMatchHandle = (this:Plugin, e: unknown) => boolean
export type EventCallback = (this:Plugin, e: unknown, args?: PluginRunArgv) => any
export type PluginRunArgv = {

}

export class Plugin {
    public static displayName = 'Plugin'
    public static activateEventListeners: WeakMap<Document, Map<string, Set<EventCallback>>> = new WeakMap()
    public static deactivateEventListeners: WeakMap<Document, Map<string, Set<EventCallback>>> = new WeakMap()
    // Plugin use these to listen to events and decide whether to activate or deactivate
    public static activateEvents: {[k: string]: (e:any) => boolean}
    public static deactivateEvents: {[k: string]: (e:any) => boolean}
    public static position: 'sameScroll' | 'sameContainer' | 'outOfScroll' = 'sameContainer'
    public activated = atom(false)
    public root?: ReturnType<typeof createRoot>
    public removeListenerHandles = new Set<() => any>()
    constructor(public document: Document) {
        this.addActivateEventListeners()
    }
    // for one-time execution. triggered when activate events dispatched
    run(args: PluginRunArgv) : any{

    }
    // for plugin which need to render a consistent view
    render(outsideDocBoundary = false): JSX.Element|null {
        return null
    }
    onDeactivated() {

    }
    onActivated() {

    }
    renderPluginView(outsideDocBoundary = false) {
        assert(!this.root, 'plugin view should only render once')
        // CAUTION 注意这里的 userSelect: 'none' 非常重要，防止了正文中触发的 selection change，以及对依赖于 selectionRange 的各种功能的破坏。
        const element = <div style={{userSelect: 'none'}}/>  as HTMLElement
        this.root = createRoot(element)
        this.root.render(this.render(outsideDocBoundary)!)
        return this
    }
    activate() {
        this.activated(true)
        this.onActivated()
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
                    // CAUtION because we allow document inside document and event may bubble out,
                    //  we need to check if the event is form THIS document.
                    if (!this.document.view.state.selectionRange()) return

                    const args = {
                        content: this.document.content,
                        view: this.document.view,
                        range: globalKM.selectionRange,
                        docRange: this.document.view.state.selectionRange
                    }

                    // CAUTION only one plugin will be activated at a time
                    // CAUTION wrap in nextTask so plugin can get right state of History and other things
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
                this.activate()
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
            this.activate()
        }
    }
}
