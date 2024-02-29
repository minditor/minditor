import { each } from './util'

let uuid = 0
function getId() {
  return ++uuid
}




/** Attempt to set a DOM property to the given value.
 *  IE & FF throw for certain property-value combinations.
 */
function setProperty(node: HTMLElement, name: string, value: any) {
  try {
    // FIXME
    // @ts-ignore
    node[name] = value
  } catch (e) {
    /* eslint-disable no-console */
    console.error(e)
    /* eslint-enable no-console */
  }
}

interface ExtendedElement extends HTMLElement {
  _listeners?: {
    [k: string]: (e: Event) => any
  },
}

function eventProxy(this: ExtendedElement, e: Event) {
  const listener = this._listeners![e.type]
  return Array.isArray(listener) ? listener.forEach(l => l(e)) : listener(e)
}

export function setAttribute(node: ExtendedElement, name: string, value: any, isSvg?: boolean) {
  // 只有事件回调允许是函数，否则的话认为是智能节点，外部需要控制
  if (typeof value === 'function' && !(name[0] === 'o' && name[1] === 'n')) {
    value(node, name, setAttribute)
  }

  if (name === 'className') name = 'class'

  if (name === 'key' || name === 'ref') {
    // ignore
  } else if (name === 'class' && !isSvg) {
    node.className = value || ''
  } else if (name === 'style') {
    if (!value || typeof value === 'string') {
      node.style.cssText = value || ''
    }

    if (value && typeof value === 'object') {
      each(value, (v, k) => {
        if (value[k] === undefined) {
          // FIXME
          // @ts-ignore
          node.style[k] = ''
        } else {
          // FIXME
          // @ts-ignore
          node.style[k] = typeof v === 'number' ? (`${v}px`) : v
        }
      })
    }
  } else if (name === 'dangerouslySetInnerHTML') {
    console.warn(value)
    if (value) node.innerHTML = value.__html || ''
  } else if (name[0] === 'o' && name[1] === 'n') {
    const useCapture = name !== (name = name.replace(/Capture$/, ''))
    name = name.toLowerCase().substring(2)
    if (value) {
      node.addEventListener(name, eventProxy, useCapture)
    } else {
      node.removeEventListener(name, eventProxy, useCapture)
    }

    (node._listeners || (node._listeners = {}))[name] = value
  } else if (name !== 'list' && name !== 'type' && !isSvg && name in node) {
    setProperty(node, name, value == null ? '' : value)
    if (value == null || value === false) node.removeAttribute(name)
  } else {
    const ns = isSvg && (name !== (name = name.replace(/^xlink\:?/, '')))
    if (value == null || value === false) {
      if (ns) {
        node.removeAttributeNS('http://www.w3.org/1999/xlink', name.toLowerCase())
      } else if (name.toLowerCase() === 'contenteditable' && value === false){
        node.setAttribute(name, 'false')
      } else {
        node.removeAttribute(name)
      }
    } else if (typeof value !== 'function') {
      if (ns) node.setAttributeNS('http://www.w3.org/1999/xlink', name.toLowerCase(), value)
      else node.setAttribute(name, value)
    }
  }
}

export type AttributesArg = {
  [k: string] : any
}

export function setAttributes(attributes: AttributesArg, element: HTMLElement, invoke?: Function) {
  each(attributes, (attribute, name) => {
    if (/^on[A-Z]/.test(name) && typeof attribute === 'function') {
      if (invoke) {
        setAttribute(element, name, (...argv: any[]) => invoke(attribute, ...argv))
      } else {
        setAttribute(element, name, attribute)
      }
    } else if (name === 'style' || name==='dangerouslySetInnerHTML' || (!/^_+/.test(name) && !(typeof attribute === 'object'))) {
      // '_' as start char is no allowed.
      // Object value is not allowed.
      setAttribute(element, name, attribute)
    } else if (name === '_uuid') {
      setAttribute(element, 'data-uuid', getId())
    } else {
      console.warn(`invalid attribute: ${name}`)
    }
  })
}

type ElementOrFunctionChild = HTMLElement | ((container: HTMLElement | ExtendedDocumentFragment) => any)

function handlerChildren(container: HTMLElement | ExtendedDocumentFragment, children?: ElementOrFunctionChild[]) {
  children && children.forEach((child) => {
    if (child !== undefined && child !== null) {
      if (typeof child === 'string') {
        container.appendChild(document.createTextNode(child))
      } else if (child instanceof HTMLElement) {
        container.appendChild(child)
      } else if (Array.isArray(child)) {
        handlerChildren(container, child)
      } else if (typeof child === 'function') {
        child(container)
      } else {
        console.warn(`unknown children ${child}`)
      }
    }
  })
}


type Component = (props: any) => HTMLElement

export type JSXElementType =  string | typeof Fragment | Component


export function createElement(type: JSXElementType, props: AttributesArg, ...children: HTMLElement[]) {
  if (type !== Fragment && typeof type === 'function') {
    // 组件
    return type({ ...props, children })
  }

  let container
  if (type === Fragment) {
    container = new ExtendedDocumentFragment()
  } else if (typeof type === 'string') {
    container = document.createElement(type)
  } else {
    throw new Error(`unknown type ${type}`)
  }

  if (props) {
    setAttributes(props, container as HTMLElement)
  }

  handlerChildren(container, children)
  if (props?.ref) {
    props.ref(container)
  }
  return container
}


export class ExtendedDocumentFragment extends DocumentFragment {
  static elToFragment = new WeakMap()
  _head: ChildNode | null
  _tail: ChildNode | null
  constructor() {
    super();
    this._head = null
    this._tail = null
  }
  // @ts-ignore
  appendChild(node: ChildNode) {
    super.appendChild(node)
    if (!this._head) {
      this._head = node
    }

    this._tail = node
    ExtendedDocumentFragment.elToFragment.set(node, this)
    return node
  }
  remove() {
    this.revoke()
  }
  revoke() {
    let pointer = this._head
    while(pointer) {
      super.appendChild(pointer)
      pointer = pointer === this._tail ? null : pointer?.nextSibling
    }
  }
  get firstChild() {
    return super.firstChild || this._head
  }
}


export function Fragment() {}

export default {
  createElement,
  Fragment,
}
