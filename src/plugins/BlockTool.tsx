/**@jsx createElement*/
import {onESCKey, createElement, createHost} from 'axii'
import {atom} from 'axii'
import {Plugin, PluginRunArgv} from "../Plugin";
import {Document} from "../Document";
import {RangeWidget} from "./RangeTool";


export class BlockTool extends Plugin{
    public static displayName = `BlockTool`
    render() {
        const hover = atom(false)

        const style = () => {
            // range 看不见了，display 要 none
            const { lastMouseEnteredBlockDocNode, lastActiveDevice } = this.document.view.state

            if (!hover() &&( !lastMouseEnteredBlockDocNode() || lastActiveDevice() !== 'mouse')) return { display: 'none'}
            // const boundaryRect = boundaryContainer!.getBoundingClientRect()
            const blockUnitRect = this.document.view.docNodeToBlockUnit.get(lastMouseEnteredBlockDocNode())!.getBoundingClientRect()


            return {
                display: 'block',
                position: 'absolute', // CAUTION 注意 rangePosition 拿到的是相对于 modal boundary 的，所以我们这里也是相对于 modal boundary 的 absolute
                // top: visibleRangeRect().top - boundaryRect.top + boundaryContainer!.scrollTop -50,
                top: blockUnitRect.top,
                // left: visibleRangeRect().left - boundaryRect.left,
                right: '100%',
                marginRight: -1,
                // left: 0,
                // marginLeft: '-100%',
                padding: 10,
                borderRadius: 4,
                background: '#fff',
                border:'1px solid #eee',
                boxShadow: '2px 2px 5px #dedede',
                transition: 'all',
                whiteSpace: 'nowrap'
            }
        }

        return  <div style={style} onmouseenter={() => hover(true)} onmouseleave={hover(false)}>
            <div>delete</div>
            <div>insert after</div>
            <div>copy</div>
            <div>copy link</div>
        </div>
    }
}





