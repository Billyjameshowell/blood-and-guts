# Blood & Guts

Phone-first log for the Blood & Guts training split. Production: https://blood-and-guts-five.vercel.app

## Preview screenshots

Every pull request gets a phone still, a desktop still, and a short phone GIF of the routes it changes. Production is the "before" and the Vercel preview is the "after". Images are uploaded with Linear's `fileUpload` API and embedded in the issue comment, which is where they render. Linear keeps those files private, so the pull request comment mirrors the same note and the workflow run stores the files as an artifact.

The route list is a heuristic over the changed files (Next.js `app/` and `pages/`, SvelteKit, Nuxt, Astro, Remix). Dynamic segments such as `[slug]` are skipped. This app has no file-based router, so a change falls back to `/`. Set `routes` in `preview-shots.json` to pin paths instead.

### What runs

`.github/workflows/preview-screenshots.yml` does two things:

1. **`deployment_status`** (the path to prefer). When Vercel marks a preview deployment successful, the workflow screenshots `deployment_status.environment_url`. GitHub only runs this event from the default branch, so it starts working after this workflow is on `main`. Production deployments are ignored.
2. **`pull_request`** fallback. If Vercel never creates a GitHub deployment, the job waits up to three minutes. It uses a successful GitHub deployment status when one exists. If the repo secret `VERCEL_TOKEN` is set, it asks the Vercel API for a READY preview of that commit (`preview-shots.json` has the project and team ids). When the workflow is already on the default branch and GitHub has a deployment, this job steps aside so `deployment_status` does the capture once.

`workflow_dispatch` takes `preview_url` and `pr_number` for a manual run from `main`.

Stills are the top of the page at 390×844 and 1280×800. The GIF is the preview at phone size, including a short scroll. At most three routes are captured (`maxRoutes`).

### Copying to another repo

Copy these and edit `preview-shots.json`:

- `.github/workflows/preview-screenshots.yml`
- `.github/preview-shots/` (`shot.mjs`, `routes.mjs`, `routes.test.mjs`, `package.json`, `package-lock.json`)
- `preview-shots.json`

`productionUrl` is required for the before shots. `fallbackRoutes` defaults to `["/"]`. `routes` pins an explicit list and skips the heuristic. `waitFor` is a CSS selector the page should show before the still is taken. `vercel.projectId` and `vercel.teamId` are only used with `VERCEL_TOKEN`.

### Secrets

Add them under **GitHub → Settings → Secrets and variables → Actions → Repository secrets**. This workflow cannot create them.

| Secret | When |
| --- | --- |
| `LINEAR_API_KEY` | Needed to comment on Linear. Linear → **Settings → Account → Security & access → Personal API keys**. A personal key can read the issue and create comments. The issue key (`OWEX-123`) must appear in the branch name, PR title, PR body, or a Linear linkback comment. |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Needed only when Deployment Protection is on (Vercel Authentication, password, or trusted IPs). Vercel → project → **Settings → Deployment Protection → Protection Bypass for Automation**. Create a secret and paste that value. Playwright sends it as `x-vercel-protection-bypass` plus `x-vercel-set-bypass-cookie: true`, so the document and its assets get a bypass cookie. Do not put the secret in the URL. Leave the secret unset when previews are public. |
| `VERCEL_TOKEN` | Needed only when the Vercel GitHub App does not post deployment statuses (this repo currently does not, so the `pull_request` fallback cannot see preview URLs without it). Create a read token at [vercel.com/account/settings/tokens](https://vercel.com/account/settings/tokens). |

`GITHUB_TOKEN` is provided by Actions. No other GitHub settings are required. Fork pull requests do not receive these secrets.

### This repo's Vercel link

The project is `prj_dIqB7JkXVp1VPG86wa50NCMacMwk` on team `billy-owexlabscoms-projects`. Production is https://blood-and-guts-five.vercel.app. Password protection and Vercel Authentication are off, so public previews do not need the bypass secret.

As of this workflow landing, GitHub has **no deployment records** for the repo, and the Vercel check suite on pull requests stays `queued` with zero check runs. Preview builds that do exist were uploaded with the Vercel CLI. Until the GitHub App posts a successful preview deployment, `deployment_status` will not fire. Add `VERCEL_TOKEN` (and the project ids already in `preview-shots.json`) for the fallback, or reconnect the GitHub App so Vercel creates deployment statuses.
