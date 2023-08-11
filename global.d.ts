import { createElement, Fragment} from 'axii'

// Global compile-time constants
declare var __DEV__: boolean
declare var __TEST__: boolean
declare var __BROWSER__: boolean
declare var __GLOBAL__: boolean
declare var __ESM_BUNDLER__: boolean
declare var __ESM_BROWSER__: boolean
declare var __NODE_JS__: boolean
declare var __SSR__: boolean
declare var __COMMIT__: string
declare var __VERSION__: string
declare var __COMPAT__: boolean

// Feature flags
declare var __FEATURE_OPTIONS_API__: boolean
declare var __FEATURE_PROD_DEVTOOLS__: boolean
declare var __FEATURE_SUSPENSE__: boolean

// for tests
declare namespace jest {
  interface Matchers<R, T> {
    toHaveBeenWarned(): R
    toHaveBeenWarnedLast(): R
    toHaveBeenWarnedTimes(n: number): R
  }
}

export type Props = {
  [k: string]: any,
  children?: ChildNode[]
}

export type EffectHandle = () => (void | (() => void))

type InjectHandles = {
  createElement: typeof createElement,
  useLayoutEffect: (arg: EffectHandle) => void
  ref: {
    [k: string]: HTMLElement
  },
}

export type Component = (props: Props, injectHandles?: InjectHandles) => HTMLElement|Text|DocumentFragment|null|undefined|string|number|Function|JSX.Element
export type ComponentNode = {
  type: Component|string|typeof Fragment,
  props : Props,
  children: any
}

declare global {
  var __DEV__: boolean
  namespace JSX {
    interface IntrinsicElements {
      // allow arbitrary elements
      // @ts-ignore suppress ts:2374 = Duplicate string index signature.
      [name: string]: any
    }
    interface Element extends  ComponentNode {}
  }
}
