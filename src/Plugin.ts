import { Document} from "./Document";
import {DocRange, Text} from "./DocNode";
import {DocumentContent} from "./Content";
import {DocumentContentView} from "./View";
import {state as globalKM} from "./globals";

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
    public static activateEvents: {[k: string]: (e:Event) => boolean}
    constructor(public document: Document) {
        this.addActivateEventListeners()
        this.render()
    }
    run(args: PluginRunArgv) : any{

    }
    render() {

    }
    addActivateEventListeners() {
        const ThisPluginKlass = this.constructor as typeof Plugin
        Object.entries(ThisPluginKlass.activateEvents).forEach(([eventName, eventMatchHandle]: [string, EventMatchHandle]) => {
            let callbacks = Plugin.activateEventListeners.get(eventName)
            if (!callbacks) {
                Plugin.activateEventListeners.set(eventName, (callbacks = new Set()))
                console.log('add event listener', eventName)

                // FIXME type
                // @ts-ignore
                this.document.view.element?.addEventListener(eventName, (e) => {
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
                return this.run(args)
            })
        })
    }

}
