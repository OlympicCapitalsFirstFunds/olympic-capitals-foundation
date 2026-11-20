# Olympic Capitals First Funds Foundation website

A responsive static website with Cloudflare Pages Functions for grant application intake, private application tracking, and administrator status updates.

## Branding assets
The `assets/` directory contains the images supplied in the conversation. The third uploaded image is used as the foundation logo; images four to six are used as banners/pillar artwork; images seven to ten are the four leadership portraits in the supplied order. The first two images are displayed as collaborator marks. The second collaborator is named **Nova Trusted Finance**, following the supplied description.

## Important before public launch
This is a deployable project scaffold, not a live deployment. Configure and test the backend, email delivery, administrator access, privacy notice, application policies, eligibility, service area, and grant terms before accepting real applicant data. No registration statement is included. The application page states that applications are open, as instructed, but does not promise approval or funding.

## Cloudflare setup
1. Create a Cloudflare account and install Node.js/npm locally.
2. Create a Cloudflare Pages project and connect this folder through Git, or deploy with Wrangler.
3. Create a D1 database named `olympic-capitals-applications`.
4. Replace `REPLACE_WITH_YOUR_D1_DATABASE_ID` in `wrangler.toml` with the D1 database ID.
5. Run `npx wrangler d1 migrations apply olympic-capitals-applications --remote`.
6. Add these Cloudflare Pages environment bindings/secrets:
   - `APPLICATION_EMAIL` = `olympiccapitalafirstfunds@gmail.com`
   - `RESEND_API_KEY` = your Resend API key
   - `MAIL_FROM` = a sender address on a domain verified with Resend
   - `ADMIN_TOKEN` = a long, randomly generated secret
7. Deploy the Pages project and test submission, email delivery, tracking, and admin status updates before launch.

The official Gmail address can receive applications. Automated sending *from* that Gmail address is not provided by this Resend integration. For the sender address, use an email address on a domain verified with Resend, or replace the email adapter with an authorized Gmail API integration. Do not place API keys in frontend code or commit them to Git.

## Admin status updates
Send a POST request to `/api/admin/update` with:
`Authorization: Bearer YOUR_ADMIN_TOKEN`
and JSON:
`{"reference":"OCFF-2026-ABCDEF","status":"Under review","note":"Internal note","message":"Optional message for the applicant"}`

Allowed statuses: `Submitted`, `Under review`, `Additional information required`, `Approved`, `Declined`.

For production, place the admin operation behind Cloudflare Access or build a dedicated authenticated admin dashboard. The bearer-token endpoint is a backend starter, not a complete multi-user admin console. Never share the admin token with applicants.

## Routes
- `/` — foundation website
- `/api/applications` — application submission
- `/api/track` — private tracking
- `/api/admin/update` — protected status update endpoint

## Current application fields
Name, email, phone, country, pillar, applicant type, initiative title, description, and applicant consent. Grant amounts, eligibility, geography, deadlines and required supporting documents are intentionally not invented.


## Private admin page
Open `/admin.html` after deployment. Enter the `ADMIN_TOKEN` to load applications and update statuses. Restrict this page with Cloudflare Access before production use; the token is not a substitute for a full user-account system.


## Applicant scope and grant request range
- Intended applicant reach: all countries worldwide.
- Requested grant amounts: USD 10,000 to USD 1,000,000 (inclusive).
- The application form captures and validates the requested amount. Worldwide reach does not mean every applicant or proposal will qualify; publish clear eligibility, due-diligence, review, compliance and award terms before accepting live submissions.

## Free initial web address
Cloudflare Pages can publish the site on a free project subdomain in the form `https://<project-name>.pages.dev`. Choose a concise available project name such as `olympic-capitals-foundation`; the exact hostname is confirmed during deployment. A custom `.org` or `.com` domain can be connected later.
- https://developers.cloudflare.com/pages/
- https://developers.cloudflare.com/pages/platform/limits/

## Database migration
For a new D1 database, apply `migrations/0001_init.sql` followed by `migrations/0002_requested_amount.sql`. For an existing database that already has migration 0001 applied, apply only migration 0002.
