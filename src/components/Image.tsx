import {atom, Atom, createElement, Fragment} from "axii";
import Uppy, {BasePlugin, PluginOptions} from '@uppy/core';
import Dashboard from '@uppy/dashboard';

import '@uppy/core/dist/style.min.css';
import '@uppy/dashboard/dist/style.min.css';
import ImageEditor from '@uppy/image-editor';
import '@uppy/image-editor/dist/style.min.css';
import {Component} from "../DocumentContent.js";
import AwsS3 from '@uppy/aws-s3';
import XHR from '@uppy/xhr-upload'
import {AxiiComponent} from "../AxiiComponent.js";

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
        public element?: HTMLElement
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
                .use(Dashboard, { inline: true, target: this.element, proudlyDisplayPoweredByUppy:false, height:300 })
                .use(ImageEditor, { target: Dashboard })
                .on('upload-success', (file, response) => {
                    // 更新自己
                    this.src(response.uploadURL!)
                });
            }
        }
        destroy() {
            super.destroy();
            delete this.uppy
        }
        renderContainer() {
            return <div style={{display: 'block'}} contenteditable={false}></div>
        }
        renderInner() {
            return <>
                {() => !this.src() ? (this.element = <div className="image-uppy-root" contenteditable={false}></div> as  HTMLElement): null }
                {
                    () => this.src() ? (<div className="image-preview-root" style={{textAlign: "center"}} contenteditable={false}>
                        <img style={{maxWidth: '80%', width: 'auto',   }} src={this.src()}
                             alt={this.data.alt}/>
                    </div>) :null
                }
            </>
        }

        toJSON(): any {
            console.log('toJSON',{
                ...super.toJSON(),
                src: this.src(),
            } )
            return {
                ...super.toJSON(),
                src: this.src(),
            };
        }
    }
}


export const InlineImageBlock = createImageBlock('inline', {id: 'MyPlugin'})
