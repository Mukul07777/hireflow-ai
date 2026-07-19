**Real-run log — 2026-07-19**

Executed `node scripts/real-run.mjs` against the live Groq API (`llama-3.3-70b-versatile`).
Real calls, real latency, real tokens — no mocks.

| Step | Latency | Tokens (in/out) |
|---|--:|--:|
| JD analysis | 433 ms | 110 / 75 |
| Bias audit | 1142 ms | 90 / 321 |
| SalesFlow email WITH Company Brain context | 1920 ms | 136 / 303 |
| CareFlow reply WITH Company Brain context | 916 ms | 155 / 203 |
| **Total** | **4411 ms** | **491 / 902** |

Measured cost for this run: **$0.00100 (≈ Rs 0.096)** at Groq's published
pricing ($0.59/M in, $0.79/M out; Rs 95.5/USD).

The Company Brain injected this cross-team context before the sales email was written:
> ✓ This exact contact is already known to Care
> ⚠️ They have an open complaint — align with Care before pitching

That context is produced deterministically by `lib/companyBrain.js` — it is identical on
every run and does not depend on the model.
