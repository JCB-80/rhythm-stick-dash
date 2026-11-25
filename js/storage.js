// One storage boundary for file://, private browsing, quota errors and corrupt JSON.
(function () {
  const memory = new Map();
  const dirty = new Set();
  let persistent = true;
  window.GameStorage = {
    get persistent() { return persistent; },
    get(key, fallback = null) {
      if (dirty.has(key)) return memory.get(key);
      try {
        const value = localStorage.getItem(key);
        return value === null ? fallback : value;
      } catch (_) { persistent = false; return memory.has(key) ? memory.get(key) : fallback; }
    },
    set(key, value) {
      memory.set(key, value);
      try { localStorage.setItem(key, value); dirty.delete(key); return true; }
      catch (_) { persistent = false; dirty.add(key); return false; }
    },
    read(key, fallback) {
      try { return JSON.parse(this.get(key, 'null')) ?? fallback; }
      catch (_) { return fallback; }
    },
    write(key, value) { return this.set(key, JSON.stringify(value)); }
  };
})();
