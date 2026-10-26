# Deploy Garmin Wrapped to Cloudflare

Production URL: **https://garmin-wrapped.miniwatt.app**  
Cloudflare Worker name: **garmin-wrapped**

This is a full-stack **Cloudflare Worker with Static Assets**, not a static Pages upload. The Worker exchanges each visitor's own Garmin key, fetches their records and keeps their access token in an encrypted, short-lived browser cookie. No Sites login, database, R2 bucket or shared Garmin key is required.

## First deployment

1. Use the Cloudflare account that manages the active `miniwatt.app` zone. The `garmin-wrapped` hostname must be available for a Worker Custom Domain. If it already has a conflicting CNAME, review that record before replacing it. The domain in `wrangler.cloudflare.jsonc` makes Cloudflare provision the subdomain and HTTPS certificate during deployment; do not point it at a Pages project.
2. Open a terminal in this project and use Node **24.21.0** (`nvm use` if you use nvm). Install and sign in:

   ```sh
   npm ci
   npx wrangler login
   npx wrangler whoami
   ```

   If your login has multiple accounts, set `CLOUDFLARE_ACCOUNT_ID` to the account that owns `miniwatt.app`. For token-based deployment, provide `CLOUDFLARE_ACCOUNT_ID` and a scoped `CLOUDFLARE_API_TOKEN` through your environment instead of logging in. Cloudflare's [Workers token guide](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/) describes the required Worker and zone permissions.

3. Build and deploy:

   ```sh
   npm run deploy:cloudflare
   ```

   This builds for the public domain, checks the generated configuration and uploads the Worker and assets together. The demo is available immediately. Real Garmin connections fail safely until the session secret is set in the next step.

4. Create the encryption secret once. This command generates 32 random bytes and sends them directly to Cloudflare without printing them or saving them in the project:

   ```sh
   node --input-type=module -e 'import {randomBytes} from "node:crypto"; process.stdout.write(randomBytes(32).toString("base64url"))' | npm run secret:cloudflare
   ```

   This updates the existing Worker's secret and deployment. Keep the same secret across later deployments. Repeating this command rotates it and invalidates active connections. Do not set `DEV_GARMIN_API_KEY` in production, and never upload `.dev.vars` or `audit.py`.

5. Open https://garmin-wrapped.miniwatt.app and complete the acceptance checks below. Certificate issuance can take a little time on the first deployment.

## What is already configured

- Custom Domain `garmin-wrapped.miniwatt.app`; `workers.dev` and deployment preview URLs are disabled.
- `AUTH_MODE=visitor`: no Sites account is required. Each browser receives a separately encrypted 20-minute session only after it submits its own Garmin key. Platform identity headers have no authority in visitor mode.
- `PUBLIC_ORIGIN=https://garmin-wrapped.miniwatt.app`: state-changing requests must originate from that exact domain.
- `GARMIN_MODE=personal`: the current bring-your-own-key integration. Set it to `disabled` and redeploy to suspend new imports while retaining the demo.
- Cloudflare rate-limit bindings: six connection attempts and 600 data requests per minute per IP at each Cloudflare location. Cloudflare documents these as approximate, location-scoped limits, not a strict global quota. Counters use an IP hash; the application does not log IPs. Namespace IDs `73151001` and `73151002` should remain unique to this app in the account.
- Secure, HttpOnly, SameSite=Strict cookies; same-origin POST enforcement; no-store API and HTML responses; content security policy; redacted application errors. Default invocation logs are disabled. Cloudflare still processes requests and has provider-level infrastructure logs.
- Canonical URL, social metadata, favicon, robots file and sitemap.
- Build verification rejects the wrong deployment target, missing rate-limit bindings and local secret files. Local secret copies produced by Vite are removed from the build before distribution.

Tabs in one browser share its connection cookie. Connect one Garmin account at a time in that browser. Different visitors' browsers have separate cookies. Records and the resulting recap stay in tab memory and are cleared on reload, disconnect or close. No credentials or records are written to durable application storage.

## Garmin launch scope

