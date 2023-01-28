


export type EventDelegator = {
    on: (inputEvent: string, handle: Function, capture?: boolean) => () => any,
    removeAll: Function,
    trigger: (event:Event) => void,
    attach: (el: HTMLElement) => void
    detach: (el: HTMLElement) => void
    subDelegators: {[key: string]: EventDelegator}
}


type EventCallbackWithCapture = EventListenerOrEventListenerObject & {
    capture: boolean
}


const documentEvents = ['selectionchange']


export function createDelegator(namespace = 'global'): EventDelegator {
    const eventCallbacksByEventName: {[key: string] : Set<Function>} = {}
    const eventToCallbackRef: {[key: string] : EventCallbackWithCapture} = {}
    const attachedElements = new Set<HTMLElement>()


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


    function trigger(event: Event, element?: HTMLElement) {
        // CAUTION 手动  trigger 永远在  element 上
        if (element) {
            console.log("dispatch", event, element)
            element.dispatchEvent(event)
        } else {
            attachedElements.forEach(el => el.dispatchEvent(event))
        }

    }

    function on(inputEvent: string, handle: Function, capture = false) {
        const [namespace, eventName] = inputEvent.split(':')
        if (namespace && eventName) {
            if (!subDelegators[namespace]) {
                subDelegators[namespace] = createDelegator(namespace)
            }
            return subDelegators[namespace].on(eventName, handle, capture)
        }


        const event = inputEvent

        if(!eventCallbacksByEventName[event]) {
            eventCallbacksByEventName[event] = new Set()
            const callback = createCallback(eventCallbacksByEventName[event], capture)
            eventToCallbackRef[event] = callback
            // 已经 attach 过了，但是还没有监听该 event
            if (attachedElements.size) {
                attachedElements.forEach(attachedEl => attachedEl.addEventListener(event, callback, callback.capture))
            }
        }

        eventCallbacksByEventName[event].add(handle)

        return function off() {
            eventCallbacksByEventName[event].delete(handle)
        }
    }

    function removeAll() {
        attachedElements.forEach(attachedEl => {
            Object.entries(eventToCallbackRef).forEach(([event, callbackRef]) => {
                if (documentEvents.includes(event)) {
                    document.removeEventListener(event, callbackRef)
                } else {
                    attachedEl!.removeEventListener(event, callbackRef)
                }
                delete eventToCallbackRef[event]
                delete eventCallbacksByEventName[event]
            })
        })
    }

    function attach(element: HTMLElement) {

        if (attachedElements.has(element)) throw new Error('event delegator already attached to this element')

        attachedElements.add(element)


        Object.entries(eventToCallbackRef).forEach(([event, callback]) => {
            if (documentEvents.includes(event)) {
                // TODO 是不是要改造一下 event？改到 element 上？
                document.addEventListener(event, callback, callback.capture)
            } else {
                element.addEventListener(event, callback, callback.capture)
            }
        })

        trigger(new CustomEvent('attach', { detail: { element } }), element)

        return function detachElement() {
            detach(element)
        }
    }

    function detach(element: HTMLElement) {
        if( !attachedElements.has(element)) throw new Error('this element is not attached')

        Object.entries(eventToCallbackRef).forEach(([event, callbackRef]) => {
            if (documentEvents.includes(event)) {
                document.removeEventListener(event, callbackRef)
            } else {
                element!.removeEventListener(event, callbackRef)
            }
            delete eventToCallbackRef[event]
            delete eventCallbacksByEventName[event]
        })

        attachedElements.delete(element)
    }

    return {
        on,
        trigger,
        removeAll,
        attach,
        detach,
        subDelegators
    }
}
