import {Atom, RenderContext} from "axii";

export type InputProps = {
    value: Atom<string>,
    type?: string,
    placeholder?: string
}

export function Input({ value, type, placeholder }: InputProps, { createElement} : RenderContext) {
    const onChange = (e: KeyboardEvent) => {
        value((e.target as unknown as HTMLInputElement).value)
    }
    const style = {
        outline: 'none',
        border: '1px solid #000',
        borderRadius:4,
        padding: '2px 8px',
        fontSize: '14px',
        lineHeight: '1.5',
    }
    return <input $main style={style} type={type||'text'} value={value} placeholder={placeholder||''} onChange={onChange}/>
}
