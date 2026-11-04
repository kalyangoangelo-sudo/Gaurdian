# GuardianLink — Business Model

---

## Mission

GuardianLink protects children online by combining real-time parental oversight, a confidential reporting pathway that does not require adult mediation, and a professional case management interface for the NGOs, schools, and government agencies that respond to reports of online abuse.

Child safety infrastructure is a public good. The platform's free tier is permanent, not a trial.

---

## Target Customers

### Primary (direct revenue)

| Segment | Description | Plan |
|---|---|---|
| **Families** | Parents in Uganda and East Africa seeking real-time protection and reporting tools for their children | Family Premium |
| **Schools (K-12)** | Primary and secondary schools that need centralized monitoring, caseworker access, and a duty-of-care reporting trail | School Starter or Institutional |
| **NGOs and child protection organizations** | Organizations such as Terre des Hommes, Save the Children Uganda, and ANPPCAN that manage child protection casework | Institutional |
| **Government agencies** | Ministry of ICT, Uganda Police Force Child Protection Unit, National Council for Children — agencies with a statutory mandate under the Children's Act 2016 | Institutional / Government partnership |

### Secondary (indirect value)

| Segment | Value |
|---|---|
| **Children themselves** | Free, no-login reporting pathway; bilingual (English + Luganda) |
| **Teachers and school counsellors** | Teacher role enables institutional reporting without requiring a child to self-report |
| **Caseworkers** | Purpose-built case management interface; no generic CRM workarounds |

---

## Value Proposition

| Stakeholder | Problem today | GuardianLink solution |
|---|---|---|
| Parent | No visibility into what their child encounters online; no structured way to act when a child reports distress | Real-time SafeSignal alerts, content filtering, device heartbeat, direct caseworker referral |
| Child | Must involve a trusted adult to report abuse; fears disbelief or punishment | Anonymous reporting with a recovery code; no login required; bilingual interface |
| School | Duty-of-care obligation but no reporting infrastructure; reliant on paper forms | Teacher-assisted reports with AI triage; caseworker dashboard; audit trail |
| NGO / agency | Reports arrive via WhatsApp or phone; no structured intake; no evidence integrity | Structured intake, PII tokenization, SHA-256 evidence hashing, simulated referral pipeline |
| Caseworker | Working across multiple spreadsheets; no priority scoring; no audit trail | AI-prioritized case queue, human override, immutable audit trail, status lifecycle |

---

## Pricing

Pricing is expressed in Ugandan Shillings (UGX). Approximate USD equivalents are indicative.

| Plan | Monthly Price | Annual Price | Target |
|---|---|---|---|
| **Free** | UGX 0 | UGX 0 | Individuals, community members, anyone reporting abuse |
| **Family Premium** | UGX 10,000 (~USD 2.70) | UGX 100,000 (~USD 27) | Families — up to 2 child profiles |
| **School Starter** | UGX 100,000 (~USD 27) | UGX 1,000,000 (~USD 270) | Schools — up to 50 student profiles |
| **NGO / Institutional** | Custom | Custom | Unlimited profiles; dedicated support; SLA |

### Free tier inclusions (permanent, not time-limited)

- Anonymous public reporting (`POST /reports/anonymous`)
- Case status tracking via recovery code
- Basic child safety tips
- Bilingual interface (English + Luganda)

### Family Premium inclusions

Everything in Free, plus:
- Real-time SafeSignal alerts (child-initiated reports to parent)
- Content filtering with custom keyword policy
- Device heartbeat monitoring (ACTIVE / OFFLINE)
- Parent-child pairing and access request management
- Priority case handling

### School Starter inclusions

Everything in Family Premium, plus:
- Up to 50 student profiles
- Dedicated caseworker account and dashboard
- Teacher-assisted reporting
- Monthly aggregated safety report
- School admin dashboard

### NGO / Institutional inclusions

Everything in School Starter, plus:
- Unlimited profiles
- Custom API integrations
- Training and onboarding sessions
- Dedicated support team
- SLA guarantee
- White-label option (on request)

---

## Revenue Model

### Subscription revenue (primary)

Recurring monthly or annual subscriptions via MTN Mobile Money (primary payment method in Uganda), Airtel Money, or card payment via Flutterwave.

