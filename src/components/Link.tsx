import {Atom, atom, createElement, RenderContext} from "axii";
import {InlineComponent} from "../DocumentContent.js";
import {Input} from "../lib/Input.js";
import {AxiiInlineComponent} from "../AxiiComponent.js";

type LinkData = {
    href?: string,
    alt?: string
}

type LinkEditorProps = {
    href: Atom<string>,
    alt: Atom<string>

}

function LinkEditor({ href, alt }: LinkEditorProps, { createElement }: RenderContext) {
    return (
        <div>
            <div style={{display:'flex', alignItems: 'center', justifyContent: 'center'}}>
                <span style={{display: 'inline-block', width:30}}>href</span>
                <Input $href type="text" value={href}/>
            </div>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 8}}>
                <span style={{display: 'inline-block', width:30}}>alt </span>
                <Input $alt type="text" value={alt}/>
            </div>
        </div>
    )
}


export class Link extends AxiiInlineComponent {
    static displayName = 'Link'
    public formVisible = atom(false)
    public href:Atom<string> = atom('')
    public alt:Atom<string> = atom('')
    public form: any
    constructor(data?: LinkData) {
        super();
        this.href(data?.href||'https://')
        this.alt(data?.alt || 'https://')
    }
    renderInner() {

        const formStyle = () => {
            return {
                display: this.formVisible() ? 'block' : 'none',
                // display: 'block',
                position: 'absolute',
                top: 0,
                left:0,
                background: '#fff',
                padding:10,
                borderRadius: 8,
                transform: 'translateY(-100%)',
                border: '1px solid #eee',
                boxShadow: '2px 2px 5px #dedede',
            }
        }

        const form = (
            <div style={formStyle}>
                <LinkEditor ref={(l:any) => this.form = l } href={this.href} alt={this.alt}/>
            </div>
        )

        return (
            <div
                style={{cursor:'pointer', position:"relative", textDecoration: 'underline',}}
                onmouseenter={() => this.formVisible(true)}
                onmouseleave={() => this.formVisible(false)}
                contenteditable={false}

            >
                <span onClick={() => window.open(this.href(), '_blank')}>{this.alt}</span>
                {form}
            </div>
        )
    }
    focus() {
        this.formVisible(true)
        this.form.ref.alt.ref.main.focus()
    }
    toJSON(): any {
        return {
            ...super.toJSON(),
            href: this.href(),
            alt: this.alt()
        }
    }
    toText() {
        return `[${this.alt()}](${this.href()})`
    }
}
