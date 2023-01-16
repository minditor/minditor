/**@jsx createElement*/
// @ts-ignore
import {createElement} from "../src/DOM.js";

// @ts-ignore
const rootElement = document.getElementById('root')!
rootElement.appendChild(<div id="viewport" style={{width:500, height:500, border: '1px solid #000', overflow:'scroll'}}>
    <div style={{whiteSpace:'nowrap', width:300, height:400, border: '1px solid red', overflow:'scroll'}}>
        <div style={{display:'inline-block', width:400, height:50, border: '1px solid cyan'}}></div>
        <div id="target" style={{display:'inline-block',width:50, height:50, border: '1px solid blue'}}></div>
    </div>
</div>)



const observer = new IntersectionObserver(([entry]) => {
    console.log(1111, entry.isIntersecting, entry.intersectionRect)
}, {
    root: document.getElementById('viewport'),
    threshold: buildThresholdList()
})

observer.observe(document.getElementById('target')!)

function buildThresholdList(numSteps = 100) {
    let thresholds = [];

    for (let i=1.0; i<=numSteps; i++) {
        let ratio = i/numSteps;
        thresholds.push(ratio);
    }

    thresholds.push(0);
    return thresholds;
}