/**
 * indiaComplianceRules.js — deterministic, rule-based checks for job-description language
 * patterns that are specifically relevant under Indian employment law and hiring norms,
 * as a companion to (not a replacement for) the LLM-generated bias audit.
 *
 * Why this exists: the LLM bias check in App.jsx re-runs a general-purpose "check for bias"
 * prompt every time and can phrase/miss things differently call to call. These checks are
 * regex-based, deterministic, and reproducible — the same JD always produces the same flags,
 * which matters for something a company might rely on before publishing a job ad.
 *
 * IMPORTANT — this is NOT legal advice and does NOT certify legal compliance. It flags
 * commonly-cited problem patterns for human review. Consult an actual employment lawyer
 * before relying on any JD for compliance purposes.
 */

const RULES = [
  {
    id: "age-proxy",
    severity: "high",
    pattern: /\b(age\s*(below|under|less than)\s*\d{2}|young(?:\s+and)?\s+dynamic|fresh(?:er)?s?\s+only|recent\s+graduates?\s+only)\b/i,
    message: (match) => `Age-proxy language detected ("${match}") — phrasing that implies an age preference can be read as age discrimination, a live concern under Indian labor law even though India lacks a single omnibus age-discrimination statute; several state Shops & Establishments Acts and case law treat this as actionable.`,
  },
  {
    id: "gendered-title",
    severity: "medium",
    pattern: /\b(salesman|waiter|watchman|foreman|chairman|manpower)\b/i,
    message: (match) => `Gendered job title/term ("${match}") — the Equal Remuneration Act, 1976 and its successor provisions under the Code on Wages require non-discriminatory language; use "salesperson," "server," "security guard," "chairperson," "workforce" instead.`,
  },
  {
    id: "gender-pronoun-exclusive",
    severity: "medium",
    pattern: /\b(he\s+must|he\s+will\s+be|his\s+responsibilities|she\s+must|she\s+will\s+be|her\s+responsibilities)\b/i,
    message: (match) => `Gender-specific pronoun used for the role ("${match}") instead of neutral phrasing ("they"/"the candidate") — implies a preferred gender for the position.`,
  },
  {
    id: "posh-missing-statement",
    severity: "low",
    pattern: null, // handled specially: flags when the JD is silent, not when a pattern matches
    message: () => `No equal-opportunity / POSH-compliance statement detected. Companies with 10+ employees are required under the POSH Act, 2013 to have a functioning Internal Committee — job postings commonly include a short equal-opportunity-employer line; its absence isn't a violation by itself but is worth adding.`,
  },
  {
    id: "salary-secrecy",
    severity: "low",
    pattern: /\b(salary\s+(is\s+)?confidential|do\s+not\s+disclose\s+(salary|compensation)|compensation\s+is\s+confidential)\b/i,
    message: (match) => `Salary-secrecy clause detected ("${match}") — while not illegal in India the way pay-secrecy bans work in some US states, it conflicts with the pay-transparency norms increasingly expected by candidates and with this platform's own "Transparency" scoring dimension.`,
  },
  {
    id: "excessive-experience-requirement",
    severity: "medium",
    pattern: /\b(\d{2,})\+?\s*years?\s+(of\s+)?experience\b/i,
    message: (match) => `Numeric experience requirement of ${match} detected — cross-check this is actually necessary for the role level; over-specification is one of the most common ways JDs unintentionally filter out otherwise qualified candidates (particularly women returning from career breaks, a well-documented pattern in Indian hiring data).`,
  },
];

/**
 * Runs all deterministic rules against a JD and returns structured flags.
 * @param {string} jdText
 * @returns {{id:string, severity:'high'|'medium'|'low', message:string}[]}
 */
export function runIndiaComplianceCheck(jdText) {
  const text = jdText || "";
  const flags = [];

  for (const rule of RULES) {
    if (rule.id === "posh-missing-statement") {
      const hasStatement = /\b(equal\s+opportunity|posh|prevention\s+of\s+sexual\s+harassment)\b/i.test(text);
      if (!hasStatement && text.trim().length > 0) {
        flags.push({ id: rule.id, severity: rule.severity, message: rule.message() });
      }
      continue;
    }
    const match = text.match(rule.pattern);
    if (match) {
      flags.push({ id: rule.id, severity: rule.severity, message: rule.message(match[0]) });
    }
  }

  return flags;
}

/** Formats deterministic flags as plain strings, for merging into the existing flags array. */
export function formatComplianceFlags(flags) {
  return flags.map((f) => `[India compliance — ${f.severity}] ${f.message}`);
}
