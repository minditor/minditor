import {atom, Atom, atomComputed, destroyComputed} from 'axii'
import {idleThrottle, nextJob} from "./util";
import {Block, DocNode} from "./DocumentContent.js";
import {CONTENT_RANGE_CHANGE, DocumentContentView} from "./View";
import {DocRange} from "./Range.js";

type Position = {
    top: number,
    left: number,
    right?: number,
    bottom?: number
}

type DeviceInfo = {
    type: 'mouse'|'keyboard',
    key: string,
    top: number,
    left: number
}

export class ReactiveViewState {
    public lastActiveDeviceType: Atom<'mouse'|'keyboard'|null> = atom(null)
    public lastMouseUpPositionAfterRangeChange: Atom<Position|null> = atom(null)
    public mousePosition: Atom<{clientX: number, clientY: number}|null> = atom(null)
    public selectionRange: Atom<DocRange|null> = atom(null)
    public hasRange!: Atom<boolean>
    public rangeBeforeComposition: Atom<DocRange|null> = atom(null)
    public lastMouseEnteredBlock: Atom<Block|null> = atom(null)
    public visibleRangeRect!: Atom<{top:number, left: number, height:number, width: number}|null>
    public visibleCursorRect!: Atom<{top:number, left: number, height:number, width: number}|null>
    public destroyHandles: Set<(() => any)|void>
    constructor(public view: DocumentContentView) {
        this.destroyHandles = new Set()
        this.destroyHandles.add(this.activateUserMousePosition())
        this.destroyHandles.add(this.activateDocSelectionRange())
        this.destroyHandles.add(this.activateLastActiveDevice())
        this.destroyHandles.add(this.activateMouseEnteredBlockNode())
        this.destroyHandles.add(this.activateVisibleRangeRect())
        this.destroyHandles.add(this.activateRangeBeforeComposition())
        this.destroyHandles.add(this.activateHasRange())
        this.destroyHandles.add(this.activateLastMouseUpPositionAfterRangeChange())
    }
    activateVisibleRangeRect() {
        const lastScrollEvent = atom<Event>(null)
        // 这里的 this.view.globalState.document.addEventListener 是改造过的。
        const removeScrollListener = this.view.globalState.document.addEventListener('scroll', (event) => {
            lastScrollEvent(event)
        })

        // TODO 处理是否可见的问题？
        this.visibleRangeRect = atomComputed(() => {
            if (!this.selectionRange()) return null
            // CAUTION 读一下，这样每次 scrollEvent 都会触发重新计算 range.getBoundingClientRect()
            lastScrollEvent()

            const range = this.view.globalState.selectionRange!
            return range?.getBoundingClientRect()
        })

        return () => {
            removeScrollListener()
            destroyComputed(this.visibleRangeRect)
        }
    }
    activateLastActiveDevice() {
        const removeMoveListener = this.view.listen('mousemove', idleThrottle((e: MouseEvent) => {
            this.lastActiveDeviceType('mouse')
        }))

        const removeInputListener = this.view.listen('inputChar', (e: KeyboardEvent) => {
            this.lastActiveDeviceType('keyboard')
        })

        return () => {
            removeMoveListener()
            removeInputListener()
        }
    }
    activateLastMouseUpPositionAfterRangeChange() {
        const removeMouseUpListener =  this.view.listen('mouseup', (e: MouseEvent) => {
            if (this.selectionRange() && !this.selectionRange()?.isCollapsed) {
                this.lastMouseUpPositionAfterRangeChange({left: e.clientX, top: e.clientY})
            }
        })

        const removeRangeChangeListener = this.view.globalState.onSelectionChange(() => {
            this.lastMouseUpPositionAfterRangeChange(null)
        })

        return () => {
            removeMouseUpListener()
            removeRangeChangeListener()
        }
    }

    activateUserMousePosition() {
        const debouncedUpdateMousePosition = idleThrottle((e: MouseEvent) => {
            const {clientX, clientY} = e
            this.mousePosition({clientX, clientY})
        }, 200)

        return this.view.listen('mousemove', debouncedUpdateMousePosition)
    }
    activateDocSelectionRange() {
        return this.view.globalState.onSelectionChange(() => {
            if (this.view.element && this.view.element.contains(this.view.globalState.selectionRange?.commonAncestorContainer!) ) {
                const range = this.view.globalState.selection!.rangeCount ? this.view.globalState.selection!.getRangeAt(0) : null
                const docRange = range ? this.view.createDocRange(range) : null
                this.selectionRange(docRange)
            }
        })
    }
    activateHasRange() {
        this.hasRange = atomComputed(() => {
            return Boolean(this.selectionRange() && !this.selectionRange()?.isCollapsed)
        })

        return () => {
            destroyComputed(this.hasRange)
        }
    }
    lastRangeBeforeComposition: Range|undefined = undefined
    activateRangeBeforeComposition() {
        return this.view.globalState.onSelectionChange(() => {
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
        return this.view.listen('block:mouseenter', (e: CustomEvent) => {
            this.lastMouseEnteredBlock(this.view.elementToDocNode.get(e.target as HTMLElement) as Block)
        })
    }

}

function isRangeEqual(rangeA?: Range, rangeB?: Range) {
    return rangeA && rangeB && rangeA.startContainer === rangeB.startContainer &&
        rangeA.startOffset === rangeB.startOffset &&
        rangeA.endContainer === rangeB.endContainer &&
        rangeA.endOffset === rangeB.endOffset
}


