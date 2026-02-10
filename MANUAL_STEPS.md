# Manual Steps — Wildfire Live Map

Steps that require action outside the IDE (installs, AWS console, browser, etc.).
Updated as we work through each phase. Only final working steps — no dead ends.

---

## Phase 0.1 — Dev Environment

### Step 1: Install pnpm (Node package manager)

Open a terminal and run:

```powershell
npm install -g pnpm
```

Verify:
```powershell
pnpm --version
```

### Step 2: Install AWS SAM CLI

Download and run the MSI installer from:
```
https://github.com/aws/aws-sam-cli/releases/latest
```

Look for the file named `AWS_SAM_CLI_64_PY3.msi` (or similar Windows .msi).

After install, **close and reopen your terminal**, then verify:
```powershell
sam --version
```

Expected output: `SAM CLI, version 1.x.x`

### Step 3: Configure AWS CLI profile for personal account

You already have an AWS CLI profile for work. We'll create a separate named profile for your personal AWS account.

**3a.** Log into your personal AWS account in the browser (the one you want to use for this project).

**3b.** Create an IAM user for CLI access:

1. In the AWS Console, type **IAM** in the top search bar → click **IAM**
2. In the left sidebar, click **Users**
3. Click the **Create user** button (top right)
4. **User name:** `wildfire-dev` → click **Next**
5. On the "Set permissions" page:
   - Select **Attach policies directly**
   - In the search box, type `AdministratorAccess`
   - Check the box next to **AdministratorAccess** (the one by AWS, not any custom ones)
   - Click **Next**
6. Review page — click **Create user**
7. You'll land back on the Users list. Click on **wildfire-dev** (the user you just created)
8. Click the **Security credentials** tab
9. Scroll down to **Access keys** → click **Create access key**
10. Select **Command Line Interface (CLI)**
11. Check the confirmation checkbox at the bottom, click **Next**
12. Description tag (optional): `wildfire project` → click **Create access key**
13. **IMPORTANT:** You are now on the "Retrieve access keys" page. Copy both values:
    - **Access Key ID** (starts with `AKIA...`)
    - **Secret Access Key** (only shown once — copy it now or download the CSV)
14. Click **Done**

**3c.** Configure the profile:
```powershell
aws configure --profile wildfire
```
It will prompt you for:
- **AWS Access Key ID:** (paste from step 3b)
- **AWS Secret Access Key:** (paste from step 3b)
- **Default region name:** `us-east-1`
- **Default output format:** `json`

**3d.** Verify it works:
```powershell
aws sts get-caller-identity --profile wildfire
```
You should see your account ID and the `wildfire-dev` user ARN.

### Step 4: Create Python virtual environment

Run from the project root (`C:\Users\EliiS\Documents\PD\streaming`):

```powershell
python -m venv .venv
.venv\Scripts\activate
```

Then install base dev tooling:
```powershell
pip install --upgrade pip
pip install ruff pytest boto3
```

Verify:
```powershell
python --version
pip list
```
Should show `Python 3.12.x` and the installed packages.

### Step 5: Verify Docker is running

```powershell
docker info
```

If Docker Desktop isn't running, start it. SAM uses Docker for local Lambda testing.

---

### Phase 0.1 Checklist

| # | Item | Status |
|---|------|--------|
| 1 | pnpm installed | [x] pnpm 10.29.2 |
| 2 | SAM CLI installed | [x] |
| 3 | AWS CLI `wildfire` profile configured | [x] wildfire-dev user |
| 4 | Python `.venv` created and activated | [x] Python 3.12.11, ruff/pytest/boto3 |
| 5 | Docker running | [x] Docker Desktop 28.5.1 |

---

## Phase 0.2 — AWS Account Hardening

### Step 6: Create monthly budget (done via CLI)

Created a $20/month budget with email alerts:
- **80% threshold** ($16) → email to es42289@gmail.com
- **100% threshold** ($20) → email to es42289@gmail.com

