/**
 * indianVerification.js — structural/checksum validation for common Indian business and
 * tax identifiers (PAN, GSTIN, Udyam registration number).
 *
 * IMPORTANT — honest scope: this validates FORMAT and CHECKSUM only. It proves a string is
 * *shaped like* a real PAN/GSTIN/Udyam number and internally self-consistent; it does NOT
 * call any government registry and cannot confirm the number is actually registered, active,
 * or belongs to the entity that provided it. A "valid" result here means "this could plausibly
 * be real," not "we confirmed this with the government." Wiring in a live lookup (e.g. the
 * GST search portal) would need a signed API agreement and is future work, not implemented here.
 *
 * Use case in this app: SalesFlow lead intake and HireFlow employer-verification can run a
 * candidate/prospect-submitted PAN or GSTIN through here as a first-pass sanity filter before
 * a human ever looks at it — catching obviously fabricated numbers for free, deterministically,
 * with no network call and no LLM cost.
 */

// ── PAN (Permanent Account Number) ────────────────────────────────────────
// Format: AAAAA9999A — 5 letters, 4 digits, 1 letter. The 4th letter encodes holder type.
// This is public, documented structure (Income Tax Dept.); there is no checksum digit in PAN.
const PAN_HOLDER_TYPES = {
  P: "Individual",
  C: "Company",
  H: "Hindu Undivided Family (HUF)",
  F: "Firm / LLP",
  A: "Association of Persons (AOP)",
  T: "Trust",
  B: "Body of Individuals (BOI)",
  L: "Local Authority",
  J: "Artificial Judicial Person",
  G: "Government",
};

export function validatePAN(pan) {
  const clean = (pan || "").trim().toUpperCase();
  const match = /^([A-Z]{3})([A-Z])([A-Z])(\d{4})([A-Z])$/.exec(clean);
  if (!match) {
    return { valid: false, reason: "Does not match PAN format AAAAA9999A (5 letters, 4 digits, 1 letter)." };
  }
  const holderTypeCode = match[2];
  const holderType = PAN_HOLDER_TYPES[holderTypeCode];
  if (!holderType) {
    return { valid: false, reason: `4th character "${holderTypeCode}" is not a recognized PAN holder-type code.` };
  }
  return { valid: true, holderType, formatted: clean };
}

// ── GSTIN (Goods and Services Tax Identification Number) ──────────────────
// Format: 15 characters — 2-digit state code, 10-char PAN, 1 entity code, 1 'Z' (default), 1 checksum.
// Checksum algorithm: mod-36 check digit over a 36-character alphabet, documented and used by
// public open-source GSTIN validators (the algorithm predates and is independent of this project).
const GSTIN_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function gstinCheckDigit(first14) {
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const value = GSTIN_ALPHABET.indexOf(first14[i]);
    if (value === -1) return null;
    const factor = (i % 2 === 0) ? 1 : 2;
    let product = value * factor;
    product = Math.floor(product / 36) + (product % 36);
    sum += product;
  }
  const checksumValue = (36 - (sum % 36)) % 36;
  return GSTIN_ALPHABET[checksumValue];
}

export function validateGSTIN(gstin) {
  const clean = (gstin || "").trim().toUpperCase();
  if (!/^[0-9A-Z]{15}$/.test(clean)) {
    return { valid: false, reason: "GSTIN must be exactly 15 alphanumeric characters." };
  }
  const stateCode = clean.slice(0, 2);
  if (!/^\d{2}$/.test(stateCode) || Number(stateCode) < 1 || Number(stateCode) > 38) {
    return { valid: false, reason: `State code "${stateCode}" is out of the valid 01–38 range.` };
  }
  const embeddedPan = clean.slice(2, 12);
  const panCheck = validatePAN(embeddedPan);
  if (!panCheck.valid) {
    return { valid: false, reason: `Embedded PAN "${embeddedPan}" is not structurally valid: ${panCheck.reason}` };
  }
  const expectedCheck = gstinCheckDigit(clean.slice(0, 14));
  const actualCheck = clean[14];
  if (expectedCheck !== actualCheck) {
    return { valid: false, reason: `Checksum mismatch — expected "${expectedCheck}", got "${actualCheck}". This GSTIN is not internally consistent.` };
  }
  return { valid: true, stateCode, embeddedPan, holderType: panCheck.holderType, formatted: clean };
}

// ── Udyam Registration Number (MSME registration) ─────────────────────────
// Format: UDYAM-XX-00-0000000 (state code letters, 2-digit district/zone code, 7-digit serial).
// Format only — no public checksum algorithm is documented for Udyam numbers.
export function validateUdyam(udyam) {
  const clean = (udyam || "").trim().toUpperCase();
  const match = /^UDYAM-([A-Z]{2})-(\d{2})-(\d{7})$/.exec(clean);
  if (!match) {
    return { valid: false, reason: "Does not match Udyam format UDYAM-XX-00-0000000." };
  }
  return { valid: true, stateCode: match[1], zoneCode: match[2], serial: match[3], formatted: clean };
}
