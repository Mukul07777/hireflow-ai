import { describe, it, expect } from "vitest";
import { validatePAN, validateGSTIN, validateUdyam } from "./indianVerification.js";

describe("validatePAN", () => {
  it("accepts a structurally valid individual PAN", () => {
    const r = validatePAN("AAPFU0939F");
    expect(r.valid).toBe(true);
    expect(r.holderType).toBe("Firm / LLP"); // 4th char 'F'
  });

  it("accepts lowercase input by normalizing to uppercase", () => {
    expect(validatePAN("aaapa1234c").valid).toBe(true);
  });

  it("rejects wrong length", () => {
    expect(validatePAN("AAAAA123A").valid).toBe(false);
  });

  it("rejects digits in the letter positions", () => {
    expect(validatePAN("1AAAA1234A").valid).toBe(false);
  });

  it("rejects an unrecognized holder-type code", () => {
    // 'Q' is not a documented PAN holder-type code
    expect(validatePAN("AAAQA1234A").valid).toBe(false);
  });
});

describe("validateGSTIN", () => {
  it("validates the standard public GSTIN test vector (27AAPFU0939F1ZV)", () => {
    const r = validateGSTIN("27AAPFU0939F1ZV");
    expect(r.valid).toBe(true);
    expect(r.stateCode).toBe("27");
    expect(r.embeddedPan).toBe("AAPFU0939F");
  });

  it("is case-insensitive", () => {
    expect(validateGSTIN("27aapfu0939f1zv").valid).toBe(true);
  });

  it("rejects a tampered checksum digit", () => {
    // last char flipped from the valid V
    const r = validateGSTIN("27AAPFU0939F1ZA");
    expect(r.valid).toBe(false);
    expect(r.reason).toMatch(/checksum/i);
  });

  it("rejects wrong length", () => {
    expect(validateGSTIN("27AAPFU0939F1Z").valid).toBe(false);
  });

  it("rejects an out-of-range state code", () => {
    // 99 is not an allocated Indian state/UT code
    const r = validateGSTIN("99AAPFU0939F1Z9");
    expect(r.valid).toBe(false);
  });

  it("rejects a structurally invalid embedded PAN", () => {
    // digits where PAN letters should be
    const r = validateGSTIN("2711111111111ZV");
    expect(r.valid).toBe(false);
    expect(r.reason).toMatch(/PAN/);
  });
});

describe("validateUdyam", () => {
  it("accepts a well-formed Udyam number", () => {
    const r = validateUdyam("UDYAM-KA-03-0012345");
    expect(r.valid).toBe(true);
    expect(r.stateCode).toBe("KA");
  });

  it("is case-insensitive", () => {
    expect(validateUdyam("udyam-mh-01-0000001").valid).toBe(true);
  });

  it("rejects wrong serial length", () => {
    expect(validateUdyam("UDYAM-KA-03-12345").valid).toBe(false);
  });

  it("rejects missing UDYAM prefix", () => {
    expect(validateUdyam("KA-03-0012345").valid).toBe(false);
  });
});
