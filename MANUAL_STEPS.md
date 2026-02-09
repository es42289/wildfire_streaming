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

**3b.** Create an IAM user for CLI access (if you haven't already):
1. Go to **IAM Console** → Users → Create User
2. User name: `wildfire-dev` (or whatever you prefer)
3. Attach policy: `AdministratorAccess` (fine for a personal dev account; we can scope it down later)
4. Go to the user → **Security credentials** tab → **Create access key**
5. Choose "Command Line Interface (CLI)"
6. Save the **Access Key ID** and **Secret Access Key** — you'll need them in the next step

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
| 1 | pnpm installed | [ ] |
| 2 | SAM CLI installed | [ ] |
| 3 | AWS CLI `wildfire` profile configured | [ ] |
| 4 | Python `.venv` created and activated | [ ] |
| 5 | Docker running | [ ] |
