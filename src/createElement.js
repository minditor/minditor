import VNode from './VNode'
import {invariant} from "./util";

export function createRecursiveNormalize(normalizeLeaf = defaultNormalizeLeaf) {
  function normalize(vnode) {
    const current = normalizeLeaf(vnode)
    if (current.children) current.children = current.children.map(normalize)
    return current
  }

  return normalize
}


// 会进行递归的 normalize
export function defaultNormalizeLeaf(rawChild) {
  if (rawChild instanceof VNode) return rawChild

  let child
  if (rawChild === undefined) {
    // child = { type: String, value: 'undefined'}
    child = { type: null, isUndefined: true}
  } else if (rawChild === null) {
    child = { type: null }
  } else if (Array.isArray(rawChild)) {
    // Array 要把 raw 传过去。arrayComputed 要用.
    // CAUTION 不再递归，这个 normalize 知识纯工具。
    child = { type: Array, children: rawChild, raw:rawChild }
    // child = { type: Array, children: rawChild.map(defaultNormalizeLeaf), raw:rawChild }
  } else if (typeof rawChild === 'number' || typeof rawChild === 'string' || typeof rawChild === 'boolean') {
    child = { type: String, value: rawChild.toString() }
  }

  if (child) {
    const node = new VNode()
    Object.assign(node, child)
    return node
  }

  // object/function 只能作为 children 给组件处理的，所以不用 normalize
  return rawChild
}


export function createCreateElement(normalizeLeaf = defaultNormalizeLeaf) {
  function createElement(name, attributes, ...rawChildren) {

    const node = new VNode()

    node.attributes = attributes || {}
    // CAUTION 如果有 use，那么用 use。这样在写 vnode 的时候看起来像自定义组件。符合用户心智。
    node.type = node.attributes.use || name
    // CAUTION 一定要删掉，不要随便往 attribute 上挂载函数。会容易被当成 refComputed。
    delete node.attributes.use
    if (typeof name === 'string') {
      node.name = name
    }


    if (node.attributes.ref !== undefined) {
      node.ref = node.attributes.ref
      delete node.attributes.ref
    }

    if (node.attributes.vnodeRef !== undefined) {
      node.vnodeRef = node.attributes.vnodeRef
      delete node.attributes.vnodeRef
    }

    if (node.attributes.key !== undefined) {
      node.rawKey = node.attributes.key
      delete node.attributes.key
    }

    if (node.attributes.transferKey !== undefined) {
      node.rawTransferKey = node.attributes.transferKey
      delete node.attributes.transferKey
    }

    if (node.attributes.isSVG !== undefined) {
      node.isSVG = node.attributes.isSVG
      delete node.attributes.isSVG
    }

    let childrenToAttach = rawChildren
    if (node.attributes.children !== undefined) {
      invariant(childrenToAttach.length === 0, 'can not createElement with both children and prop.children')
      childrenToAttach = node.attributes.children
      delete node.attributes.children
    }

    if (node.attributes.forceUpdate !== undefined) {
      node.forceUpdate = node.attributes.forceUpdate
      delete node.attributes.forceUpdate
    }

    // node.children = childrenToAttach.map(normalizeLeaf)
    // CAUTION 外部自己递归处理。
    node.children = childrenToAttach

    if (typeof node.type === 'string') {
      // 用于支持 data-* 自定义属性
      node.dataset = node.attributes.dataset
      delete node.attributes.dataset
    }

    // CAUTION 外部的 createPortal 在 vnode 上标记了 portalRoot 属性。这里不需要处理
    if (node.vnodeRef) node.vnodeRef(node)

    return node
  }

  function cloneElement(vnode, newAttributes, ...children) {
    const clonedVnode = createElement(
      vnode.type,
      {
        ...vnode.attributes,

        ...newAttributes,
      },
      ...(children.length ? children : vnode.children),
    )
    Object.assign(clonedVnode, {
      key: vnode.key,
      ref: vnode.ref,
      name: vnode.name,
      portalRoot: vnode.portalRoot,
      transferKey: vnode.transferKey,
    })
    return clonedVnode
  }

  function shallowCloneElement(vnode) {
    const clonedVnode = new VNode()
    Object.assign(clonedVnode, vnode)
    return clonedVnode
  }

  return {
    createElement,
    cloneElement,
    shallowCloneElement,
    normalizeLeaf,
    recursiveNormalize: createRecursiveNormalize(normalizeLeaf)
  }
}

const defaultsFns = createCreateElement()

export default defaultsFns.createElement
export const cloneElement = defaultsFns.cloneElement
export const shallowCloneElement = defaultsFns.shallowCloneElement
export const normalizeLeaf = defaultsFns.normalizeLeaf
