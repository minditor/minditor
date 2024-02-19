import { state as globalKM} from './globals'


type EventCallbackWithCapture = EventListenerOrEventListenerObject & {
    capture: boolean
}


type DocumentEventsHandle = {
    [k: string]: (arg0: HTMLElement) => boolean
}

const documentEvents: DocumentEventsHandle = {
    'selectionchange': (target: HTMLElement) => target.contains(globalKM.selectionRange?.commonAncestorContainer!) || target === globalKM.selectionRange?.commonAncestorContainer
}


export class EventDelegator {
    // 两层结构，第一层事件名，第二层是 capture
    public eventToCallbacks  = new Map<string, Map<boolean, Set<Function>>>()
    // 两层结构，第一层是事件名，第二层是 capture
    public eventToListener = new Map<string, Map<boolean, EventCallbackWithCapture>>()
    public boundElements = new Set<HTMLElement>()
    public childDelegators: {[k:string]:EventDelegator} ={}
    constructor(public namespace?: string) {
    }
    
    createListener(eventName: string, callbacks: Set<Function>, capture: boolean) : EventCallbackWithCapture {
        const listener = (e: Event) => {
            if (documentEvents[eventName]) {
                if (!Array.from(this.boundElements).some(el => documentEvents[eventName](el))) {
                    return false
                }
            }

            for(let callback of callbacks) {
                const returnValue = callback(e)
                if (returnValue === false) {
                    break
                }
            }
        }
        listener.capture = capture
        return listener as EventCallbackWithCapture
    }

    dispatch(event: Event, element?: HTMLElement, capture?: boolean) {
        // CAUTION 手动  this.dispatch 永远在  element 上
        if (element) {
            if (capture !== undefined) {
                element.dispatchEvent(event)
            }
        } else {
            this.boundElements.forEach(el => el.dispatchEvent(event))
        }

    }

    listen(inputEvent: string, handle: Function, capture = false) : () => any{
        const [namespace, eventName] = inputEvent.split(':')
        if (namespace && eventName) {
            if (!this.childDelegators[namespace]) {
                this.childDelegators[namespace] = new EventDelegator(namespace)
            }
            return this.childDelegators[namespace].listen(eventName, handle, capture)
        }

        const event = inputEvent

        if(!this.eventToListener.get(event)) {
            const newCallbacksMap = new Map()
            newCallbacksMap.set(true, new Set())
            newCallbacksMap.set(false, new Set())
            this.eventToCallbacks.set(event, newCallbacksMap)

            const newListenerMap = new Map()
            this.eventToListener.set(event, newListenerMap)


        }

        if (!this.eventToListener.get(event)!.get(capture)) {
            const listener = this.createListener(event, this.eventToCallbacks.get(event)!.get(capture)!, capture)
            this.eventToListener.get(event)!.set(capture, listener)
            // 给所有已绑定的 Element 上添加 listener
            if (documentEvents[event]) {
                document.addEventListener(event, listener, listener.capture)
            } else if (this.boundElements.size) {
                this.boundElements.forEach(attachedEl => {
                    attachedEl.addEventListener(event, listener, capture)
                })
            }
        }


        this.eventToCallbacks.get(event)!.get(capture)!.add(handle)

        return () => {
            this.eventToCallbacks.get(event)!.get(capture)!.delete(handle)
        }
    }

    removeAllListeners() {
        this.boundElements.forEach(attachedEl => {
            for(let event of this.eventToListener.keys()) {
                const target = documentEvents[event] ? document : attachedEl
                target.removeEventListener(event, this.eventToListener.get(event)!.get(true)! as EventListener,true)
                target.removeEventListener(event, this.eventToListener.get(event)!.get(false)! as EventListener)
            }
        })
        this.eventToCallbacks.clear()
        this.eventToListener.clear()
    }

    bindElement(element: HTMLElement) {
        if (this.boundElements.has(element)) throw new Error('event delegator already attached to this element')

        this.boundElements.add(element)

        for(let [event, listener] of this.eventToListener) {
            if (!documentEvents[event]) {
                element.addEventListener(event, listener.get(true)!, true)
                element.addEventListener(event, listener.get(false)!, false)
            }
        }

        this.dispatch(new CustomEvent('bindElement', { detail: { element } }), element)

        return () => {
            this.unbindElement(element)
        }
    }

    unbindElement(element: HTMLElement) {
        if( !this.boundElements.has(element)) throw new Error('this element is not attached')

        for(let [event, listener] of this.eventToListener) {
            if (!documentEvents[event]) {
                element.removeEventListener(event, listener.get(true)!, true)
                element.removeEventListener(event, listener.get(false)!, false)
            }
        }

        this.boundElements.delete(element)
    }
}



