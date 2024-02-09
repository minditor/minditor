/**@jsx createElement*/
import {onESCKey, createElement, createHost} from 'axii'
import {Plugin, PluginRunArgv} from "../Plugin";
import {Document} from "../Document";
import Bold from "../icons/Bold";
import Italic from "../icons/Italic";
import Underline from "../icons/Underline";
import Linethrough from "../icons/Linethrough";


export class RangeWidget {
    constructor(public document: Document) {}
    // render icon。上面可以自定义 click 事件
    render(): JSX.Element {
        return <span>icon</span>
    }
}

export function createRangeTool(RangeWidgetClasses: (typeof RangeWidget)[] ) {

    return class RangeTool extends Plugin{
        public rangeWidgets: RangeWidget[]
        constructor(public document: Document) {
            super(document);
            this.rangeWidgets = RangeWidgetClasses.map(RangeWidgetClass => {
                return new RangeWidgetClass(this.document)
            })
        }
        render() {
            const style = () => {
                // TODO 位置要跟着 content 一起滚动

                // range 看不见了，display 要 none
                const { visibleRangeRect, lastActiveDevice, selectionRange } = this.document.view.state
                if (lastActiveDevice() !== 'mouse' || !selectionRange() || selectionRange()?.collapsed || !visibleRangeRect()) {
                    return { display: 'none'}
                } else {

                    // TODO boundaryContainer 怎么得到
                    const {boundaryContainer} = this.document.view
                    // const boundaryRect = boundaryContainer!.getBoundingClientRect()

                    return {
                        display: 'block',
                        position: 'absolute', // CAUTION 注意 rangePosition 拿到的是相对于 modal boundary 的，所以我们这里也是相对于 modal boundary 的 absolute
                        // top: visibleRangeRect().top - boundaryRect.top + boundaryContainer!.scrollTop -50,
                        top: visibleRangeRect().top,
                        // marginBottom: '100%',
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
            }

            return  <div style={style}>
                <div>
                    {this.rangeWidgets.map((widget: RangeWidget) => {
                        return widget.render()
                    })}
                </div>
                <div>{() => this.document.view.state.mousePosition() && JSON.stringify(this.document.view.state.mousePosition())}</div>
            </div>
        }
    }
}

export function createFormatWidget(icon: JSX.Element, formatName: string) {
    return class FormatWidget extends RangeWidget {
        static displayName =`${formatName}RangeWidget`
        toggleFormat = () =>{
            // TODO 获取原来的 format
            this.document.view.formatCurrentRange({[formatName]: true})
        }
        render() {
            return <span style={{cursor: 'pointer'}} onClick={this.toggleFormat}>
                {icon}
            </span>
        }
    }
}

export const defaultFormatWidgets = [
    createFormatWidget(<Bold size={16}/>, 'bold'),
    createFormatWidget(<Italic size={16}/>, 'italic'),
    createFormatWidget(<Underline size={16}/>, 'underline'),
    createFormatWidget(<Linethrough size={16}/>, 'lineThrough'),
]



