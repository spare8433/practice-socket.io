// BidirectionalMap.ts
export class BidirectionalMap<K, V> {
  private keyToValue = new Map<K, V>();
  private valueToKey = new Map<V, K>();

  set(key: K, value: V) {
    // 기존 값 제거
    if (this.keyToValue.has(key)) {
      const oldValue = this.keyToValue.get(key)!;
      this.valueToKey.delete(oldValue);
    }
    if (this.valueToKey.has(value)) {
      const oldKey = this.valueToKey.get(value)!;
      this.keyToValue.delete(oldKey);
    }

    this.keyToValue.set(key, value);
    this.valueToKey.set(value, key);
  }

  getValue(key: K): V | undefined {
    return this.keyToValue.get(key);
  }

  getKey(value: V): K | undefined {
    return this.valueToKey.get(value);
  }

  deleteByKey(key: K) {
    const value = this.keyToValue.get(key);
    if (value !== undefined) {
      this.keyToValue.delete(key);
      this.valueToKey.delete(value);
    }
  }

  deleteByValue(value: V) {
    const key = this.valueToKey.get(value);
    if (key !== undefined) {
      this.valueToKey.delete(value);
      this.keyToValue.delete(key);
    }
  }

  hasKey(key: K): boolean {
    return this.keyToValue.has(key);
  }

  hasValue(value: V): boolean {
    return this.valueToKey.has(value);
  }

  clear() {
    this.keyToValue.clear();
    this.valueToKey.clear();
  }

  keys(): IterableIterator<K> {
    return this.keyToValue.keys();
  }

  values(): IterableIterator<V> {
    return this.keyToValue.values();
  }

  entries(): IterableIterator<[K, V]> {
    return this.keyToValue.entries();
  }

  toKeyValueArray(): [K, V][] {
    return Array.from(this.keyToValue.entries());
  }

  toValueKeyArray(): [V, K][] {
    return Array.from(this.valueToKey.entries());
  }
}
