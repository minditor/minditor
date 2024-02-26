// TODO 增加在  memory 中的写法，这样 cut paste 的时候可以复用元素
export class Clipboard {
  public data = new Map<string, any>()
  public types: string[] = []
  constructor() {

  }
  getItemName(name: string) {
    return `CLIPBOARD_${name}`
  }
  setData(type:string, data: any,  e?: ClipboardEvent) {
    this.data.set(type, data)
    if (!this.types.includes(type)) {
      this.types.push(type)
    }

    const stringifyData = JSON.stringify(data)
    localStorage.setItem(this.getItemName(type), stringifyData)

    if(e) {
      e?.clipboardData!.setData(type, stringifyData)
    }
  }
  getData(type: string, e?:ClipboardEvent) {
    let data: any
    if (e) {
      data= e.clipboardData?.getData(type)
    }

    if (!data){
      data = JSON.parse(localStorage.getItem(this.getItemName(type))!)
    }
    return data
  }
}
