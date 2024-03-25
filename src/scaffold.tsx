import {createElement, createRoot, Fragment, JSXElement} from "axii";
import {Document, DocumentData} from "./Document.js";
import {DocNode} from "./DocumentContent.js";
import {Plugin} from "./Plugin.js";
import {GlobalState} from "./globals.js";
import {DebugApp} from "./DebugApp.js";

type StyleObject = {
    [k: string]: any
}
export type ScaffoldConfig = {
    debug?: boolean,
    pluginContainer?: HTMLElement,
    autoHeight?: boolean,
    styles?: {
        container?: StyleObject,
        containerLeft?: StyleObject,
        containerMiddle?: StyleObject,
        containerRight?: StyleObject,
        docLeft?: StyleObject,
        docMiddle?: StyleObject,
        docRight?: StyleObject,
        docHeader?: StyleObject,
        docContent?: StyleObject,
        docFooter?: StyleObject,
        pluginContainer?: StyleObject
    }
}

export type DocConfig = {
    data: DocumentData,
    types: {[k: string]: typeof DocNode},
    plugins: (typeof Plugin)[]
    globalState?: GlobalState
}


export type ScaffoldHandle = {
    pluginContainer: HTMLElement,
    container: HTMLElement,
    appRoot: ReturnType<typeof createRoot>,
    doc: Document,
    destroy: () => void,
    render: () => void
}

export function scaffold(container: HTMLElement, docConfig: DocConfig, config?: ScaffoldConfig): ScaffoldHandle {
    // CAUTION we use flex to layout the app, so when container has a fixed height, the app will be fixed height.
    //  when container has no fixed height, the app will auto grow as its contents grow.
    container.style.display = 'flex'
    container.style.alignItems = 'stretch'
    container.style.justifyContent = 'center'


    let containerLeft
    let containerMiddle
    let containerRight
    let docLeft
    let docMiddle!: JSXElement
    let docRight
    let docHeader
    let docContent
    let docFooter
    let pluginContainer


    const containerChildren = (<>
        { containerLeft = <div style={{overflow:'auto', ...(config?.styles?.containerLeft||{})}}></div> }
        { containerMiddle = (<div style={{flexGrow:1, display:'flex', alignItems:'flex-start', overflow:'auto',...(config?.styles?.containerMiddle||{}) }}>
            { docLeft = <div style={(config?.styles?.docLeft||{})}></div> }
            { pluginContainer = <div style={{position:'relative', width:0, overflow:'visible', ...(config?.styles?.pluginContainer||{})}}></div> as HTMLElement}
            { docMiddle = (<div style={{flexGrow:1, maxWidth:'100%', ...(config?.styles?.docMiddle||{})}}>
                { docHeader = <div style={config?.styles?.docHeader||{}}></div>}
                { docContent = <div data-testid="docContent" style={config?.styles?.docContent||{}}></div>}
                { docFooter = <div style={config?.styles?.docFooter||{}}></div> }
                </div>)
            }
            { docRight = <div style={config?.styles?.docRight||{}}></div> }
            </div>)
        }
        {<div style={{overflow:'auto'}}></div>}
    </>) as HTMLElement


    const doc = new Document(docContent as HTMLElement, docConfig.data, docConfig.types, docConfig.globalState)

    const appElement = config?.debug ? (
        <div style={{flexGrow: 1, display: "flex", minHeight: 0}}>
            <div style={{flexGrow: 1, display: "flex", flexDirection: 'column', maxWidth: 300}}>
                {containerChildren}
            </div>
            <div style={{flexGrow: 2, overflow: 'auto'}}>
                <DebugApp doc={doc}/>
            </div>
        </div>
    ) : containerChildren

    const appRoot = createRoot(container)

    let pluginInstances: Plugin[] = []

    return {
        container,
        pluginContainer,
        appRoot,
        doc,
        destroy:() => {
            pluginInstances.forEach(plugin => plugin.destroy())
            doc.destroy()
            appRoot.destroy()
        },
        render() {
            // user may render loading inside container before rendering the doc.
            container.innerHTML = ''
            // 1. axii app 先render，确保节点在 dom 上
            appRoot.render(appElement)

            // 2. plugins initialize
            pluginInstances = docConfig.plugins.map(Plugin => {
                return new Plugin(doc)
            })
            // 3. doc render
            doc.render()
            doc.view.scrollContainer = docMiddle as HTMLElement

            //4. plugins render
            pluginInstances.forEach(plugin => {
                const PluginType = plugin.constructor as typeof Plugin
                // 如果 scroll 在整个的外面，那么 renderPluginView 就不用判断 Position 了。
                plugin.renderPluginView(!config?.autoHeight && PluginType.position === 'outOfScroll')
                if (config?.pluginContainer) {
                    config.pluginContainer.appendChild(plugin.root?.element!)
                } else {
                    if (PluginType.position === 'outOfScroll') {
                        containerLeft!.appendChild(plugin.root?.element!)
                    } else {
                        pluginContainer!.appendChild(plugin.root?.element!)
                    }
                }
            })
        }
    }

}
