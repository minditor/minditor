

const eventCallbackByEventName = {}

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
    if(!eventCallbackByEventName[event]) {
        eventCallbackByEventName[event] = new Set()
        // TODO document 应该改成 rootElement ?
        document.addEventListener(event, createCallback(eventCallbackByEventName[event]))
    }

    eventCallbackByEventName[event].add(handle)
    return function off() {
        eventCallbackByEventName[event].delete(handle)
    }
}
