/** Clone before freezing: later UI edits cannot mutate an accepted transport request. */
export function immutableRequest<T>(request: T): T {
  const copy: T = structuredClone(request);
  function freeze(value: unknown): void {
    if (value && typeof value === "object") {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
  }
  freeze(copy);
  return copy;
}
