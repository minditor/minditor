/// <reference types="vite/client" />

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

declare module '*.vue' {}

declare module 'file-saver' {
  export function saveAs(blob: any, name: any): void
}


declare interface String {
  /**
   * @deprecated Please use String.prototype.slice instead of String.prototype.substring in the repository.
   */
  substring(start: number, end?: number): string
}

// This directory contains a number of d.ts assertions
// use \@ts-expect-error where errors are expected.

export function describe(_name: string, _fn: () => void): void
export function test(_name: string, _fn: () => any): void

export function expectType<T>(value: T): void
export function expectError<T>(value: T): void
export function expectAssignable<T, T2 extends T = T>(value: T2): void

export type IsUnion<T, U extends T = T> = (
    T extends any ? (U extends T ? false : true) : never
    ) extends false
    ? false
    : true

export type IsAny<T> = 0 extends 1 & T ? true : false
