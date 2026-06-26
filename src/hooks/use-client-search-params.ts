"use client";

import { useSyncExternalStore } from 'react';

const listeners = new Set<() => void>();

declare global {
  interface Window {
    __emSearchParamsHistoryPatched?: boolean;
  }
}

let cachedSearch = '';
let cachedParams = new URLSearchParams();
const emptyParams = new URLSearchParams();

function notifyListeners() {
  // Avoid scheduling React updates synchronously inside history.replaceState/pushState
  // (Next.js HistoryUpdater uses useInsertionEffect and will throw otherwise).
  queueMicrotask(() => {
    listeners.forEach((listener) => listener());
  });
}

function callNativePushState(...args: Parameters<History['pushState']>) {
  History.prototype.pushState.apply(window.history, args);
}

function callNativeReplaceState(...args: Parameters<History['replaceState']>) {
  History.prototype.replaceState.apply(window.history, args);
}

function patchHistory() {
  if (typeof window === 'undefined' || window.__emSearchParamsHistoryPatched) return;

  window.history.pushState = (...args) => {
    callNativePushState(...args);
    notifyListeners();
  };

  window.history.replaceState = (...args) => {
    callNativeReplaceState(...args);
    notifyListeners();
  };

  window.addEventListener('popstate', notifyListeners);
  window.__emSearchParamsHistoryPatched = true;
}

function unpatchHistory() {
  if (typeof window === 'undefined' || !window.__emSearchParamsHistoryPatched) return;

  window.history.pushState = function pushState(...args) {
    return callNativePushState(...args);
  };

  window.history.replaceState = function replaceState(...args) {
    return callNativeReplaceState(...args);
  };

  window.removeEventListener('popstate', notifyListeners);
  window.__emSearchParamsHistoryPatched = false;
}

function subscribe(onStoreChange: () => void) {
  if (typeof window === 'undefined') return () => {};

  listeners.add(onStoreChange);
  if (listeners.size === 1) patchHistory();

  return () => {
    listeners.delete(onStoreChange);
    if (listeners.size === 0) unpatchHistory();
  };
}

function getClientSnapshot(): URLSearchParams {
  const search = window.location.search;
  if (search !== cachedSearch) {
    cachedSearch = search;
    cachedParams = new URLSearchParams(search);
  }
  return cachedParams;
}

function getServerSnapshot(): URLSearchParams {
  return emptyParams;
}

/** Client-safe search params without Next.js Suspense bailout during static generation. */
export function useClientSearchParams(): URLSearchParams {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
