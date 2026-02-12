# Auth0 Setup Guide

This guide walks through configuring Auth0 for the Wildfire Alert customer portal.

## 1. Create an Auth0 Tenant (if you don't have one)

1. Go to [auth0.com](https://auth0.com) and sign up / log in
2. If prompted, create a new tenant (e.g., `wildfire-alert`)
3. Select your region (US is fine)

## 2. Create a Single Page Application (SPA)

1. In the Auth0 Dashboard sidebar, go to **Applications > Applications**
2. Click **+ Create Application**
3. Name: `Wildfire Alert Portal`
4. Type: **Single Page Web Applications**
5. Click **Create**

### Configure the SPA Application

In the application's **Settings** tab, set:

| Field | Value |
|-------|-------|
| **Allowed Callback URLs** | `https://wildfire-alert.eliiskeans.com/dashboard, http://localhost:3000/dashboard` |
| **Allowed Logout URLs** | `https://wildfire-alert.eliiskeans.com, http://localhost:3000` |
| **Allowed Web Origins** | `https://wildfire-alert.eliiskeans.com, http://localhost:3000` |

Scroll down and click **Save Changes**.

**Note down** from the top of the Settings page:
- **Domain** (e.g., `your-tenant.us.auth0.com`)
- **Client ID** (e.g., `aBcDeFgH1234...`)

## 3. Create an API (Resource Server)

1. Go to **Applications > APIs**
2. Click **+ Create API**
3. Name: `Wildfire Alert API`
4. Identifier (Audience): `https://api.wildfire-alert.eliiskeans.com`
5. Signing Algorithm: **RS256**
6. Click **Create**

No further API configuration is needed. The identifier you chose is used as the `audience` parameter.

## 4. Enable Google Social Login

1. Go to **Authentication > Social**
2. Find **Google / Gmail** and click it (it may already be listed)
3. If not present, click **+ Create Connection** and select **Google**
4. Toggle the connection **ON** for your `Wildfire Alert Portal` application
5. For production, set up your own Google OAuth credentials:
   - Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Create an OAuth 2.0 Client ID
   - Set the Authorized redirect URI to: `https://YOUR_AUTH0_DOMAIN/login/callback`
   - Copy the Client ID and Client Secret into the Auth0 Google connection settings

> **Tip:** Auth0's dev keys work for testing but have rate limits. Set up your own Google credentials before going live.

## 5. Customize the Login Page (Optional)

1. Go to **Branding > Universal Login**
2. Choose the **New Universal Login Experience** (recommended)
3. Under **Colors**, set the primary color to `#ff6b35` to match the app theme
4. Add a logo if desired

## 6. Configure the Frontend Environment

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_AUTH0_DOMAIN=your-tenant.us.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=your-client-id-here
NEXT_PUBLIC_AUTH0_AUDIENCE=https://api.wildfire-alert.eliiskeans.com
```

Replace the values with what you noted in steps 2 and 3.

## 7. Deploy the Backend with Auth0 Parameters

Update your SAM deploy command to include Auth0 parameters:

```bash
cd infra
sam.cmd build
sam.cmd deploy --parameter-overrides \
  "DomainName=wildfire-alert.eliiskeans.com \
   CertificateArn=arn:aws:acm:us-east-1:983102014556:certificate/3810c60c-bb8d-4bd5-ae15-18e6b644e0a8 \
   AlertFromEmail=alerts@wildfire-alert.eliiskeans.com \
   Auth0Domain=your-tenant.us.auth0.com \
   Auth0Audience=https://api.wildfire-alert.eliiskeans.com"
```

## 8. Test the Flow

1. Run the frontend locally: `cd frontend && pnpm dev`
2. Go to `http://localhost:3000`
3. Click **Dashboard** or **Sign In**
4. You should see the Auth0 Universal Login page
5. Sign in with Google or create an account
6. You should be redirected to `/dashboard` with your user info visible
7. Try creating a watch location — it should save without email verification

## Troubleshooting

- **"Callback URL mismatch"** — Make sure the callback URLs in Auth0 exactly match your app URLs (no trailing slashes)
- **CORS errors** — Ensure `Allowed Web Origins` includes your frontend URL
- **401 from API** — Check that `Auth0Domain` and `Auth0Audience` in SAM match exactly what's in Auth0
- **Google login not showing** — Make sure the Google connection is toggled ON for your SPA application
