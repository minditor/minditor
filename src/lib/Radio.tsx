import {Atom, RenderContext, RxList} from "axii";

export type InputProps = {
    value: Atom<any>,
    type?: string,
    placeholder?: string,
    options: any[],
    display?: (value: any) => any
}

export function Radio({ value, type, display, options }: InputProps, { createElement} : RenderContext) {
    const optionList = new RxList(options)
    const uniqueMatch = optionList.createUniqueMatch(false, value())

    const onChange = (item:any) => {
        uniqueMatch.set(item)
        value(item)
    }

    const containerStyle = {
        display:'flex',
        gap: 8,
    }


    return <div style={containerStyle}>
        {uniqueMatch.map((selected, item) => {
            const dotStyle = () => ({
                display: 'inline-block',
                width: 10,
                height: 10,
                borderRadius: 5,
                boxSizing: 'border-box',
                border: '1px solid #000',
                padding:2,
                background: selected() ? '#000' : 'transparent',
            })
            return (
                <div
                    style={{ cursor:'pointer'}}
                    onClick={() => onChange(item)}>
                    <span style={dotStyle}></span>
                    <span style={{marginLeft:4}}>
                        {display ? display(item) : item}
                    </span>
                </div>
            )
        })}
    </div>
}