The implementation is prepared for independent visitors bringing their own keys. This does not establish Garmin's approval for a public or commercial service. Garmin's [Personal API FAQ](https://developer.garmin.com/gc-developer-program/personal/personal-faq/) says it is intended for individuals accessing their own data and is not intended for commercial applications serving multiple end users. Resolve the integration terms with Garmin before a commercial launch; an approved business integration would require a separate OAuth implementation. The code does not claim that such approval or OAuth support exists.

## Verify before release

```sh
npm run check -- --public
npm run typecheck
npm test
npm run deploy:cloudflare:dry-run
npm run dev:cloudflare
```

The dry run builds and validates the upload locally; it does not publish or need account credentials. In a separate terminal, run browser coverage against that development server:

```sh
npx playwright install chromium webkit
E2E_BASE_URL=http://127.0.0.1:5173 npm run test:e2e
```

For a local preview of the exact production bundle, use `npm run preview:cloudflare`. Its origin remains the production domain by default, so local real imports are intentionally rejected. For a temporary local-only smoke check, override it explicitly:

```sh
npm run preview:cloudflare -- --var PUBLIC_ORIGIN:http://127.0.0.1:8787
```

Supply a test `SESSION_SECRET` with `--var` or an ignored `dist/server/.dev.vars` only for local preview. Remove that file before `npm run check:cloudflare` or deployment. Use `dev:cloudflare` for everyday local development, which reads the root `.dev.vars` and uses the local origin automatically.

After deployment:

1. `/api/health` returns `{"status":"ok","version":"1.0.0"}`. This checks liveness, not Garmin or secret readiness.
2. The homepage, images, favicon, styles and demo work without a Sites sign-in.
3. Connect your own key, compare activity totals with Garmin and export a 1080×1920 card. Health cards require their own export confirmation.
4. Use a second browser or private window with a different key to confirm independent sessions. Refresh and clear data to confirm the recap disappears.
5. Confirm `/api/activities` without a valid cookie returns 401; a cross-origin POST returns 403. Test with fictional inputs rather than publishing a real key in a terminal command.

Automated API and browser tests use fictional records. They do not establish live Garmin connectivity, history entitlement or physical-phone native sharing after this deployment.

## Cloudflare dashboard / Git builds

Connect the repository in **Workers & Pages → Create → Import a repository**. Choose **Workers**, with Worker name `garmin-wrapped`.

| Setting | Value |
| --- | --- |
| Root directory | Repository root, or `track-record-stories` if the repository contains its parent folder |
| Node version | `24.21.0` (build variable `NODE_VERSION` if needed) |
| Build command | `npm run build:cloudflare` |
| Deploy command | `npm run deploy:cloudflare:built` |
| Production branch | Your release branch |
| Non-production branch deployments | Disable until a separate staging domain and configuration exist |
| Runtime secret | `SESSION_SECRET`, a random string of at least 43 characters |

Cloudflare installs the locked npm dependencies. Configure the secret as a **runtime** Worker secret, not merely a build variable. The first CLI deployment above is the easiest way to provision the Worker and its secret before enabling Git builds. Check [Cloudflare Builds settings](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/) for the current dashboard labels.

## Optional GitHub deployment

The included **Deploy Garmin Wrapped to Cloudflare** workflow is manual (`workflow_dispatch`). After provisioning the runtime secret once, add `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` to the GitHub `production` environment, then run the workflow from Actions. It runs source checks, type checking, tests, the production dependency audit and browser coverage before building and deploying. Do not run both GitHub deployment and Cloudflare Git Builds for the same commits.

The existing release-check workflow also verifies the Cloudflare build with an offline deployment dry run.

## Updates, monitoring and rollback

- Later local releases: `npm run deploy:cloudflare`. It retains dashboard-managed variables and existing secrets.
- Monitoring: use the Worker's Cloudflare logs and `/api/health`. Do not log request bodies, cookies, authorization headers or Garmin responses. No external alert destination is configured.
- Emergency stop: change `GARMIN_MODE` to `disabled` in `wrangler.cloudflare.jsonc`, then redeploy. This disables imports; it does not revoke Garmin keys.
- Rollback: use the Worker's **Deployments** page to roll back to a previously verified version, or run `npx wrangler rollback --config wrangler.cloudflare.jsonc` and select a known-good deployment. Keep the matching runtime secret and domain settings; key rotation invalidates earlier browser sessions.

The original Sites configuration and identity remain for compatibility. Use the `:cloudflare` commands for this domain. Plain `npm run build` still builds the legacy Sites target; the Cloudflare deployment wrapper refuses to publish that target.
