# AI Chat History

---

**User:** Please read the ai_ground_rules doc and then read the project outline. I have an AWS account I can use. I have a domain I want to use (www.eliiskeans.com). Let's start by creating a development plan. Let's break it down into logical chunks and save this as a new document we can reference and continue to work off of.

**AI (🍀):** Read both documents. Created `DEVELOPMENT_PLAN.md` with 7 phases (Phase 0–6) covering: AWS bootstrap & domain setup, UI skeleton, data ingest, incident formation, WebSocket live push, replay mode, and polish. The plan follows the milestones from the project outline (M0–M4) with a Phase 0 for infrastructure foundation and a Phase 6 for polish. Includes a decision log and open questions about DNS registrar, IaC tool preference (SAM vs CDK), map styling, and CI/CD tooling. Branched off main to `dev-plan` per ground rules.

---

**User:** 1. Domain is on Namecheap, using Cloudflare for DNS. 2. Doesn't know SAM or CDK, looking for best practice. 3. GitHub Actions sounds great, first CI/CD. 4. Dark style sounds great.

**AI (🍀):** Resolved all open questions and updated DEVELOPMENT_PLAN.md:
- **DNS:** Keep Cloudflare. Add CNAME records for ACM validation and CloudFront. Flagged that Cloudflare proxy (orange cloud) must be set to DNS-only (gray cloud) mode to avoid conflicts with CloudFront.
- **IaC:** SAM — best practice for Lambda-centric serverless. Declarative YAML, `sam local invoke` for local testing, maps 1:1 to CloudFormation so you learn real AWS primitives without abstraction overhead. CDK is better for large teams/complex infra but overkill here.
- **CI/CD:** GitHub Actions — ci.yml for lint+test on PR, deploy.yml for build+deploy on merge to main.
- **Map style:** Dark basemap (Carto Dark Matter or similar).
- Removed Open Questions section, updated Decision Log to reflect all decisions as finalized.

---

**User:** Let's kick off Phase 0.1. Also create a document to catalogue all manual steps as we go. Keep steps clean — only final working steps, no circuitous troubleshooting.

**AI (🍀):** Checked local environment. Found: Python 3.12 (miniforge/conda), Node 24, npm, AWS CLI v2, Docker, Git all installed. Missing: pnpm and SAM CLI. AWS CLI has a work profile but no personal profile configured. Created `MANUAL_STEPS.md` with 5 steps for Phase 0.1: install pnpm, install SAM CLI, configure AWS personal profile (`wildfire`), create conda virtual env (`wildfire`), verify Docker.
