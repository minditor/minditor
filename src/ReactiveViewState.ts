import {atom, Atom, atomComputed, destroyComputed} from 'axii'
import {idleThrottle, nextTask} from "./util";
import {Block, DocNode, DocumentContent} from "./DocumentContent.js";
import {DocumentContentView} from "./View";
import {DocRange} from "./Range.js";

type Position = {
    top: number,
    left: number,
    right?: number,
    bottom?: number
}


export class ReactiveViewState {
    public lastActiveDeviceType: Atom<'mouse'|'keyboard'|null> = atom(null)
    public lastMouseUpPositionAfterRangeChange: Atom<Position|null> = atom(null)
    public mousePosition: Atom<{clientX: number, clientY: number}|null> = atom(null)
    public selectionRange: Atom<DocRange|null> = atom(null)
    public hasRange!: Atom<boolean>
    public rangeBeforeComposition: Atom<DocRange|null> = atom(null)
    public lastMouseEnteredActiveBlock: Atom<Block|null> = atom(null)
    public visibleRangeRect!: Atom<{top:number, left: number, height:number, width: number}|null>
    public bodyViewPortSize: Atom<{width: number, height: number}> = atom({width: 0, height: 0})
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
        this.destroyHandles.add(this.activateBodyViewPortSize())
    }
    activateBodyViewPortSize() {
        this.bodyViewPortSize(this.view.globalState.bodyViewPortSize)
        return this.view.globalState.document.addEventListener('resize',(size) => {
            this.bodyViewPortSize(this.view.globalState.bodyViewPortSize)
        })
    }
    activateVisibleRangeRect() {
        const lastScrollEvent = atom<Event>(null)
        // CAUTION this.view.globalState.document.addEventListener is different from document.addEventListener, it returns a function to remove listener
        const removeScrollListener = this.view.globalState.document.addEventListener('scroll', (event) => {
            lastScrollEvent(event)
        })

        // TODO use IntersectionObserver to detect visible range?
        this.visibleRangeRect = atomComputed(() => {
            if (!this.selectionRange()) return null
            // CAUTION call lastScrollEvent here, so every time scroll event fired will trigger range.getBoundingClientRect recompute
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
            const { clientX, clientY } = e
            // CAUTION we use nextTask here is because selection change event is fired after mouseup event where shift key is used.
            nextTask(() => {
                if (this.selectionRange() && !this.selectionRange()?.isCollapsed) {
                    this.lastMouseUpPositionAfterRangeChange({left: clientX, top: clientY})
                }
            })
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
                    return
                }

                const docRange = this.view.createDocRange(range)
                this.rangeBeforeComposition(docRange)
                this.lastRangeBeforeComposition = range.cloneRange()
            }
        })
    }
    activateMouseEnteredBlockNode() {
        const deleteBetweenListener = ({args}: {args:any}) => {
            const [start, end, parent] = args as [DocNode, DocNode, DocNode|DocumentContent]
            if (parent instanceof DocumentContent)  {

                let startBlock: DocNode|null = start
                while(startBlock && startBlock!== end) {
                    if (startBlock === this.lastMouseEnteredActiveBlock()) {
                        this.lastMouseEnteredActiveBlock(null)
                        break
                    }
                    startBlock = startBlock.next
                }
            }
        }

        this.view.content.addListener('deleteBetween', deleteBetweenListener)

        const removeViewMouseEnterListener =  this.view.listen('block:mouseenter', (e: CustomEvent) => {
            this.lastMouseEnteredActiveBlock(this.view.elementToDocNode.get(e.target as HTMLElement) as Block)
        })

        return () => {
            this.view.content.removeListener('deleteBetween', deleteBetweenListener)
            removeViewMouseEnterListener()
        }
    }

}

function isRangeEqual(rangeA?: Range, rangeB?: Range) {
    return rangeA && rangeB && rangeA.startContainer === rangeB.startContainer &&
        rangeA.startOffset === rangeB.startOffset &&
        rangeA.endContainer === rangeB.endContainer &&
        rangeA.endOffset === rangeB.endOffset
}


