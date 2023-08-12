

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
  setTimeout(() => fn(), 0)
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

export function idleThrottle(fn: Function, timeout = 100) {
  let hasCallback: number | null
  let lastArgv : any[]
  return (...argv: any[]) => {
    if (!hasCallback) {
      hasCallback = window.requestIdleCallback(() => {
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
