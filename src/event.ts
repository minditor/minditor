


export type EventDelegator = {
    on: (inputEvent: string, handle: Function, capture?: boolean) => void,
    removeAll: Function,
    trigger: (event:Event) => void,
    attach: (el: HTMLElement|Document) => void
    subDelegators: {[key: string]: EventDelegator}
}


type EventCallbackWithCapture = EventListenerOrEventListenerObject & {
    capture: boolean
}

export function createDelegator(namespace = 'global'): EventDelegator {
    const eventCallbacksByEventName: {[key: string] : Set<Function>} = {}
    const eventToCallbackRef: {[key: string] : EventCallbackWithCapture} = {}

    const subDelegators: EventDelegator['subDelegators'] ={}

    function createCallback(callbacksRef: Set<Function>, capture: boolean) : EventCallbackWithCapture {
        const callback = (e: any) => {
            for(let callback of callbacksRef) {
                const returnValue = callback(e)
                if (returnValue === false) {
                    break
                }
            }
        }
        callback.capture = capture
        return callback
    }


    function trigger(event: Event) {
        document.dispatchEvent(event)
    }

    function on(inputEvent: string, handle: Function, capture = false) {
        const [namespace, eventName] = inputEvent.split(':')
        if (namespace && eventName) {
            if (!subDelegators[namespace]) {
                subDelegators[namespace] = createDelegator(namespace)
            }
            subDelegators[namespace].on(eventName, handle, capture)
            return
        }


        const event = inputEvent
        if(!eventCallbacksByEventName[event]) {
            eventCallbacksByEventName[event] = new Set()
            eventToCallbackRef[event] = createCallback(eventCallbacksByEventName[event], capture)
        }

        eventCallbacksByEventName[event].add(handle)
        return function off() {
            eventCallbacksByEventName[event].delete(handle)
        }
    }

    function removeAll() {
        Object.entries(eventToCallbackRef).forEach(([event, callbackRef]) => {
            document.removeEventListener(event, callbackRef)
            delete eventToCallbackRef[event]
            delete eventCallbacksByEventName[event]
        })
    }

    function attach(el: HTMLElement|Document) {
        Object.entries(eventToCallbackRef).forEach(([event, callback]) => {
            el.addEventListener(event, callback, callback.capture)
        })
    }

    return {
        on,
        trigger,
        removeAll,
        attach,
        subDelegators
    }
}
