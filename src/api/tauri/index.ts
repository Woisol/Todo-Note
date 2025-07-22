// @ts-expect-error __TAURI__
export const { invoke } = window.__TAURI_INTERNALS__ ? window.__TAURI_INTERNALS__ : { invoke: () => undefined };
// Promise.reject(new Error('Tauri is not available'))