

const eventCallbacksByEventName = {}

const eventToCallbackRef = {}

function createCallback(callbacksRef) {
    return (e) => {
        for(let callback of callbacksRef) {
            const returnValue = callback(e)
            if (returnValue === false) {
                break
            }
        }
    }
}


export function trigger(event) {
    document.dispatchEvent(event)
}

export function on(event, handle) {
    if(!eventCallbacksByEventName[event]) {
        eventCallbacksByEventName[event] = new Set()
        // TODO document 应该改成 rootElement ?
        eventToCallbackRef[event] = createCallback(eventCallbacksByEventName[event])
        document.addEventListener(event, eventToCallbackRef[event])
    }

    eventCallbacksByEventName[event].add(handle)
    return function off() {
        eventCallbacksByEventName[event].delete(handle)
    }
}

export function removeAll() {
    Object.entries(eventToCallbackRef).forEach(([event, callbackRef]) => {
        document.removeEventListener(event, callbackRef)
        delete eventToCallbackRef[event]
        delete eventCallbacksByEventName[event]
    })
}
