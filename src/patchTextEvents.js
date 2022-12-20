import {formatRange, splitTextAsBlock, updateRange} from "./editing";


function getCurrentRange() {
    const selection = window.getSelection()
    return selection.getRangeAt(0).cloneRange()
}


let keydownRange
function setKeydownRange(range) {
    keydownRange = range && range.cloneRange()
}

function getKeydownRange() {
    return keydownRange.cloneRange()
}

function clearKeydownRange() {
    keydownRange = undefined
}

let lastKeydownKey





function handleSelection(selection) {
    const range = selection.getRangeAt(0).cloneRange()
    let canUseDefault
    if (!range.collapsed) {
        canUseDefault = updateRange(range, '')
        if (!canUseDefault) {
            selection.collapse(range.startContainer, range.startOffset)
        }
    }
    return canUseDefault
}





export default function patchTextEvents(on, trigger) {
    // 一致按着会有很多次 keydown 事件

    on('keydown', (e) => {
        const selection = window.getSelection()
        if (!selection.rangeCount) return

        lastKeydownKey = e.key
        console.log('keydown', e, e.key, e.code)
        if (e.isComposing) return

        // 记录一下 range，后面 keyup 要用。
        setKeydownRange(selection.getRangeAt(0))

        //1.  单个字符，其他的 key 的名字都长于 1
        if(e.key.length === 1) {
            // // 自顶一个事件，怎么看待有 selection 的情况？是把 selection 一起传进去，还是拆成两个事件？
            handleSelection(selection)
            console.log("inserting", e.key)
            // CAUTION 不能在这里插入字符是因为这个时候并不知道是不是输入法的 keydown
            updateRange(selection.getRangeAt(0), e.key, true)

            trigger(new CustomEvent('userInput',  { detail: {data: e.key} }))
        } else  if (e.key === 'Enter') {
            // 回车
            console.log("enter", e)
            e.preventDefault()
            e.stopPropagation()
            splitTextAsBlock(selection.getRangeAt(0))
        } else  if (e.key === 'Backspace') {
            // TODO 退格
        }

        //2.  TODO 回车/退格/ 不需要响应的功能键

    })


    on('compositionstart', (e) => {
        // TODO 往前删除一个字符？因为是输入法的开始？好像输入法自身也是这样
        const range = getKeydownRange()
        range.collapse(true)
        range.setEnd(range.startContainer, range.startOffset + 1)
        updateRange(range, '', true)
        console.log('compositionstart', e)
    })

    on('compositionend', (e) => {
        console.log('compositionend', e)
        const range = getKeydownRange()
        range.collapse(true)
        updateRange(range, e.data, true)
    })


    // document.addEventListener('selectionchange', (e) => {
    //     const selection = window.getSelection()
    //     if (selection.rangeCount && !selection.isCollapsed) {
    //         formatRange(selection.getRangeAt(0), { bold: true})
    //     }
    // })
}


