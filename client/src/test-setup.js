import '@testing-library/jest-dom'

// Node 25 provides a native localStorage backed by --localstorage-file.
// When vitest runs without a valid file path, the native localStorage is
// non-functional. Replace it with an in-memory mock for all tests.
const store = {}
const localStorageMock = {
  getItem: (key) => (key in store ? store[key] : null),
  setItem: (key, value) => { store[key] = String(value) },
  removeItem: (key) => { delete store[key] },
  clear: () => { Object.keys(store).forEach(k => delete store[k]) },
  get length() { return Object.keys(store).length },
  key: (i) => Object.keys(store)[i] ?? null,
}
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
})
