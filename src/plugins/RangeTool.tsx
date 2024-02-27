/**@jsx createElement*/
import {createElement, atom} from 'axii'
import {Plugin} from "../Plugin.js";
import {Document} from "../Document.js";
import Bold from "../icons/Bold";
import Italic from "../icons/Italic";
import Underline from "../icons/Underline";
import LineThrough from "../icons/Linethrough";
import Link from "../icons/Link.js";
import {DocRange} from "../Range.js";
import {Inline, InlineComponent, Text} from "../DocumentContent.js";


export class RangeWidget {
    constructor(public document: Document) {
    }

    // render icon。上面可以自定义 click 事件
    render(): JSX.Element {
        return <span>icon</span>
    }
}

class RangeTool extends Plugin {
    public rangeWidgets: RangeWidget[] = []
}




export function createRangeTool(RangeWidgets: (typeof RangeWidget)[]) {

    return class OneRangeTool extends RangeTool {
        public rangeWidgets: RangeWidget[]

        constructor(public document: Document) {
            super(document);
            this.rangeWidgets = RangeWidgets.map(RangeWidgetClass => {
                return new RangeWidgetClass(this.document)
            })
        }
        calculatePosition(outsideDocBoundary: boolean) {
            const {visibleRangeRect, lastMouseUpPositionAfterRangeChange, selectionRange, hasRange} = this.document.view.state

            const positionAttrs = {
                position: 'fixed'
            } as any

            positionAttrs.position = 'fixed'
            // 根据最后鼠标停的位置，来决定浮层的位置
            // 1. 如果鼠标位置在 rect 下面，那么浮层就显示在  range 下面
            // 2. 如果鼠标位置在 rect 上面，那么浮层就显示在  range 上面
            if (lastMouseUpPositionAfterRangeChange()!.top > (visibleRangeRect.raw!.top + visibleRangeRect.raw!.height / 2)) {
                positionAttrs.top = visibleRangeRect.raw!.top + visibleRangeRect.raw!.height
                positionAttrs.bottom = undefined // CAUTION 不能忽略，不然不会清空上一次的值
            } else {
                positionAttrs.top = undefined // CAUTION 不能忽略，不然不会清空上一次的值
                positionAttrs.bottom = -(visibleRangeRect.raw!.top)
            }
            positionAttrs.left = lastMouseUpPositionAfterRangeChange()!.left

            // 如果和  view 在同一个 boundary 之内，使用同样的 scroll，那么使用 absolute 定位
            if(!outsideDocBoundary) {
                const boundaryRect = this.document.view.getContainerBoundingRect()!
                positionAttrs.position = 'absolute'
                if (lastMouseUpPositionAfterRangeChange()!.top > (visibleRangeRect.raw!.top + visibleRangeRect.raw!.height / 2)) {
                    positionAttrs.top -= boundaryRect.top
                } else {
                    positionAttrs.bottom += boundaryRect.top
                }
                positionAttrs.left -= boundaryRect.left

            }
            return positionAttrs
        }
        render(outsideDocBoundary: boolean) {
            const style = () => {
                const { lastMouseUpPositionAfterRangeChange, hasRange} = this.document.view.state
                if (!lastMouseUpPositionAfterRangeChange() || !hasRange()){
                    return {display: 'none'}
                }

                const positionAttrs = this.calculatePosition(outsideDocBoundary)
                // TODO 没考虑 left 超出左右边界的问题。

                return {
                    display: 'block',
                    ...positionAttrs,
                    transform: 'translateX(-50%)',
                    padding: 8,
                    borderRadius: 6,
                    background: '#fff',
                    border: '1px solid #eee',
                    boxShadow: '2px 2px 5px #dedede',
                    transition: 'all',
                    // 一定要设置，不然在 chrome 上好像有 bug
                    height: 'fit-content',
                    // 不换行
                    whiteSpace: 'nowrap',
                    zIndex: 100000
                }
            }

            // CAUTION 特别注意这里的 stopPropagation，不然会影响到 document 的 mouseup 等事件
            return <div style={style} data-testid="rangeTool-container">
                <div style={{display:'flex', whiteSpace: 'nowrap'}}>
                    {() => this.rangeWidgets.map((widget: RangeWidget) => {
                        return widget.render()
                    })}
                </div>
            </div>
        }
    }
}

class DecorationWidget extends RangeWidget {
    static displayName = `FormatRangeWidget`
    static formatAndIcons: [any, string][] = [
        [<Bold size={16}/>, 'bold'],
        [<Italic size={16}/>, 'italic'],
        [<Underline size={16}/>, 'underline'],
        [<LineThrough size={16}/>, 'lineThrough'],
    ]
    toggleFormat = (formatName: string) => {
        this.document.view.formatCurrentRange({[formatName]: true})
    }

    // TODO 获取原来的 format。展示到  icon 上
    render() {
        return <div style={{display:'flex', flexWrap: 'nowrap'}}>
            {
                DecorationWidget.formatAndIcons.map(([icon, formatName]) => (
                    <span
                        style={{cursor: 'pointer',marginLeft:8, display:'flex', alignItems: 'center', width:24, height:24, justifyContent: 'center'}}
                        onClick={(e:MouseEvent) => this.toggleFormat(formatName)}
                        data-testid={`format-${formatName}`}
                    >{icon}</span>
                ))
            }
        </div>
    }
}


type ColorItemProp = {
    showText?: boolean
    color?: string,
    backgroundColor?: string,
    onClick: (color?:string, bgColor?: string) => any
}

function ColorItem({ showText, color, backgroundColor, onClick}: ColorItemProp) {
    return (
        <span
            style={{
                display: 'flex',
                cursor: 'pointer',
                marginLeft: 8,
                alignItems: 'center',
                width: 24,
                height: 24,
                justifyContent: 'center',
                color,
                backgroundColor
            }}
            onClick={() => onClick(color, backgroundColor)}
        >{showText ? 'A' : null}</span>
    )
}

