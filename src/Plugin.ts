import { Document} from "./Document";
import {DocRange, Text} from "./DocNode";
import {DocumentContent} from "./Content";
import {DocumentContentView} from "./View";
import {state as globalKM} from "./globals";
import {atom} from 'rata'
import {assert} from "./util";
import {createHost, Host} from 'axii'

export type EventMatchHandle = (e: Event) => boolean
export type EventCallback = (e: Event, args: PluginRunArgv) => any
export type PluginRunArgv = {
    content: DocumentContent,
    view: DocumentContentView,
    range?: Range,
    docRange?: DocRange
}

export class Plugin {
    public static activateEventListeners: Map<string, Set<EventCallback>> = new Map()
    public static deactivateEventListeners: Map<string, Set<EventCallback>> = new Map()
    public static activateEvents: {[k: string]: (e:Event) => boolean}
    public static deactivateEvents: {[k: string]: (e:Event) => boolean}
    public activated = atom(false)
    public host?: Host
    constructor(public document: Document) {
        this.addActivateEventListeners()
    }
    run(args: PluginRunArgv) : any{

    }
    render() {
        return undefined
    }
    renderPluginView() {
        assert(!this.host, 'plugin view should only render once')
        const fragment = document.createDocumentFragment()
        const placeholder = new Comment('plugin')
        fragment.appendChild(placeholder)
        this.host = createHost(this.render(), placeholder)

        this.host.render()
        return fragment
    }
    destroy() {
        this.host.destroy()
        delete this.host
    }
    addActivateEventListeners() {
        const ThisPluginKlass = this.constructor as typeof Plugin
        Object.entries(ThisPluginKlass.activateEvents || {}).forEach(([eventName, eventMatchHandle]: [string, EventMatchHandle]) => {
            let callbacks = Plugin.activateEventListeners.get(eventName)
            if (!callbacks) {
                Plugin.activateEventListeners.set(eventName, (callbacks = new Set()))
                console.log('add event listener', eventName)

                // FIXME type
                // @ts-ignore
                this.document.view.listen(eventName, (e) => {
                    let range: Range
                    let docRange: DocRange
                    if (globalKM.selectionRange) {
                        range = globalKM.selectionRange
                        docRange = this.document.view.createDocRange(range)
                    }
                    const args = {
                        content: this.document.content,
                        view: this.document.view,
                        range,
                        docRange
                    }

                    // CAUTION 同时只允许激活一个。如果用户有合并需求，自己写个合并类。
                    for(let callback of callbacks) {
                        if(callback(e, args)) break
                    }
                })
            }

            callbacks.add((e: Event, args: PluginRunArgv) => {
                console.log('dispatching', eventName, e)
                if (!eventMatchHandle(e)) return
                console.log("activating", this)
                this.activated(true)
                return this.run(args)
            })
        })

        Object.entries(ThisPluginKlass.deactivateEvents || {}).forEach(([eventName, eventMatchHandle]: [string, EventMatchHandle]) => {
            let callbacks = Plugin.deactivateEventListeners.get(eventName)
            if (!callbacks) {
                Plugin.deactivateEventListeners.set(eventName, (callbacks = new Set()))
                // FIXME type
                // @ts-ignore
                this.document.view.listen(eventName, (e) => {
                    for(let callback of callbacks) {
                        callback(e)
                    }
                })
            }

            callbacks.add((e: Event, args: PluginRunArgv) => {
                console.log('dispatching', eventName, e)
                if (e.key === 'Escape') debugger
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
