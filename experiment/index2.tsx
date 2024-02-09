/**@jsx createElement*/
import { createElement, createRoot } from 'axii'

/**
 * 浏览器行为测试文件：
 * 已经有事件绑定的元素被 append 到 fragment 后，再 append 到 dom 上，应该会失效。
 */
const root= document.getElementById('root')!
function moveButton1() {
    const button1 = document.getElementById('target')!
    button1.remove()
    document.getElementById('target-container')!.appendChild(button1)
}

function moveButton1ToFragment() {
    const button1 = document.getElementById('target')!
    const fragment = document.createDocumentFragment()
    fragment.appendChild(button1)
    document.getElementById('target-container')!.appendChild(button1)
}

createRoot(root).render(<div>
    <div>
        <button id="target" onClick={() => alert(1)}>button 1, click to alert</button>
    </div>
    <div>
        <button onClick={moveButton1}>move button 1 to target-container</button>
    </div>
    <div>
        <button onClick={moveButton1}>move button 1 to fragment</button>
    </div>
    <div id="target-container"></div>
</div>)


