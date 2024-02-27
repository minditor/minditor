/**@jsx createElement*/
import { createElement, createRoot, atom, Atom, RxList } from 'axii'

/**
 * 浏览器行为测试文件：
 * 已经有事件绑定的元素被 append 到 fragment 后，再 append 到 dom 上，应该会失效。
 */
const root= document.getElementById('root')!

const range = atom<Range>(null)


document.addEventListener('selectionchange', () => {
    range(document.getSelection()!.getRangeAt(0))
})


const events = new RxList<Event>([])
function pushEvent(e: Event) {
    events.push(e)
}

function preventDefault(e: Event) {
    e.preventDefault()

}

createRoot(root).render(
    <div style={{height: '100%'}}>
        <div style={{display: 'flex', height: 600}}>
            <div contentEditable={true} style={{width: 500, grow: 1, border: 'solid black 1px'}}
                 onCompositionStartCapture={pushEvent}
                 onKeyDown={pushEvent}
                 onCompositionEndCapture={[pushEvent]}
                 onInputCapture={[pushEvent, preventDefault]}
                 onbeforeInputCapture={[pushEvent, preventDefault]}
            >
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
            <table border={1}>
                {events.map((event:Event) => {
                    return <tr>
                        <td>type:{event.type}</td>
                        <td> isComposing:{event.isComposing}</td>
                        <td> key:{event.key}</td>
                        <td> keyCode:{event.keyCode}</td>
                        <td> data:{event.data}</td>
                    </tr>
                })}
            </table>

        </div>
    </div>
)


