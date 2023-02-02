// @ts-ignore
import { shallowRef } from '@ariesate/reactivity'
import {debounce, idleThrottle, nextJob} from "./util";
import {createRangeLikeFromRange, findNodeFromElement} from "./editing";
import {EventDelegator} from "./event";
import {NodeType} from "./NodeType";
import { state as globalState } from './globals'

type Rect = {
    top: number,
    left: number,
    right: number,
    bottom: number
}

function createUserMousePosition({ on }: EventDelegator) {
    const userMousePosition = shallowRef(null)
    const debouncedUpdateMousePosition = idleThrottle((e: MouseEvent) => {
        const {clientX, clientY} = e
        userMousePosition.value = {
            clientX, clientY
        }
    }, 200)

    on('mousemove', debouncedUpdateMousePosition)
    return userMousePosition
}

function createVisualFocusedBlockNode({ on }: EventDelegator) {

    const visualFocusedBlockNode = shallowRef(null)
    const debouncedUpdateNode = debounce((node: NodeType) => {
        visualFocusedBlockNode.value = node
    }, 100)

    // TODO 有没有性能问题？mouseenter capture 会一路
    on('block:mouseenter', (e: MouseEvent) => {
        const node = findNodeFromElement(e.target as HTMLElement)
        if (node?.constructor.display === 'block') {
            debouncedUpdateNode(node)
        }
    }, true)

    return visualFocusedBlockNode
}


function createUserSelectionRange({on, trigger}: EventDelegator) {
    const userSelectionRange = shallowRef(null)
    on('selectionchange', () => {
        // CAUTION 这里默认了 globalState 里的注册的 selectionchange 一定先发生，所以这里才能直接读
        const range = globalState.selection!.rangeCount ? globalState.selection!.getRangeAt(0) : null
        // 用户可以通过监听事件的方式来处理自己的逻辑
        const inputEvent = new CustomEvent('userSelectionChange',  { detail: {data: range}})
        trigger(inputEvent)

        // 也可以直接使用我们的 useSelectionRange reactive 来构建逻辑
        userSelectionRange.value = range ? createRangeLikeFromRange(range) : null
    })

    return userSelectionRange
}


// CAUTION 默认range 头和尾一定是在同一个 scroll container 中，不存在 头有 scroll，尾却没有的情况
export function createVisibleRangeRectRef({on} : EventDelegator, boundaryContainer: HTMLElement) {
    const rangeClientRect = shallowRef(undefined)
    let updateRangeClientRectCallback: EventListenerOrEventListenerObject
    let stopListenSelectionChange: () => void
    on('attach', (e: CustomEvent) => {
        const { element: docElement } = e.detail
        // doc 本身的显隐藏回调
        const observer = new IntersectionObserver(([docEntry]) => {
            if (stopListenSelectionChange) stopListenSelectionChange()
            if (updateRangeClientRectCallback) boundaryContainer.removeEventListener('scroll', updateRangeClientRectCallback)

            if(!docEntry.isIntersecting) {
                rangeClientRect.value = undefined
            } else {
                stopListenSelectionChange = on('selectionchange', () => {
                    if (updateRangeClientRectCallback) boundaryContainer.removeEventListener('scroll', updateRangeClientRectCallback)

                    if (globalState.selection!.rangeCount === 0) return
                    const range = globalState.selectionRange!
                    if (range.collapsed) return

                    // 有 range 才监听 scroll
                    updateRangeClientRectCallback = idleThrottle(function () {
                        rangeClientRect.value = getRangeRectsIntersecting(Array.from(range.getClientRects()), docEntry.intersectionRect)
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
        });

        observer.observe(docElement)

        return () => {
            observer.disconnect()
        }
    })


    return rangeClientRect
}

function buildThresholdList(numSteps = 100) {
    let thresholds = [];

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
        bottom: Math.min(rectA.bottom, rectB.bottom)
    }

    if (rect.left <= rect.right && rect.top <= rect.bottom) {
        return rect
    }
}


function getRangeRectsIntersecting(rects: Rect[], targetRect: Rect) {
    // CAUTION 这里为了简化计算，所以直接算出一个 combinedRect
    const head = rects[0]
    const tail = rects[rects.length -1]
    const combinedRect = {
        top: head.top,
        left: tail.left,
        right: head.right,
        bottom: tail.bottom,
    }


    return getRectIntersecting(combinedRect, targetRect)
}


export function createDocReactiveState(eventDelegator: EventDelegator, boundaryContainer: HTMLElement) {
    const userMousePosition = createUserMousePosition(eventDelegator)
    const visibleRangeRect = createVisibleRangeRectRef(eventDelegator, boundaryContainer)
    const userSelectionRange = createUserSelectionRange(eventDelegator)
    const visualFocusedBlockNode = createVisualFocusedBlockNode(eventDelegator)

    // TODO 什么时候 destroy all ？
    return { userSelectionRange, visualFocusedBlockNode, userMousePosition, visibleRangeRect }
}