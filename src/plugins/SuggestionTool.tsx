/**@jsx createElement*/
import {onESCKey, createElement, createHost} from 'axii'
import {Plugin, PluginRunArgv} from "../Plugin";
import {Document} from "../Document";
import {RangeWidget} from "./RangeTool";

function onInputKey(key: string) {
    return (e: CustomEvent): boolean => {
        return e.detail.data === key
    }
}

export class SuggestionWidget {
    constructor(public document: Document, public parent: Plugin) {}
    // render icon。上面可以自定义 click 事件
    render(): JSX.Element {
        return <span>icon</span>
    }
}

export function createSuggestionTool(triggerChar: string, atFront: boolean, SuggestionClasses: (typeof SuggestionWidget)[]) {
    return class RangeTool extends Plugin{
        public static displayName = `suggestion(${triggerChar})`
        public static activateEvents = {
            // TODO 增加在行首的判断
            inputChar: onInputKey(triggerChar)
        }
        public static deactivateEvents = {
            // TODO 增加更多判断，例如按退格一直把 / 也删掉了。
            keydown: onESCKey(() => true)
        }
        public suggestionWidgets: SuggestionWidget[]
        constructor(public document: Document) {
            super(document);
            this.suggestionWidgets = SuggestionClasses.map(SuggestionClass => {
                return new SuggestionClass(this.document, this)
            })
        }
        render() {
            const style = () => {

                // range 看不见了，display 要 none
                const { visibleRangeRect } = this.document.view.state
                if (!this.activated() || !visibleRangeRect()) return { display: 'none'}
                const {boundaryContainer} = this.document.view
                // const boundaryRect = boundaryContainer!.getBoundingClientRect()

                return {
                    display: 'block',
                    position: 'absolute', // CAUTION 注意 rangePosition 拿到的是相对于 modal boundary 的，所以我们这里也是相对于 modal boundary 的 absolute
                    // top: visibleRangeRect().top - boundaryRect.top + boundaryContainer!.scrollTop -50,
                    top: visibleRangeRect().bottom + 10,
                    // left: visibleRangeRect().left - boundaryRect.left,
                    left: visibleRangeRect().left,
                    padding: 10,
                    borderRadius: 4,
                    background: '#fff',
                    border:'1px solid #eee',
                    boxShadow: '2px 2px 5px #dedede',
                    transition: 'all'
                }
            }

            return  <div style={style}>
                <div>x</div>
                <div>
                    {this.suggestionWidgets.map((widget: SuggestionWidget) => {
                        return widget.render()
                    })}
                </div>
            </div>
        }
    }
}

export function createSuggestionWidget(icon: JSX.Element, itemName: string) : typeof SuggestionWidget{
    return class FormatWidget extends SuggestionWidget {
        static displayName =`${itemName}RangeWidget`
        insertItem = () =>{
            console.log('insert', itemName)
        }
        render() {
            return <div>
                <button onClick={this.insertItem}>
                {icon}
                </button>
            </div>
        }
    }
}

export const defaultBlockSuggestionWidgets = [
    createSuggestionWidget(<span>insert code</span>, 'code'),
    createSuggestionWidget(<span>insert table</span>, 'table'),
]



