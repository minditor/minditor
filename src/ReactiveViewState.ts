import {atom, Atom} from 'axii'
import {idleThrottle, nextJob} from "./util";
import {DocNode} from "./DocumentContent.js";
import {CONTENT_RANGE_CHANGE, DocRange, DocumentContentView} from "./View";

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



function getRectIntersecting(rectA: Rect, rectB: Rect, offset: number) {
    const rect = {
        left : Math.max(rectA.left, rectB.left - offset),
        top:Math.max(rectA.top, rectB.top - offset),
        right: Math.min(rectA.right, rectB.right + offset),
        bottom: Math.min(rectA.bottom, rectB.bottom + offset),
        width: 0,
        height: 0,
    }

    if (rect.left <= rect.right && rect.top <= rect.bottom) {
        rect.width = rect.right - rect.left
        rect.height = rect.bottom - rect.top
        return rect
    } else {
        console.warn('no intersecting rect', rectA, rectB)
    }
}

// CAUTION 第三参数 offset 是用来修正有时候 intersectingRect 不准确的问题。非常重要
function getRangeRectsIntersecting(rects: Rect[], targetRect: Rect, offset = 30) {
    // CAUTION 这里为了简化计算，所以直接算出一个 combinedRect
    const head = rects[0]
    const tail = rects.at(-1)!

    const combinedRect = {
        top: head.top,
        left: Math.min(tail.left, head.left),
        right: Math.max(head.right, tail.right),
        bottom: tail.bottom,
    }


    return getRectIntersecting(combinedRect, targetRect, offset)
}


export class ReactiveViewState {
    public lastActiveDevice: Atom<'mouse'|'keyboard'|null> = atom(null)
    public mousePosition: Atom<{clientX: number, clientY: number}|null> = atom(null)
    public fixedMousePosition: {clientX: number, clientY: number}|null = null
    public selectionRange: Atom<DocRange|null> = atom(null)
    public rangeBeforeComposition: Atom<DocRange|null> = atom(null)
    public mouseEnteredBlockUnit: Atom<HTMLElement|null> = atom(null)
    public lastMouseEnteredBlockDocNode: Atom<DocNode|null> = atom(null)
    public visibleRangeRect: Atom<{top:number, left: number, height:number, width: number}|null> = atom(null)
    constructor(public view: DocumentContentView) {
        this.activateUserMousePosition()
        this.activateDocSelectionRange()
        this.activateLastActiveDevice()
        this.activateMouseEnteredBlockNode()
        this.activateVisibleRangeRect()
        this.activateRangeBeforeComposition()
    }
    activateVisibleRangeRect() {
        let updateRangeClientRectCallback: EventListenerOrEventListenerObject
        let stopListenSelectionChange: () => void
        const globalState = this.view.globalState

        this.view.listen('bindElement', (e: CustomEvent) => {
            const { element: docElement } = e.detail
            if (!window.IntersectionObserver) {
                console.warn('IntersectionObserver not supported')
                return
            }
            // doc 本身的显隐藏回调
            const observer = new IntersectionObserver(([docEntry]) => {
                const boundaryContainer = this.view.boundaryContainer!

                if (stopListenSelectionChange) stopListenSelectionChange()
                if (updateRangeClientRectCallback) boundaryContainer.removeEventListener('scroll', updateRangeClientRectCallback)

                // FIXME 保证一定要产生监听？不然会出现时有时没有的情况，改成这样了还是有 bug。还是出现了 rsecting @ ReactiveS
                if(!docEntry.isIntersecting) {
                    this.visibleRangeRect(null)
                } else {
                    stopListenSelectionChange = this.view.listen(CONTENT_RANGE_CHANGE, () => {
                        if (updateRangeClientRectCallback) boundaryContainer.removeEventListener('scroll', updateRangeClientRectCallback)

                        if (!globalState.selectionRange) {
                            return
                        }

                        const range = globalState.selectionRange!
                        if (range.collapsed) {
                            this.visibleRangeRect(null)
                            return
                        }

                        // 有 range 才监听 scroll
                        updateRangeClientRectCallback = idleThrottle( () => {
                            this.visibleRangeRect(getRangeRectsIntersecting(Array.from(range.getClientRects()), docEntry.intersectionRect))
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
    }
    activateLastActiveDevice() {
        this.view.listen('mousemove', () => {
            this.lastActiveDevice('mouse')
        })

        this.view.listen('inputChar', () => {
            this.lastActiveDevice('keyboard')
        })
    }
    activateUserMousePosition() {
        const debouncedUpdateMousePosition = idleThrottle((e: MouseEvent) => {
            const {clientX, clientY} = e
            this.mousePosition({clientX, clientY})
            this.fixedMousePosition = {clientX, clientY}
        }, 200)

        this.view.listen('mousemove', debouncedUpdateMousePosition)
    }
    activateDocSelectionRange() {
        this.view.globalState.onSelectionChange(() => {
            if (this.view.element && this.view.element.contains(this.view.globalState.selectionRange?.commonAncestorContainer!) ) {
                const range = this.view.globalState.selection!.rangeCount ? this.view.globalState.selection!.getRangeAt(0) : null
                const docRange = range ? this.view.createDocRange(range) : null
                this.selectionRange(docRange)
            }
        })
    }
    lastRangeBeforeComposition: Range|undefined = undefined
    activateRangeBeforeComposition() {
        this.view.globalState.onSelectionChange(() => {
            if (this.view.element && this.view.element.contains(this.view.globalState.rangeBeforeComposition?.commonAncestorContainer!) ) {

                const range = this.view.globalState.rangeBeforeComposition!

                if (isRangeEqual(this.lastRangeBeforeComposition, range)) {
                    // console.log('range not changed', range, range.startOffset, range.endOffset)
                    return
                }

                const docRange = this.view.createDocRange(range)
                // console.log('last range before composition', docRange.startText.props.value, docRange.startOffset, docRange.endText.props.value, docRange.endOffset)
                this.rangeBeforeComposition(docRange)
                this.lastRangeBeforeComposition = range.cloneRange()
            }
        })
    }
    activateMouseEnteredBlockNode() {
        // this.view.listen('block:mouseenter', (e: MouseEvent) => {
        //     // FIXME
        //     const docNode = this.view.blockUnitToDocNode.get(e.target as HTMLElement)
        //     assert(!!docNode, 'can not find docNode from element')
        //     this.lastMouseEnteredBlockDocNode(docNode)
        // })
    }

}

function isRangeEqual(rangeA?: Range, rangeB?: Range) {
    return rangeA && rangeB && rangeA.startContainer === rangeB.startContainer &&
        rangeA.startOffset === rangeB.startOffset &&
        rangeA.endContainer === rangeB.endContainer &&
        rangeA.endOffset === rangeB.endOffset
}


