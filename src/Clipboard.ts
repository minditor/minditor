// TODO 增加在  memory 中的写法，这样 cut paste 的时候可以复用元素
export class Clipboard {
  public data = new Map<string, any>()
  constructor() {

  }
  getItemName(name: string) {
    return `CLIPBOARD_${name}`
  }
  set(data: any, type:string, e?: ClipboardEvent) {
    this.data.set(type, data)
    const stringifyData = JSON.stringify(data)
    localStorage.setItem(this.getItemName(type), stringifyData)

    if(e) {
      e?.clipboardData!.setData(type, stringifyData)
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(stringifyData)
    }
  }
  get(type: string, e?:ClipboardEvent) {
    let data: any
    if (e) {
      data= e.clipboardData?.getData(type)
    } else if (navigator.clipboard) {
      data= navigator.clipboard.readText()
    } else {
      data = localStorage.getItem(this.getItemName(type))
    }
    return JSON.parse(data)
  }
}
