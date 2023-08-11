export type GlobalState = {
    readonly isMouseDown: boolean,
    readonly hasCursor: boolean,
    readonly selection: Selection|null,
    readonly selectionRange: Range| null,
    readonly rangeBeforeComposition:Range|null
    onSelectionChange: (callback: SelectionChangeCallback) => void
}

export type SelectionChangeCallback = (e: Event) => any

export const state:GlobalState = (function() {
    let isMouseDown = false
    let hasCursor = false
    let currentSelection:Selection|null = window.getSelection()
    let rangeBeforeComposition:Range|null
    let selectionRange: Range|null

    const callbacks = new Set<SelectionChangeCallback>()
        document.addEventListener('mousedown', () => {
        isMouseDown = true
    })

    document.addEventListener('mouseup', (e: MouseEvent) => {
        if (!e.buttons) isMouseDown = false
    })

    document.addEventListener('selectionchange', (e) => {
        // TODO 必须 selection 是在 doc 中并且合法才行。
        currentSelection = window.getSelection()
        hasCursor = Boolean(currentSelection?.rangeCount)
        selectionRange = hasCursor ? currentSelection?.getRangeAt(0)! : null

        callbacks.forEach(callback => callback(e))
    })

    document.addEventListener('keydown', (e) => {
        if (hasCursor) {
            // TODO selection change 发生在 keydown 之前吗？？？
            if (e.isComposing || e.keyCode === 229) {
                return
            }
            rangeBeforeComposition = currentSelection!.getRangeAt(0)
        }
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
        onSelectionChange(callback: SelectionChangeCallback) {
            callbacks.add(callback)
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

