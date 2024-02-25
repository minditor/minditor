export type ExtendedDocument = {
    addEventListener(...args: Parameters<Document["addEventListener"]>): () => void
}

export type GlobalState = {
    readonly isMouseDown: boolean,
    readonly hasCursor: boolean,
    readonly selection: Selection|null,
    readonly selectionRange: Range| null,
    readonly rangeBeforeComposition:Range|null
    readonly document: ExtendedDocument
    readonly bodyViewPortSize: {width: number, height: number}
    onSelectionChange: (callback: SelectionChangeCallback) => () => void
}


export type SelectionChangeCallback = (e: Event) => any

export const state:GlobalState = (function() {
    let isMouseDown = false
    let hasCursor = false
    let currentSelection:Selection|null = window.getSelection()
    let rangeBeforeComposition:Range|null
    let selectionRange: Range|null
    let isComposing = false

    const callbacks = new Set<SelectionChangeCallback>()

    document.addEventListener('mousedown', () => {
        isMouseDown = true
    })

    document.addEventListener('mouseup', (e: MouseEvent) => {
        if (!e.buttons) isMouseDown = false
    })

    document.addEventListener('selectionchange', (e) => {
        currentSelection = window.getSelection()
        hasCursor = Boolean(currentSelection?.rangeCount)
        selectionRange = hasCursor ? currentSelection?.getRangeAt(0)! : null
        callbacks.forEach(callback => callback(e))
    })

    document.addEventListener('selectionchange', (e) => {
        if (!isComposing) {
            // CAUTION 特别注意这里要重新读 selection
            rangeBeforeComposition = window.getSelection()!.rangeCount > 0 ? window.getSelection()!.getRangeAt(0) : null
        }
    })



    document.addEventListener('keydown', (e) => {
        if (hasCursor) {
            // CAUTION keydown 发生在 compositionstart 之前，这个时候 selection 还没变，所以应该在这里记录 isComposing 才能保证正确
            if (e.isComposing || e.keyCode === 229) {
                isComposing = true
            }
        }
    })

    document.addEventListener('compositionend', () => {
        isComposing = false
    })

    return {
        get isMouseDown() {
            return isMouseDown
        },
        get hasCursor() {
            return hasCursor
        },
        get selection() {
            return currentSelection
        },
        get selectionRange() {
            return selectionRange
        },
        get rangeBeforeComposition() {
            return rangeBeforeComposition
        },
        get bodyViewPortSize() {

            return {
                width: document.body.offsetWidth,
                height: document.body.offsetHeight,
            }
        },
        onSelectionChange(callback: SelectionChangeCallback) {
            callbacks.add(callback)
            return () => {
                callbacks.delete(callback)
            }
        },
        get document() {
            return new Proxy(document, {
                get (target, p, receiver) {
                    if (p === 'addEventListener') {
                        return (...args: Parameters<Document["addEventListener"]>) => {
                            target.addEventListener(...args)
                            return () => {
                                target.removeEventListener(...args)
                            }
                        }
                    }
                    return Reflect.get(target, p, receiver)
                }
            }) as unknown as ExtendedDocument
        }

    }
})()

export type GlobalActions = {
    setSelection: (startContainer: Node, startOffset: number, endContainer?: Node, endOffset?: number) => void,
}

export const actions: GlobalActions = {
    setSelection(startContainer: Node, startOffset: number, endContainer: Node = startContainer, endOffset: number = startOffset) {
        const newRange = document.createRange()
        newRange.setStart(startContainer, startOffset)
        newRange.setEnd(endContainer, endOffset)
        state.selection!.removeAllRanges()
        state.selection!.addRange(newRange)
    }
}