type ColorPickerProp = {
    onColorClick: (color: string) => any
    onBackgroundColorClick: (color: string) => any
}

function ColorPicker({onColorClick, onBackgroundColorClick}: ColorPickerProp) {
    const fontColors = [
        'rgb(31, 35, 41)',
        'rgb(143, 149, 158)',
        'rgb(216, 57, 49)',
        'rgb(222, 120, 2)',
        'rgb(220, 155, 4)',
        'rgb(46, 161, 33)',
        'rgb(36, 91, 219)',
        'rgb(100, 37, 208)'
    ]

    const backgroundColors = [
        "transparent",
        "#e91e63",
        "#9c27b0",
        "#673ab7",
        "#3f51b5",
        "#2196f3",
        "#03a9f4",
        "#00bcd4",
        "#009688",
        "#4caf50",
        "#8bc34a",
        "#cddc39",
        "#ffeb3b",
        "#ffc107",
        "#ff9800",
        "#ff5722",
    ]


    return <div>
        <div style={{display: 'flex', flexWrap: 'nowrap'}}>
            {
                fontColors.map((color) => (
                    <ColorItem showText onClick={(color) => onColorClick(color!)} color={color}/>
                ))
            }
        </div>
        <div style={{display: 'flex', flexWrap: 'nowrap'}}>
            {
                backgroundColors.slice(0, backgroundColors.length / 2).map((color) => (
                    <ColorItem onClick={(_, bgColor) => onBackgroundColorClick(bgColor!)} backgroundColor={color}/>
                ))
            }
        </div>
        <div style={{display: 'flex', flexWrap: 'nowrap', marginTop: 8}}>
            {
                backgroundColors.slice(backgroundColors.length / 2).map((color) => (
                    <ColorItem onClick={(_, bgColor) => onBackgroundColorClick(bgColor!)} backgroundColor={color}/>
                ))
            }
        </div>
    </div>

}


class ColorWidget extends RangeWidget {
    static displayName = `ColorRangeWidget`
    useColor = (color: string) => {
        this.document.view.formatCurrentRange({color})
    }
    useBackgroundColor = (backgroundColor: string) => {
        this.document.view.formatCurrentRange({backgroundColor})
    }

    render() {
        // TODO 获取原来的 format。展示到  icon 上

        const hover = atom(false)

        const pickerStyle = () => {
            return ({
                display: hover() ? 'block' : 'none',
                position: 'absolute',
                top: '100%',
                left: 0,
                transform: 'translateX(-50%)',
                padding: 8,
                borderRadius: 6,
                background: '#fff',
                border: '1px solid #eee',
                boxShadow: '2px 2px 5px #dedede',
                transition: 'all',
                // 一定要设置，不然在 chrome 上好像有 bug
                height: 'fit-content',
                // 不换行
                whiteSpace: 'nowrap'
            })
        }


        const picker = (
            <div style={pickerStyle}>
                <ColorPicker onColorClick={this.useColor} onBackgroundColorClick={this.useBackgroundColor}/>
            </div>
        )
        return (
            <div style={{display:'flex', position:'relative', width:24, height:24, alignItems: 'center',justifyContent: 'center'}}
                 onmouseenter={() => hover(true)}
                 onmouseleave={() => hover(false)}
            >
                <span style={{cursor: 'pointer',marginLeft:8, fontSize:18}}>A</span>
                {picker}
            </div>
        )
    }
}

class LinkWidget extends RangeWidget {
    static displayName = `LinkWidget`
    replaceRangeWithLink = () => {
        const { selectionRange } = this.document.view.state
        const range = selectionRange()!

        const { isInSameInline, startText, startOffset,startBlock, endOffset, isEndFull, endText } = range
        const initialText = range.toText()

        this.document.history.openPacket(range)
        let deleteStart = startText
        let beforeStart = startText.prev() as Text
        let afterEndText = endText.next as Text

        if (startOffset !== 0 || !startText.prev()) {
            beforeStart = startText
            deleteStart = this.document.view.splitText(startText, startOffset, startBlock)
        }

        if (!isEndFull) {
            if (isInSameInline) {
                afterEndText = this.document.view.splitText(deleteStart, endOffset - startOffset, startBlock)
            } else {
                afterEndText = this.document.view.splitText(endText, endOffset, startBlock)
            }
        }

        this.document.view.deleteBetween(deleteStart, afterEndText, startBlock)
        const link = this.document.content.createFromData({
            type:'Link',
            href: initialText,
            alt: initialText,
            content: []
        }) as InlineComponent

        this.document.view.append(link, beforeStart, startBlock)
        this.document.history.closePacket(null)

        link.focus()
    }
    render() {
        const style= () => {
            const { selectionRange } = this.document.view.state
            if (!selectionRange() ) return {display: 'none'}

            const { isInSameBlock, startText, startOffset, endOffset, isEndFull, endText } = selectionRange()!
            if (!isInSameBlock) return {display: 'none'}

            let isAllText = true
            let current:Inline|null = startText
            while(current && current !== endText.next) {
                if (!(current instanceof Text)) {
                    isAllText = false
                    break
                }
                current = current.next
            }

            if (!isAllText) return {display: 'none'}
            return {
                display: 'flex',
                position: 'relative',
                width: 24,
                height: 24,
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                marginLeft: 8
            }
        }

        return (
            <div
                style={style}
                onClick={this.replaceRangeWithLink}
            >
                <Link size={16}/>
            </div>
        )
    }

}

export const defaultFormatWidgets = [
    DecorationWidget,
    ColorWidget,
    LinkWidget
]



