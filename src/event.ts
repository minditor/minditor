

const eventCallbacksByEventName: {[key: string] : Set<Function>} = {}

const eventToCallbackRef: {[key: string] : Function} = {}



function createCallback(callbacksRef: Set<Function>) {
    return (e: any) => {
        for(let callback of callbacksRef) {
            const returnValue = callback(e)
            if (returnValue === false) {
                break
            }
        }
    }
}


export function trigger(event: Event) {
    document.dispatchEvent(event)
}



export function on(event: string, handle: Function) {
    if(!eventCallbacksByEventName[event]) {
        eventCallbacksByEventName[event] = new Set()
        // TODO document 应该改成 rootElement ?
        eventToCallbackRef[event] = createCallback(eventCallbacksByEventName[event])
        document.addEventListener(event, eventToCallbackRef[event] as EventListenerOrEventListenerObject)
    }

    eventCallbacksByEventName[event].add(handle)
    return function off() {
        eventCallbacksByEventName[event].delete(handle)
    }
}

export function removeAll() {
    Object.entries(eventToCallbackRef).forEach(([event, callbackRef]) => {
        document.removeEventListener(event, callbackRef as EventListenerOrEventListenerObject)
        delete eventToCallbackRef[event]
        delete eventCallbacksByEventName[event]
    })
}
