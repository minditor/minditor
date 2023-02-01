expect.extend({
  toHaveBeenWarned(received: string) {
    asserted.add(received)
    const passed = warn.mock.calls.some(args => args[0].includes(received))
    if (passed) {
      return {
        pass: true,
        message: () => `expected "${received}" not to have been warned.`
      }
    } else {
      const msgs = warn.mock.calls.map(args => args[0]).join('\n - ')
      return {
        pass: false,
        message: () =>
          `expected "${received}" to have been warned` +
          (msgs.length
            ? `.\n\nActual messages:\n\n - ${msgs}`
            : ` but no warning was recorded.`)
      }
    }
  },

  toHaveBeenWarnedLast(received: string) {
    asserted.add(received)
    const passed =
      warn.mock.calls[warn.mock.calls.length - 1][0].includes(received)
    if (passed) {
      return {
        pass: true,
        message: () => `expected "${received}" not to have been warned last.`
      }
    } else {
      const msgs = warn.mock.calls.map(args => args[0]).join('\n - ')
      return {
        pass: false,
        message: () =>
          `expected "${received}" to have been warned last.\n\nActual messages:\n\n - ${msgs}`
      }
    }
  },

  toHaveBeenWarnedTimes(received: string, n: number) {
    asserted.add(received)
    let found = 0
    warn.mock.calls.forEach(args => {
      if (args[0].includes(received)) {
        found++
      }
    })

    if (found === n) {
      return {
        pass: true,
        message: () => `expected "${received}" to have been warned ${n} times.`
      }
    } else {
      return {
        pass: false,
        message: () =>
          `expected "${received}" to have been warned ${n} times but got ${found}.`
      }
    }
  }
})

let warn: jest.SpyInstance
const asserted: Set<string> = new Set();

(global as any).ResizeObserver = class ResizeObserver {
  constructor(ls?: (rect: any) => void) {
  }
  observe() {}
  unobserve() {}
  disconnect() {}
};

(global as any).IntersectionObserver = class ResizeObserver {
  constructor(ls?: (rect: any) => void) {
  }
  observe() {}
  unobserve() {}
  disconnect() {}
};