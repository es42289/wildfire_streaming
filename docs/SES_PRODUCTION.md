# Moving AWS SES Out of Sandbox (Production Access)

By default, SES is in **sandbox mode** — you can only send emails to verified addresses. To send alerts to any user's email, you need production access.

## Prerequisites

- Your sending domain (`wildfire-alert.eliiskeans.com`) is already verified with DKIM in SES
- You have a working send flow (verification emails, alert emails)

## Step 1: Request Production Access

1. Open the **AWS Console** > **SES** (make sure you're in **us-east-1**)
2. In the left sidebar, click **Account dashboard**
3. In the **Sending status** box, click **Request production access**
4. Fill out the form:

| Field | Recommended Value |
|-------|-------------------|
| **Mail type** | Transactional |
| **Website URL** | `https://wildfire-alert.eliiskeans.com` |
| **Use case description** | See below |
| **Additional contacts** | Your email address |
| **Preferred contact language** | English |
| **Acknowledgement** | Check the box |

### Use Case Description (copy/paste and adjust)

```
We operate a wildfire monitoring service at https://wildfire-alert.eliiskeans.com.
Users create "watch locations" on a map and provide their email address.
We send two types of transactional emails:

1. Email verification — sent once when a user creates a watch location,
   containing a one-click verification link. We will not send alerts
   until the user verifies.

2. Fire alert notifications — sent when NASA FIRMS satellite data detects
   a hotspot within the user's configured radius (5-50 miles).
   These are automated, time-sensitive safety notifications.
   Alerts are deduplicated (same hotspot won't trigger twice within 48 hours).

We do NOT send marketing emails. All emails are transactional and triggered
by user action or safety-critical fire detections. Users can deactivate
their watch locations at any time via a link in every email.

Expected volume: fewer than 100 emails per day initially.
```

5. Click **Submit request**

## Step 2: Wait for Approval

- AWS typically reviews within **24 hours** (sometimes faster)
- You'll receive an email at your AWS account's root email address
- If denied, they'll explain why — adjust your description and resubmit

## Step 3: Verify Approval

1. Go back to **SES > Account dashboard**
2. The **Sending status** should now say **Production** (no longer Sandbox)
3. You'll see your daily sending quota (usually starts at 50,000/day)

## Step 4: Set Up a Configuration Set (Optional but Recommended)

This helps you track bounces and complaints:

1. Go to **SES > Configuration sets**
2. Click **Create configuration set**
3. Name: `wildfire-alerts`
4. Add an **Event destination** for bounces and complaints:
   - Destination type: **SNS topic** (create one, e.g., `wildfire-ses-events`)
   - Events: Bounce, Complaint
5. Subscribe your email to the SNS topic so you get notified of issues

## Step 5: Add an Unsubscribe Link to Alert Emails

For good deliverability, every alert email should include a way to deactivate:

- The current alert emails already include a "View Live Map" link
- Consider adding a direct "Deactivate this watch location" link using the manage endpoint:
  `DELETE /alerts/watch/{location_id}`

## Important Notes

- **Bounce rate must stay below 5%** — if too many emails bounce, AWS can suspend your sending
- **Complaint rate must stay below 0.1%** — users marking your email as spam counts against you
- **Only send to verified/confirmed addresses** — the app already verifies emails via Auth0 or the verification link flow
- **Monitor your SES dashboard** regularly for bounce/complaint metrics
