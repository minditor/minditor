// @ts-ignore
import { atom, Atom } from 'rata'
import {debounce, idleThrottle, nextJob} from "./util";
// import {createRangeLikeFromRange, findNodeFromElement} from "./editing";
import { DocNode } from "./DocNode";
import { state as globalState } from './globals'
import {DocumentContentView} from "./View";

type Rect = {
    top: number,
    left: number,
    right: number,
    bottom: number
}





// CAUTION 默认range 头和尾一定是在同一个 scroll container 中，不存在 头有 scroll，尾却没有的情况


function buildThresholdList(numSteps = 100) {
    let thresholds: number[] = [];

    for (let i=1.0; i<=numSteps; i++) {
        let ratio = i/numSteps;
        thresholds.push(ratio);
    }

    thresholds.push(0);
    return thresholds;
}

function isPathHasScroll(start: HTMLElement, ancestor: HTMLElement) {
    let pointer: HTMLElement|null = start
    let result = false
    while(pointer && pointer !== ancestor) {
        if (pointer.scrollHeight > pointer.clientHeight || pointer.scrollWidth > pointer.clientWidth) {
            result = true
            break
        } else {
            pointer = pointer.parentElement
        }
    }
    return result
}

function findClosestElement(target: Element|Node) : HTMLElement {
    return (target instanceof HTMLElement ? target : target.parentElement)  as HTMLElement
}



function getRectIntersecting(rectA: Rect, rectB: Rect) {
    const rect = {
        left : Math.max(rectA.left, rectB.left),
        top:Math.max(rectA.top, rectB.top),
        right: Math.min(rectA.right, rectB.right),
        bottom: Math.min(rectA.bottom, rectB.bottom),
        width: 0,
        height: 0,
    }

    if (rect.left <= rect.right && rect.top <= rect.bottom) {
        rect.width = rect.right - rect.left
        rect.height = rect.bottom - rect.top
        return rect
    } else {
        console.warn('no intersecting rect')
    }
}


function getRangeRectsIntersecting(rects: Rect[], targetRect: Rect) {
    // CAUTION 这里为了简化计算，所以直接算出一个 combinedRect
    const head = rects[0]
    const tail = rects.at(-1)!

    const combinedRect = {
        top: head.top,
        left: Math.min(tail.left, head.left),
        right: Math.max(head.right, tail.right),
        bottom: tail.bottom,
    }


    return getRectIntersecting(combinedRect, targetRect)
}


export class ReactiveState {
    public lastActiveDevice: Atom<'mouse'|'keyboard'|null>
    public mousePosition: Atom<{clientX: number, clientY: number}|null>
    public fixedMousePosition: {clientX: number, clientY: number}|null = null
    public selectionRange: Atom<Range|null>
    public mouseEnteredBlock: Atom<DocNode>
    public visibleRangeRect: Atom<{top:number, left: number, height:number, width: number}|null>
    constructor(public view: DocumentContentView) {
        this.mousePosition = this.createUserMousePosition()
        this.selectionRange = this.createDocSelectionRange()
        this.lastActiveDevice = this.createLastActiveDevice()
        this.mouseEnteredBlock = this.createMouseEnteredBlockNode()
        this.visibleRangeRect = this.createVisibleRangeRect()
    }
    createVisibleRangeRect() {
        const rangeClientRect = atom(undefined)
        let updateRangeClientRectCallback: EventListenerOrEventListenerObject
        let stopListenSelectionChange: () => void

        this.view.listen('bindElement', (e: CustomEvent) => {
            const { element: docElement } = e.detail
            // doc 本身的显隐藏回调
            const observer = new IntersectionObserver(([docEntry]) => {
                const boundaryContainer = this.view.boundaryContainer!

                if (stopListenSelectionChange) stopListenSelectionChange()
                if (updateRangeClientRectCallback) boundaryContainer.removeEventListener('scroll', updateRangeClientRectCallback)

                if(!docEntry.isIntersecting) {
                    rangeClientRect(null)
                } else {
                    stopListenSelectionChange = this.view.listen('selectionchange', () => {
                        if (updateRangeClientRectCallback) boundaryContainer.removeEventListener('scroll', updateRangeClientRectCallback)

                        if (!globalState.selectionRange) {
                            return
                        }

                        const range = globalState.selectionRange!
                        if (range.collapsed) {
                            rangeClientRect(null)
                            return
                        }

                        // 有 range 才监听 scroll
                        updateRangeClientRectCallback = idleThrottle(function () {
                            rangeClientRect(getRangeRectsIntersecting(Array.from(range.getClientRects()), docEntry.intersectionRect))
                        }, 100)

                        // 存在 scroll 要就监听 scroll
                        if (isPathHasScroll(findClosestElement(range.startContainer), boundaryContainer)) {
                            boundaryContainer.addEventListener('scroll', updateRangeClientRectCallback, true)
                        }

                        // 立刻更新一下。一定要 nextJob，不然当前无限循环了
                        nextJob(updateRangeClientRectCallback)
                    })
                }
            }, {
                root: null,
                rootMargin: "0px",
                threshold: buildThresholdList()
            } as IntersectionObserverInit);

            observer.observe(docElement)

            return () => {
                observer.disconnect()
            }
        })
        return rangeClientRect
    }
    createLastActiveDevice() {
        const lastActiveDevice = atom(null)
        this.view.listen('mousemove', () => {
            lastActiveDevice('mouse')
        })

        this.view.listen('inputChar', () => {
            lastActiveDevice('keyboard')
        })

        return lastActiveDevice
    }
    createUserMousePosition() {
        const userMousePosition = atom(null)
        const debouncedUpdateMousePosition = idleThrottle((e: MouseEvent) => {
            const {clientX, clientY} = e
            userMousePosition({clientX, clientY})
            this.fixedMousePosition = {clientX, clientY}
        }, 200)

        this.view.listen('mousemove', debouncedUpdateMousePosition)
        return userMousePosition
    }
    createDocSelectionRange() {
        const docSelectionRange = atom(null)
        // FIXME 这里到底是谁负责从 globalKM 里面读？
        this.view.listen('selectionchange', () => {
            // CAUTION 这里默认了 globalState 里的注册的 selectionchange 一定先发生，所以这里才能直接读
            const range = globalState.selection!.rangeCount ? globalState.selection!.getRangeAt(0) : null
            // 用户可以通过监听事件的方式来处理自己的逻辑
            const inputEvent = new CustomEvent('docSelectionChange',  { detail: {data: range}})
            this.view.element!.dispatchEvent(inputEvent)

            // 也可以直接使用我们的 useSelectionRange reactive 来构建逻辑
            docSelectionRange(range ? this.view.createDocRange(range) : null)
        })

        return docSelectionRange
    }
    createMouseEnteredBlockNode() {
        const visualFocusedBlockNode = atom(null)
        const debouncedUpdateNode = debounce((node: DocNode) => {
            visualFocusedBlockNode(node)
        }, 100)

        // TODO 有没有性能问题？mouseenter capture 会一路
        this.view.listen('block:mouseenter', (e: MouseEvent) => {
            // const node = this.view.findNodeFromElement(e.target as HTMLElement)
            // if (node?.constructor.display === 'block') {
            //     debouncedUpdateNode(node)
            // }
        })

        return visualFocusedBlockNode
    }

}

