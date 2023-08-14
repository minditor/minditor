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
    public eventCallbacksByEventName: {[key: string] : Set<Function>} = {}
    public eventToCallbackRef: {[key: string] : EventCallbackWithCapture} = {}
    public boundElements = new Set<HTMLElement>()
    public childDelegators: {[k:string]:EventDelegator} ={}
    constructor(public namespace?: string) {
    }
    
    createCallback(eventName: string, callbacksRef: Set<Function>, capture: boolean) : EventCallbackWithCapture {
        const callback = (e: Event) => {
            if (documentEvents[eventName]) {
                if (!Array.from(this.boundElements).some(el => documentEvents[eventName](el))) {
                    console.log("not my selection")
                    return false
                }
            }

            for(let callback of callbacksRef) {
                const returnValue = callback(e)
                if (returnValue === false) {
                    break
                }
            }
        }
        callback.capture = capture
        return callback as EventCallbackWithCapture
    }

    dispatch(event: Event, element?: HTMLElement) {
        // CAUTION 手动  this.dispatch 永远在  element 上
        if (element) {
            element.dispatchEvent(event)
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

        if(!this.eventCallbacksByEventName[event]) {
            this.eventCallbacksByEventName[event] = new Set()
            const callback = this.createCallback(event, this.eventCallbacksByEventName[event], capture)
            this.eventToCallbackRef[event] = callback
            // 已经 attach 过了，但是还没有监听该 event
            if (this.boundElements.size) {
                this.boundElements.forEach(attachedEl => attachedEl.addEventListener(event, callback, callback.capture))
            }
        }

        this.eventCallbacksByEventName[event].add(handle)

        return () => {
            this.eventCallbacksByEventName[event].delete(handle)
        }
    }

    removeAllListeners() {
        this.boundElements.forEach(attachedEl => {
            Object.entries(this.eventToCallbackRef).forEach(([event, callbackRef]) => {
                if (documentEvents[event]) {
                    document.removeEventListener(event, callbackRef)
                } else {
                    attachedEl!.removeEventListener(event, callbackRef)
                }
                delete this.eventToCallbackRef[event]
                delete this.eventCallbacksByEventName[event]
            })
        })
    }

    bindElement(element: HTMLElement) {
        if (this.boundElements.has(element)) throw new Error('event delegator already attached to this element')

        this.boundElements.add(element)

        Object.entries(this.eventToCallbackRef).forEach(([event, callback]) => {
            if (documentEvents[event]) {
                // TODO 是不是要改造一下 event？改到 element 上？
                document.addEventListener(event, callback, callback.capture)
            } else {
                element.addEventListener(event, callback, callback.capture)
            }
        })

        this.dispatch(new CustomEvent('bindElement', { detail: { element } }), element)

        return () => {
            this.unbindElement(element)
        }
    }

    unbindElement(element: HTMLElement) {
        if( !this.boundElements.has(element)) throw new Error('this element is not attached')

        Object.entries(this.eventToCallbackRef).forEach(([event, callbackRef]) => {
            if (documentEvents[event]) {
                document.removeEventListener(event, callbackRef)
            } else {
                element!.removeEventListener(event, callbackRef)
            }
            delete this.eventToCallbackRef[event]
            delete this.eventCallbacksByEventName[event]
        })

        this.boundElements.delete(element)
    }
}



