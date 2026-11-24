# Daily digest email setup (Resend)

ChaserPilot sends the daily digest from its own server over HTTPS (Render's free web
service blocks SMTP). Resend is the primary provider; Brevo works the same way
(`MAIL_PROVIDER=brevo`). Until this is done the app works normally and the in-app
"Today" page is the digest.

Steps (about 15 minutes, once):

1. Create a free account at resend.com.
2. In Resend, Domains > Add Domain > `wppluginpilot.com`.
3. Resend shows DNS records (SPF, DKIM, and optionally DMARC). In cPanel, open
   Zone Editor for wppluginpilot.com and add each record exactly as shown
   (type, name, value). Click Verify in Resend until the domain shows Verified.
4. In Resend, API Keys > Create API Key (permission: Sending access, domain
   wppluginpilot.com). Copy the key once.
5. In the Render dashboard for the `chaserpilot` service, Environment, set:
   - `MAIL_PROVIDER` = `resend`
   - `MAIL_API_KEY` = the key from step 4
   - `MAIL_FROM` = `ChaserPilot <digest@wppluginpilot.com>`
   Save; Render redeploys.

Notes
- Resend's free tier is enough for the digest (one email per paid store per day).
- Free Render services sleep after 15 minutes idle. The digest tick runs inside the
  server, so it only fires while the service is awake. Ping `/health` every 10
  minutes from a free cron service (for example cron-job.org) to keep it awake.
- Resend and Brevo are listed as email sub-processors in /privacy and /terms.
- Alternative: `MAIL_PROVIDER=brevo` with a Brevo API key and a verified sender.
- Local development: `MAIL_PROVIDER=smtp` with `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
  `SMTP_PASS`, `MAIL_FROM` (for example a local Mailpit).
