import { describe, it, expect } from "vitest";
import { createKeyRotator } from "./groqKeyRotation.js";

describe("createKeyRotator", () => {
  it("returns empty string and zero count when no keys configured", () => {
    const r = createKeyRotator([]);
    expect(r.keyCount).toBe(0);
    expect(r.getKey()).toBe("");
    expect(r.getKey()).toBe("");
  });

  it("filters out falsy keys (undefined env vars)", () => {
    const r = createKeyRotator(["key1", undefined, "", null, "key2"]);
    expect(r.keyCount).toBe(2);
  });

  it("returns the single key every time when only one is configured", () => {
    const r = createKeyRotator(["only-key"]);
    expect(r.getKey()).toBe("only-key");
    expect(r.getKey()).toBe("only-key");
    expect(r.getKey()).toBe("only-key");
  });

  it("round-robins across multiple keys in order", () => {
    const r = createKeyRotator(["a", "b", "c"]);
    expect(r.getKey()).toBe("a");
    expect(r.getKey()).toBe("b");
    expect(r.getKey()).toBe("c");
    expect(r.getKey()).toBe("a"); // wraps around
  });

  it("nextIndex reflects the key that will be returned next, without advancing", () => {
    const r = createKeyRotator(["a", "b"]);
    expect(r.nextIndex).toBe(0);
    expect(r.nextIndex).toBe(0); // reading nextIndex must not advance the pointer
    r.getKey(); // consumes "a", advances pointer
    expect(r.nextIndex).toBe(1);
    r.getKey(); // consumes "b", wraps
    expect(r.nextIndex).toBe(0);
  });

  it("is independent per instance (no shared module-level state)", () => {
    const r1 = createKeyRotator(["x", "y"]);
    const r2 = createKeyRotator(["p", "q"]);
    r1.getKey();
    r1.getKey();
    // r2 should be unaffected by r1's calls
    expect(r2.getKey()).toBe("p");
  });
});
