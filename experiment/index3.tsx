/**@jsx createElement*/
import { createElement, createRoot, atom, Atom } from 'axii'

/**
 * 浏览器行为测试文件：
 * 已经有事件绑定的元素被 append 到 fragment 后，再 append 到 dom 上，应该会失效。
 */
const root= document.getElementById('root')!

const range = atom<Range>(null)


document.addEventListener('selectionchange', () => {
    range(document.getSelection()!.getRangeAt(0))
})


function setCursorOffset0(id: string) {
    const el = document.getElementById(id)!
    const range = new Range()
    range.setStart(el, 0)
    range.setEnd(el, 0)
    const selection = document.getSelection()!
    selection.removeAllRanges()
    selection.addRange(range)
}

function setRangeAroundSpanText(id: string) {
    const el = document.getElementById(id)!.firstChild as Text
    const range = new Range()
    range.setStart(el, 0)
    range.setEnd(el, el.length)
    const selection = document.getSelection()!
    selection.removeAllRanges()
    selection.addRange(range)
}

function setRangeToFirstTextHeadAndSecondTextMiddle(firstId:string, secondId:string) {
    const first = document.getElementById(firstId)!.firstChild as Text
    const second = document.getElementById(secondId)!.firstChild as Text
    const range = new Range()
    range.setStart(first, 0)
    range.setEnd(second, 1)
    const selection = document.getSelection()!
    selection.removeAllRanges()
    selection.addRange(range)
}

function setRangeToFirstTextHeadAndSecondTextTail(firstId:string, secondId:string) {
    const first = document.getElementById(firstId)!.firstChild as Text
    const second = document.getElementById(secondId)!.firstChild as Text
    const range = new Range()
    range.setStart(first, 0)
    range.setEnd(second, second.length)
    const selection = document.getSelection()!
    selection.removeAllRanges()
    selection.addRange(range)
}

function setRangeToFirstTextMiddleAndSecondTextMiddle(firstId:string, secondId:string) {
    const first = document.getElementById(firstId)!.firstChild as Text
    const second = document.getElementById(secondId)!.firstChild as Text
    const range = new Range()
    range.setStart(first, 1)
    range.setEnd(second, 1)
    const selection = document.getSelection()!
    selection.removeAllRanges()
    selection.addRange(range)
}



createRoot(root).render(
    <div style={{height: '100%'}}>
        <div style={{display: 'flex', height: 600}}>
            <div contentEditable={true} style={{width: 500, grow: 1, border: 'solid black 1px'}}>
                <p>
                    <span>123</span>
                    <span id='span-456'>456</span>
                    <span id='span-789'>789</span>
                    <span id='span-ABC'>ABC</span>
                </p>
                <p>
                    <span>abc</span>
                    <span>def</span>
                    <span>ghi</span>
                </p>
                <p>
                    <span>jkl</span>
                    <span>mno</span>
                    <span>pqr</span>
                    <span>stu</span>
                    <span>vwxyz</span>
                </p>
                <p>
                    <span>next is empty</span>
                    <span id='empty-span'></span>
                    <span>prev is empty</span>
                </p>
            </div>
            <div style={{width: 500, grow: 1, border: 'solid black 1px'}}>
                {() => {
                    if (range()) {
                        return <pre>
                        {JSON.stringify({
                            startContainer: range()!.startContainer.textContent,
                            startOffset: range()!.startOffset,
                            endContainer: range()!.endContainer.textContent,
                            endOffset: range()!.endOffset
                        }, null, 4)}
                    </pre>
                    }
                    return <pre>no range</pre>
                }}
            </div>

        </div>
        <div>
            <div>
                <button onClick={() => setCursorOffset0('span-456')}>set cursor to 456 0</button>
                <button onClick={() => setCursorOffset0('empty-span')}>set cursor to empty span 0</button>
            </div>
            <div>
                <button onClick={() => setRangeAroundSpanText('span-456')}>set range to 456</button>
                <button onClick={() => setRangeToFirstTextHeadAndSecondTextMiddle('span-456', 'span-789')}>set to 456 head and 789 middle</button>
                <button onClick={() => setRangeToFirstTextHeadAndSecondTextTail('span-456', 'span-789')}>set to 456 head and 789 tail</button>
                <button onClick={() => setRangeToFirstTextMiddleAndSecondTextMiddle('span-456', 'span-789')}>set to 456 middle and 789 middle</button>
            </div>
        </div>
    </div>
)


