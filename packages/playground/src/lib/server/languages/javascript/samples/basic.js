/**
 * A reactive store implementation with subscriptions,
 * derived values, and localStorage persistence.
 */

// NOTE: This showcases modern JavaScript features
const STORAGE_KEY = 'app-store';

class Store {
  #state;
  #listeners = new Set();

  constructor(initialState = {}) {
    const saved = localStorage.getItem(STORAGE_KEY);
    this.#state = saved ? JSON.parse(saved) : { ...initialState };
  }

  get state() {
    return structuredClone(this.#state);
  }

  set(key, value) {
    this.#state[key] = value;
    this.#persist();
    this.#notify();
  }

  update(key, fn) {
    this.#state[key] = fn(this.#state[key]);
    this.#persist();
    this.#notify();
  }

  subscribe(listener) {
    this.#listeners.add(listener);
    listener(this.state);
    return () => this.#listeners.delete(listener);
  }

  #notify() {
    const snapshot = this.state;
    for (const listener of this.#listeners) {
      listener(snapshot);
    }
  }

  #persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.#state));
    } catch {
      console.warn('Failed to persist store to localStorage');
    }
  }
}

// Derived values with automatic dependency tracking
function derived(store, fn) {
  let value;

  const unsubscribe = store.subscribe((state) => {
    value = fn(state);
  });

  return {
    get value() {
      return value;
    },
    destroy: unsubscribe,
  };
}

// TODO: add batch update support for multiple keys
async function fetchAndStore(store, url, key) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    store.set(key, data);
    return data;
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error);
    store.set(`${key}Error`, error.message);
    return null;
  }
}

// Usage
const store = new Store({ count: 0, items: [] });

const doubleCount = derived(store, (s) => s.count * 2);

const unsubscribe = store.subscribe((state) => {
  document.getElementById('count').textContent = state.count;
  document.getElementById('double').textContent = doubleCount.value;
});

document.getElementById('increment')?.addEventListener('click', () => {
  store.update('count', (n) => Math.min(n + 1, 99));
});

document.getElementById('load')?.addEventListener('click', () => {
  fetchAndStore(store, '/api/items', 'items');
});
