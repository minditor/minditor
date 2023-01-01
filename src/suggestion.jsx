/**@jsx createElement*/
import { createElement, useState, useEffect, StrictMode, cloneElement, forwardRef, useImperativeHandle, createRef, useRef} from "react";
import ReactDOM from 'react-dom/client'
import { autorun, isRef } from "@ariesate/reactivity";


function Container({ attachRef, Component, ...props }) {
    const compRef = useRef()
    useEffect(() => {
        attachRef(compRef)
        return () => {
            console.warn('container should never update')
        }
    })

    const ComponentWithRef = useActivateHandle(Component)


    return <ComponentWithRef {...props} ref={compRef}/>
}


function useActivateHandle(Component) {
    return forwardRef(function WithHandle(props, ref) {
        const [activated, setActivated] = useState(false)
        useImperativeHandle(ref, () => ({
            activate(...argv) {
                console.log(333, argv)
                setActivated(argv)
            }
        }))

        return <Component activated={activated} {...props}/>
    })
}

function useReactiveValue(reactiveValue, defaultValue) {
    const [value, setValue] = useState(defaultValue)
    // CAUTION 对对象和数组只做到了浅层监听。
    useEffect(() => {
        return autorun(() => {
            if (isRef(reactiveValue)) {
                setValue(reactiveValue.value)
            } else if(Array.isArray(reactiveValue)){
                setValue([...reactiveValue])
            } else {
                setValue({...reactiveValue})
            }
        })
    })

    return value
}

function Suggestion({ deactivate, activated, activateAllReactive, deactivateAllReactive, boundingRect, inputValue }) {
    // TODO 是两个 atom 作为指针，指向真正收到的 reactive 对象。
    const rect = useReactiveValue(boundingRect, {})
    const value = useReactiveValue(inputValue, '')

    console.log(111, rect)

    useEffect(() => {
        console.log(2222, activated)
        if (activated) {
            activateAllReactive()
            return deactivateAllReactive()
        }
    }, [activated])

    return <div style={{position: 'fixed', top: rect.bottom, left: rect.left, background:'#eee'}}>
        <div onClick={deactivate}>x</div>
        <div>{value}</div>
        <div>{JSON.stringify(rect)}</div>
    </div>
}


export function registerCommands() {

    const insertSuggestion = {
        onInput: '/',
        createInstance({ container, ...props }) {
            // 可以在 pluginContainer 上创建实例
            let ref
            const attachRef = (componentRef) => {
                console.log("attach ref")
                ref = componentRef
            }

            ReactDOM.createRoot(container).render(<Container Component={Suggestion} attachRef={attachRef} {...props}/>)

            return new Proxy({}, {
                get(target, key) {
                    return ref.current[key]
                }
            })
        }
    }

    return [insertSuggestion]
}
