# Security policy

## Reporting a vulnerability

**Do not** open a public issue for security vulnerabilities.

Email the maintainers at `security@openride.example` (replace with your fork's address) with:
- A description of the issue and where you found it.
- Steps to reproduce, including any proof-of-concept code.
- The impact you believe it has.

We will acknowledge within 72 hours and aim to ship a fix or mitigation within 14 days for critical issues. We will credit reporters in release notes unless asked otherwise.

## In scope

- Authentication & authorisation bypass (Auth, RLS, Edge Functions).
- Data exfiltration via PostgREST or Storage.
- Payment manipulation (Stripe webhook signature, refund logic).
- PII exposure in logs, audit trail, or backups.
- Supply chain (lockfile, build pipeline).

## Out of scope

- Vulnerabilities in third-party services (Supabase, Stripe, Twilio) themselves — report those to the vendor.
- Social engineering of operators or end users.
- DOS / volumetric attacks against demo environments.

## Compliance disclaimer

OpenRide stores the records an operator needs to demonstrate compliance. The operator remains the regulated entity. Self-hosting OpenRide does not transfer, share, or absolve statutory obligations under transport, privacy, or consumer protection law.
