import { createElement } from "axii";
import Uppy, {BasePlugin, PluginOptions} from '@uppy/core';
import Dashboard from '@uppy/dashboard';

import '@uppy/core/dist/style.min.css';
import '@uppy/dashboard/dist/style.min.css';
import ImageEditor from '@uppy/image-editor';
import '@uppy/image-editor/dist/style.min.css';
import {Component} from "../DocumentContent.js";
import AwsS3 from '@uppy/aws-s3';
import XHR from '@uppy/xhr-upload'

type ImageData = {
    src: string
    isNew?: boolean
    alt?: string
}



class InlineImagePlugin extends BasePlugin {
    constructor(uppy: Uppy, opts?: PluginOptions) {
        super(uppy, opts);
        this.id = opts?.id || 'MyPlugin';
        this.type = 'example';
    }
    uploader = (fileIDs: string[]) => {
        console.log("handling upload", fileIDs)
        const files = this.uppy.getFiles()
        this.uppy.emit('upload-start', fileIDs)
        files.forEach((file) => {
            const resp = {
                status: 200,
                body: {},
                uploadURL: URL.createObjectURL(file.data)
            }
            this.uppy.emit('upload-success', file.id, resp)
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
    return class ImageBlock extends Component {
        static displayName = 'Image'
        public element?: HTMLElement
        public uppy? : Uppy
        constructor(public data: ImageData) {
            super(data);
        }
        onMount = () => {
            if (this.data.isNew || !this.data.src) {
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
                        console.log(file?.name, response.uploadURL);

                        // 更新自己
                        // TODO 改成 AXIIComponent 来更新
                        this.data.isNew = false
                        this.data.src = response.uploadURL!
                        const newElement = this.renderResult()
                        this.element!.replaceWith(newElement)
                    });
            }
        }
        destroy() {
            super.destroy();
            delete this.uppy
        }

        renderResult() {
            const element = (this.data.isNew  ?
                    <div className="image-uppy-root" contenteditable={false}></div> :
                    <div className="image-preview-root"  contenteditable={false}>
                        <img style={{maxWidth: '100%', width:'auto'}} src={this.data.src} alt={this.data.alt} />
                    </div>
            ) as unknown as HTMLElement

            return element
        }
        render() {
            this.element = this.renderResult()
            return this.element
        }
    }
}

export const InlineImageBlock = createImageBlock('inline', { id: 'MyPlugin' })