```powershell
aws budgets create-budget --account-id 983102014556 --profile wildfire --budget '{"BudgetName":"wildfire-monthly","BudgetLimit":{"Amount":"20","Unit":"USD"},"TimeUnit":"MONTHLY","BudgetType":"COST"}' --notifications-with-subscribers '[{"Notification":{"NotificationType":"ACTUAL","ComparisonOperator":"GREATER_THAN","Threshold":80,"ThresholdType":"PERCENTAGE"},"Subscribers":[{"SubscriptionType":"EMAIL","Address":"es42289@gmail.com"}]},{"Notification":{"NotificationType":"ACTUAL","ComparisonOperator":"GREATER_THAN","Threshold":100,"ThresholdType":"PERCENTAGE"},"Subscribers":[{"SubscriptionType":"EMAIL","Address":"es42289@gmail.com"}]}]'
```

### Step 7: Confirm home region

Region: **us-east-1** (required for CloudFront ACM certs, cheapest Lambda pricing).

---

### Phase 0.2 Checklist

| # | Item | Status |
|---|------|--------|
| 6 | Budget created ($20/month, email alerts) | [x] |
| 7 | Home region confirmed (us-east-1) | [x] |
| 8 | IAM user for dev work | [x] wildfire-dev (done in Phase 0.1 Step 3) |

---

## Phase 0.3 — Domain & SSL

### Step 8: Request ACM certificate (done via CLI)

Requested ACM cert for `eliiskeans.com` + `*.eliiskeans.com` (covers `wildfire-stream.eliiskeans.com`):

```powershell
aws acm request-certificate --domain-name "eliiskeans.com" --subject-alternative-names "*.eliiskeans.com" --validation-method DNS --region us-east-1 --profile wildfire
```

**Certificate ARN:** `arn:aws:acm:us-east-1:983102014556:certificate/df2d1cc3-5c16-465c-9650-ff1349780385`

### Step 9: Add ACM DNS validation CNAME in Cloudflare

In Cloudflare dashboard → `eliiskeans.com` → **DNS** → **Records** → **Add record**:

| Field | Value |
|-------|-------|
| Type | **CNAME** |
| Name | `_d2fbdaad136be44c921f7c3c3150aa61` |
| Target | `_a13d849de09cdff5a5c761ac28c8d1d0.jkddzztszm.acm-validations.aws` |
| Proxy status | **DNS only (gray cloud)** |

### Step 10: Add CloudFront CNAME in Cloudflare (after Phase 0.4)

After CloudFront distribution is created, add:

| Field | Value |
|-------|-------|
| Type | **CNAME** |
| Name | `wildfire-stream` |
| Target | `dn877qyz12afe.cloudfront.net` |
| Proxy status | **DNS only (gray cloud)** |

---

### Phase 0.3 Checklist

| # | Item | Status |
|---|------|--------|
| 8 | ACM cert requested (eliiskeans.com + wildcard) | [x] ISSUED |
| 9 | DNS validation CNAME added in Cloudflare | [x] |
| 10 | CloudFront CNAME in Cloudflare | [x] wildfire-stream → dn877qyz12afe.cloudfront.net |

---

## Phase 0.4 — Infrastructure-as-Code Setup

SAM template deployed via CLI. No manual steps required.

**Stack name:** `wildfire-live-map`
**Region:** `us-east-1`

### Resources created

| Resource | Value |
|----------|-------|
| Web S3 bucket | `wildfire-live-map-webbucket-cew3uhjzddb9` |
| Data S3 bucket | `wildfire-live-map-databucket-re3ujeeyvbx7` |
| CloudFront distribution | `E2YM1PTBECA1S6` |
| CloudFront domain | `dn877qyz12afe.cloudfront.net` |
| Public URL | `https://wildfire-stream.eliiskeans.com` |

### Phase 0.4 Checklist

| # | Item | Status |
|---|------|--------|
| 11 | SAM template created (`infra/template.yaml`) | [x] |
| 12 | S3 buckets provisioned (web + data) | [x] |
| 13 | CloudFront distribution with OAC | [x] |
| 14 | Domain alias + ACM cert on CloudFront | [x] |
| 15 | Placeholder page live at public URL | [x] verified |
