/**@jsx createElement*/
import { createElement, createRoot } from 'axii'

/**
 * 浏览器行为测试文件：
 * 已经有事件绑定的元素被 append 到其他元素中后，事件是否还能正常触发。
 */
const root= document.getElementById('root')!
function moveButton1() {
    document.getElementById('target-container')!.appendChild(document.getElementById('target')!)
}

createRoot(root).render(<div>
    <div>
        <button id="target" onClick={() => alert(1)}>button 1, click to alert</button>
    </div>
    <div>
        <button onClick={moveButton1}>move button 1 to target-container</button>
    </div>
    <div id="target-container"></div>
</div>)


