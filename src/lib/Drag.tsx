import {Atom, RenderContext, atom} from "axii";


export type DragProps = {
    style?: { [k: string]: any}
    target?: HTMLElement|Document,
    delta: Atom<{x: number, y: number}>
}

export function Drag({ style, target=  document, delta =atom({x:0, y:0}) }: DragProps, { createElement }: RenderContext) {

    let baseX = 0
    let baseY = 0
    let startX = 0
    let startY = 0

    const onMouseMove = (e: Event) => {
        e.stopPropagation()
        e.preventDefault()
        const event = e as MouseEvent
        delta({x: event.clientX-startX + baseX, y: event.clientY-startY + baseY})
    }

    const onMouseDown= (e: MouseEvent) => {
        baseX = delta().x
        baseY = delta().y
        startX = e.clientX
        startY = e.clientY
        target.addEventListener('mousemove', onMouseMove)
        target.addEventListener('mouseup', () => {
            baseX = delta().x
            baseY = delta().y
            target.removeEventListener('mousemove', onMouseMove)
        }, { once: true })
    }

    return <div onmousedown={onMouseDown} style={style}></div>

}

