import {state as globalState} from "./globals";


type PlainObject = {
  [k: string] : any
}

export function each(obj: PlainObject, fn: (v: any, k: string) => any) {
  for(let k in obj) {
    fn(obj[k], k)
  }
}

export function nextJob(fn: Function) {
  Promise.resolve().then(() => fn())
}

export function nextTask(fn: Function) {
  setTimeout(() => fn(), 1)
}

export function debounce(fn: Function, delay: number) {
  let timeoutHandle: number | null
  return (...argv: any[]) => {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle)
      timeoutHandle = null
    }

    timeoutHandle = window.setTimeout(() => {
      fn(...argv)
    }, delay)
  }
}

const requestIdleCallback = window.requestIdleCallback || function(cb: Function) {
    setTimeout(cb, 0)
}

export function idleThrottle(fn: Function, timeout = 100) {
  let hasCallback: number | null
  let lastArgv : any[]
  return (...argv: any[]) => {
    if (!hasCallback) {
      hasCallback = requestIdleCallback(() => {
        fn(...lastArgv)
        hasCallback = null
      }, {timeout})
    }
    lastArgv = argv
  }
}


export function assert(condition: boolean, message: string ) {
  if (!condition) {
    if (__DEV__) debugger
    throw new Error(message)
  }
}

export function deepFlatten(arr?: any) : any[]{
  if (!Array.isArray(arr)) return [arr]
  return arr.reduce((last, current) => last.concat(deepFlatten(current)), [])
}

export function unwrapChildren(children: any[]) {
  return (children.length ===1) ? children[0] : children
}

export function removeNodesBetween(start: ChildNode, endNode: ChildNode|Comment|undefined, includeEnd = false) {
  if (endNode && start.parentElement !== endNode.parentElement) {
    throw new Error('placeholder and element parentElement not same')
  }

  let pointer = start
  while(pointer && pointer !== endNode) {
    const current = pointer
    pointer = current.nextSibling!
    current.remove()
  }

  if (includeEnd && endNode) endNode.remove()
}

export function setNativeCursor(element: HTMLElement | ChildNode, offset: number) {
  const range = document.createRange()
  range.setStart(element, offset)
  range.setEnd(element, offset)

  globalState.selection!.removeAllRanges()
  globalState.selection!.addRange(range)
}

export function setNativeRange(startElement: HTMLElement | ChildNode, startOffset: number, endElement: HTMLElement|ChildNode, endOffset: number) {
  const range = document.createRange()
  range.setStart(startElement, startOffset)
  range.setEnd(endElement, endOffset)

  globalState.selection!.removeAllRanges()
  globalState.selection!.addRange(range)
}

export function deepClone(obj: any) {
  return JSON.parse(JSON.stringify(obj))
}

export function insertBefore( newNode: Node, referenceNode: Node) {
  referenceNode.parentNode?.insertBefore(newNode, referenceNode)
}

export function insertAfter( newNode: Node, referenceNode: Node) {
  referenceNode.parentNode?.insertBefore(newNode, referenceNode.nextSibling)
}

export function isAsyncFunction(func: any) {
  return func.constructor.name === 'AsyncFunction';
}

export const IS_SAFARI = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

export const IS_FF = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;

export const IS_CHROME = navigator.userAgent.toLowerCase().indexOf('chrome') > -1;

export const SHOULD_FIX_OFFSET_LAST = IS_FF

export const IS_COMPOSITION_BEFORE_KEYDOWN = IS_SAFARI
// CAUTION backspace at end of text in Chrome will not trigger selection change.
// CAUTION ff will lost cursor after delete whole text.
export const SHOULD_RESET_CURSOR_AFTER_BACKSPACE = IS_CHROME && !IS_FF
export const ZWSP = '​'