import {LinkedList, computed, TrackOpTypes, TriggerOpTypes } from "rata";
import { createHost, createElement } from 'axii'
import {Component, Props} from "../global";
import {ViewNode} from "./Document";


type ComponentMap = {
    [k: string]: Component
}


function heading({ level, children }: Props) {
    return () => {
        const Tag = `h${level()}`
        return <Tag>{children}</Tag>
    }
}

function paragraph({children}: Props) {
    return <p>{children}</p>
}

function text({ children, ...rest }: Props) {
    return <span {...rest}>{children}</span>
}


function renderViewNode(viewNode: ViewNode|ViewNode[], components: ComponentMap = {heading, paragraph, text}) : JSX.Element|JSX.Element[]{
    // @ts-ignore
    if (Array.isArray(viewNode)) return viewNode.map(c => renderViewNode(c, components))
    const createDOM = components[viewNode.type as string]
    // 说明是个不需要转化的节点，例如 atom
    // @ts-ignore
    if (!createDOM) return viewNode
    const children = Array.isArray(viewNode.children) ? viewNode.children.map((child: ViewNode) => renderViewNode(child, components)) : renderViewNode(viewNode.children, components)
    // @ts-ignore
    return createDOM({...viewNode.props, children })
}


export function renderList(list: LinkedList<ViewNode>, container: HTMLElement, components: ComponentMap = {heading, paragraph, text}) {
    const context = {}

    computed((trackOnce) => {
        trackOnce!(list!, TrackOpTypes.METHOD, TriggerOpTypes.METHOD);

        for(let leaf of list) {
            const placeholder = new Comment('placeholder')
            container.appendChild(placeholder)

            const renderResult = renderViewNode(leaf.item, components)
            // const renderResult = <p>{[[<span>1</span>, <span>1</span>, <span>1</span>]]}</p>
            // debugger
            const host= createHost(renderResult, placeholder, context)

            host.render()
        }
    }, (result, triggerInfos) => {
        triggerInfos.forEach(({method, argv, result}) => {
            if (method === 'insertBefore'){
                // TODO 找到新增节点的 refNode， 并插入
            }else if(method === 'removeBetween'){
                // TODO 找到要删除的节点并且判断是不是 useDefaultBehavior
            }
        })
    })

}