Revenue projection (illustrative):

| Year | Assumed subscribers | Assumed mix | Monthly ARR |
|---|---|---|---|
| Year 1 | 500 families, 10 schools, 2 NGOs | 80% Family, 15% School, 5% NGO | ~UGX 6.5M (~USD 1,750) |
| Year 2 | 2,000 families, 50 schools, 10 NGOs | 70% Family, 25% School, 5% NGO | ~UGX 33M (~USD 8,900) |
| Year 3 | 8,000 families, 200 schools, 30 NGOs | 60% Family, 35% School, 5% NGO | ~UGX 140M (~USD 38,000) |

### Grant and partnership revenue (secondary)

Child protection technology is fundable through:

- **UNICEF Innovation Fund** — technology for child protection, education, and inclusion
- **Google.org** — technology for social impact
- **Uganda Communications Commission (UCC)** — digital safety mandates under the Electronic Transactions Act and National ICT Policy
- **FCDO / USAID** — child protection programming in East Africa
- **NDP III** — Uganda's National Development Plan III includes digital transformation and child welfare as priority investment areas

### Data and insights (future, privacy-preserving)

Aggregated, anonymized trend reports (category frequencies, regional hotspots, peak reporting times) provided to government agencies and NGOs on a subscription basis. No individual-level data is shared.

---

## Cost Structure

| Category | Notes |
|---|---|
| Infrastructure | Node.js server on Railway or Render (~$7/mo at launch); scales vertically before horizontal sharding is needed |
| Firebase | Spark (free) plan adequate at launch; Blaze pay-as-you-go for FCM at scale |
| EAS Build | Free tier for development APKs; ~$29/mo for production build concurrency |
| Localization | Luganda translations maintained in-house; community contribution model for additional languages |
| Customer support | 1 FTE support agent at Year 1; automated triage at Year 2 |
| Caseworker training | One-day onboarding workshop per institutional client; train-the-trainer model for NGOs |

---

## Sustainability

### Near-term (Year 1)

- Launch as a free-tier-first platform to maximize adoption among the children and families who need it most.
- Seed revenue through school and NGO contracts, which have procurement budgets and a clear duty-of-care justification.
- Apply for UNICEF Innovation Fund or UCC digital safety grant to cover infrastructure and localization costs.

### Medium-term (Year 2–3)

- Introduce Family Premium with MTN MoMo billing; low price point (~UGX 10,000) targets the growing Ugandan middle class.
- Expand localization to Swahili and Acholi to cover northern Uganda and Kenya.
- Build referral integrations with Uganda Police Force Directorate of Criminal Investigations (child protection desk) and ANPPCAN.

### Long-term (Year 4+)

- Expand to Kenya, Tanzania, and Rwanda (common regulatory frameworks under the East African Community).
- Open API for third-party child protection applications to integrate the reporting and triage layer.
- Pursue ISO 27001 certification to support government procurement requirements.

---

## Social Impact Alignment

### UNICEF Convention on the Rights of the Child (CRC)

- **Article 19** — Protection from all forms of abuse. GuardianLink provides a structured reporting pathway and professional case management.
- **Article 16** — Right to privacy. Anonymous reporting and bcrypt-hashed recovery secrets protect the child's identity.
- **Article 17** — Access to information. The free tier and bilingual interface ensure the platform is accessible regardless of economic status.

### Uganda NDP III (2020/21–2024/25)

- Programme 19: Human Capital Development — digital literacy and child welfare.
- Programme 14: Governance and Security — crime prevention and the Children's Act 2016 enforcement.
- GuardianLink's school-tier reporting infrastructure directly supports the Ministry of Education's duty-of-care obligations.

### UN Sustainable Development Goals

| Goal | Alignment |
|---|---|
| SDG 16.2 — End abuse, exploitation, trafficking, and violence against children | Core mission |
| SDG 4 — Quality education | School-tier safety infrastructure enables learning environments free from online harm |
| SDG 10 — Reduced inequalities | Free tier ensures the platform is accessible to children regardless of family income |
| SDG 17 — Partnerships | Open API and NGO pricing model designed for multi-stakeholder collaboration |

---

*GuardianLink — Stage 9 business model document.*
