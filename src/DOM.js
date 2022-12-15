import { each } from './util'

let uuid = 0
function getId() {
  return ++uuid
}

/** Attempt to set a DOM property to the given value.
 *  IE & FF throw for certain property-value combinations.
 */
function setProperty(node, name, value) {
  try {
    node[name] = value
  } catch (e) {
    /* eslint-disable no-console */
    console.error(e)
    /* eslint-enable no-console */
  }
}

function eventProxy(e) {
  const listener = this._listeners[e.type]
  return Array.isArray(listener) ? listener.forEach(l => l(e)) : listener(e)
}

export function setAttribute(node, name, value, isSvg) {
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
          node.style[k] = ''
        } else {
          node.style[k] = typeof v === 'number' ? (`${v}px`) : v
        }
      })
    }
  } else if (name === 'dangerouslySetInnerHTML') {
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
      if (ns) node.removeAttributeNS('http://www.w3.org/1999/xlink', name.toLowerCase())
      else node.removeAttribute(name)
    } else if (typeof value !== 'function') {
      if (ns) node.setAttributeNS('http://www.w3.org/1999/xlink', name.toLowerCase(), value)
      else node.setAttribute(name, value)
    }
  }
}

function setAttributes(attributes, element, invoke) {
  each(attributes, (attribute, name) => {
    if (/^on[A-Z]/.test(name) && typeof attribute === 'function') {
      if (invoke) {
        setAttribute(element, name, (...argv) => invoke(attribute, ...argv))
      } else {
        setAttribute(element, name, attribute)
      }
    } else if (name === 'style' || (!/^_+/.test(name) && !(typeof attribute === 'object'))) {
      // 不允许 _ 开头的私有attribute，不允许 attribute 为数组或者对象
      setAttribute(element, name, attribute)
    } else if (name === '_uuid') {
      setAttribute(element, 'data-uuid', getId())
    } else {
      console.warn(`invalid attribute: ${name}`)
    }
  })
}

function handlerChildren(container, children) {
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

export function createElement(type, props, ...children) {
  if (type !== Fragment && typeof type === 'function') {
    // 组件
    return type({ ...props, children })
  }

  // TODO 处理 attributes
  let container
  if (type === Fragment) {
    container = document.createDocumentFragment()
  } else if (typeof type === 'string') {
    container = document.createElement(type)
  } else {
    throw new Error(`unknown type ${type}`)
  }

  if (props) {
    setAttributes(props, container)
  }

  handlerChildren(container, children)
  if (props?.ref) {
    props.ref(container)
  }
  return container
}

export function Fragment() {}

export default {
  createElement,
  Fragment,
}
