import {atom, Atom, createElement, Fragment} from "axii";
import Uppy, {BasePlugin, PluginOptions} from '@uppy/core';
import Dashboard from '@uppy/dashboard';

import '@uppy/core/dist/style.min.css';
import '@uppy/dashboard/dist/style.min.css';
import ImageEditor from '@uppy/image-editor';
import '@uppy/image-editor/dist/style.min.css';
import AwsS3 from '@uppy/aws-s3';
import XHR from '@uppy/xhr-upload'
import {AxiiComponent} from "../AxiiComponent.js";
import {Input} from "../lib/Input.js";

type ImageData = {
    src: string
    alt?: string
}


class InlineImagePlugin extends BasePlugin {
    constructor(uppy: Uppy, opts?: PluginOptions) {
        super(uppy, opts);
        this.id = opts?.id || 'MyPlugin';
        this.type = 'example';
    }
    uploader = (fileIDs: string[]) => {
        const files = this.uppy.getFiles()
        this.uppy.emit('upload-start', fileIDs)
        files.forEach((file) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const resp = {
                    status: 200,
                    body: {},
                    uploadURL: reader.result
                }
                this.uppy.emit('upload-success', file.id, resp)
            };
            reader.readAsDataURL(file.data);
        })
        return Promise.resolve()
    }
    install() {
        this.uppy.addUploader(this.uploader)
    }
}


const uploaderTypes = {
    aws:AwsS3,
    xhr:XHR,
    inline: InlineImagePlugin
}


export function createImageBlock(uploadType: keyof typeof uploaderTypes, config: any) {
    return class ImageBlock extends AxiiComponent {
        static displayName = 'Image'
        public uppyContainer?: HTMLElement
        public uppy? : Uppy
        public src: Atom<string>
        constructor(public data: ImageData) {
            super(data);
            this.src = atom(data.src||'')
        }
        onMount = () => {
            if (!this.data.src) {
                this.uppy = new Uppy({
                    restrictions: {
                        maxNumberOfFiles:1,
                        allowedFileTypes: ['image/*']
                    }
                })
                // @ts-ignore
                .use(uploaderTypes[uploadType]!, config)
                .use(Dashboard, { inline: true, target: this.uppyContainer, proudlyDisplayPoweredByUppy:false, height:300 })
                .use(ImageEditor, { target: Dashboard })
                .on('upload-success', (file, response) => {
                    // 更新自己
                    this.src(response.uploadURL!)
                });
            }
        }
        file: Atom<any> = atom(null)
        url: Atom<''> = atom('')
        onUseUrl = () => {
            this.src(this.url())
        }
        onFileChange = (e: InputEvent) => {
            // @ts-ignore
            const fileObject = e.target.files[0]
            this.file(fileObject)
            this.uppy?.addFile({name: fileObject.name, type:fileObject.type, data: fileObject})
        }
        renderContainer() {
            return <div  contenteditable={false}></div>
        }
        renderInner() {
            const buttonStyle = {
                display: 'inline-block',
                textAlign: 'center',
                padding: '10px',
                background:'#000',
                color: '#fff',
                borderRadius: '5px',
                cursor: 'pointer',
                outline:0,
                borderWidth: 0
            }

            const uppyStyle = () => ({
                display: this.file() ? 'block' : 'none',
            })

            const insertContainerStyle = () => {
                return this.src() ? {} : {
                    display: 'block',
                    textAlign: 'center',
                    padding: '20px',
                    border: '2px dashed #ccc',
                    borderStyle: 'dashed',
                    borderRadius: '5px'
                }
            }

            return <>
                {() => !this.src() && !this.file() ? (
                    <div style={insertContainerStyle}>
                        <div>
                            <input type="file" name={`${this.id}_file`} id={`${this.id}_file`} style={{position:'absolute', width:'0.1px', height:0, opacity:0, overflow:'hidden', zIndex:-1}} onChange={this.onFileChange} />
                            <label for={`${this.id}_file`} style={buttonStyle}>Upload File</label>
                        </div>
                        <div style={{padding:10, color: '#aaa'}}>or</div>
                        <div style={{display:'flex', justifyContent: 'center'}}>
                            <Input value={this.url} placeholder='image url' />
                            <button style={{marginLeft: 8, ...buttonStyle}} onClick={this.onUseUrl}>Insert</button>
                        </div>
                    </div>
                ) : null}
                {() => !this.src() ?
                    (this.uppyContainer = <div style={uppyStyle} className="image-uppy-root" contenteditable={false}></div> as  HTMLElement)
                    : null
                }
                {
                    () => this.src() ? (<div className="image-preview-root" style={{textAlign: "center"}} contenteditable={false}>
                        <img style={{maxWidth: '80%', width: 'auto'}} src={this.src()}
                             alt={this.data.alt}/>
                    </div>) :null
                }
            </>
        }
        destroy() {
            super.destroy();
            delete this.uppy
        }
        toJSON(): any {
            return {
                ...super.toJSON(),
                src: this.src(),
            };
        }
    }
}


export const InlineImageBlock = createImageBlock('inline', {id: 'MyPlugin'})
