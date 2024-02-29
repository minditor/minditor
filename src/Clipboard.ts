import copy from 'copy-to-clipboard'

const IS_NATIVE_CLIPBOARD_SUPPORTED = navigator && navigator.clipboard && window.isSecureContext

export class Clipboard {
  public data = new Map<string, any>()
  public types: string[] = []
  constructor() {

  }
  getItemName(name: string) {
    return `CLIPBOARD_${name}`
  }
  setData(type:string, data: any,  e?: ClipboardEvent) {
    const strData = data instanceof Object ? JSON.stringify(data) : data
    if (e) {
      e.clipboardData?.setData(type, strData)
    } else {
      if (IS_NATIVE_CLIPBOARD_SUPPORTED) {
        navigator.clipboard.writeText(strData).catch(() => { console.error('copy to clipboard failed', type, strData)});
      } else {
        const success = copy(strData)
        if (success) {
          console.error('copy to clipboard failed with execCommand', type, strData)
        }
      }
    }
  }
  async getData(type: string, e?:ClipboardEvent) {
    let rawData: any
    if (e) {
      rawData = e.clipboardData?.getData(type)
    } else if (IS_NATIVE_CLIPBOARD_SUPPORTED) {
        rawData = await navigator.clipboard.readText()
    }

    return type === 'application/json' ? JSON.parse(rawData ?? '') : rawData
  }
}
