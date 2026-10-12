# Deploying this to feedback.ryder.id

Handover notes. The board is built and the data is already migrated off
Frill — what is left is pointing the domain at this app and making sure the
one thing that must not leak, does not.

## The thing that matters most

The database currently holds **82 ideas: 29 published and 53 awaiting
review**. The 53 were never public on Frill — they sat in the admin inbox —
and they must stay that way here until someone approves them one by one.
A few read as private support issues rather than feature requests.

**This is already enforced, and not by the UI.** Each pending post carries
`moderation: "pending"` and `isPublic: false`, and `firestore.rules` serves a
post only when `isPublic == true`, or to an admin, or to its own author. A
list query that does not filter on `isPublic == true` is refused outright
rather than silently filtered, because Firestore validates the *query*, not
the rows it returns.

Verify it yourself after deploying, without signing in to anything:

```bash
PID=basic-bison-508123-k7
URL="https://firestore.googleapis.com/v1/projects/$PID/databases/(default)/documents/posts"

curl -s -o /dev/null -w "pending:   %{http_code}\n" "$URL/frill_create-support-for-monero"
curl -s -o /dev/null -w "published: %{http_code}\n" "$URL/frill_support-xrp"
```

You want `pending: 403` and `published: 200`. If the first one returns 200,
stop and deploy the rules again — something overwrote them.

### What would break it

- **Deploying stale rules.** `npm run deploy:rules` publishes
  `firestore.rules` from this repo. Deploying an older copy, or rules from
  anywhere else, is the one realistic way the queue becomes readable.
- **`npm run seed -- --reset`.** Wipes every post and replaces them with demo
  data. There is no undo. Do not run it against production.
- **`node scripts/import-frill.mjs --write --reset`.** Same wipe, then
  re-imports from the JSON files. Safe to re-run *without* `--reset` — every
  id derives from the Frill slug, so it rewrites rather than duplicates — but
  it will revert any approvals made since the last import.

## 1. Hosting: Firebase App Hosting

The app runs on Firebase App Hosting, in the same Google project as the
data. There is no service account key to store anywhere: the server runs as
the project's own identity (`src/lib/firebase/admin.ts`), and the public web
config is filled in at build time from `FIREBASE_WEBAPP_CONFIG`
(`next.config.ts`). Runtime settings live in `apphosting.yaml`.

One-time setup, on a machine with a browser:

1. **Upgrade the project to Blaze** (pay-as-you-go) in the Firebase console.
   App Hosting requires it. At this traffic it stays inside the free tier;
   set a budget alert (Billing → Budgets, e.g. $5) so a surprise is an email,
   not an invoice.
2. **The backend** is `ryder-feedback` in `us-central1`, next to Firestore
   (`nam5`), linked to the "Ryder Feedback" web app, and serving at
   `https://ryder-feedback--basic-bison-508123-k7.us-central1.hosted.app`.
   Recreating it: `firebase apphosting:backends:create --backend
   ryder-feedback --primary-region us-central1 --app <web app id>`.
3. **Server permissions.** The backend runs as
   `firebase-app-hosting-compute@basic-bison-508123-k7.iam.gserviceaccount.com`,
   whose default roles already cover Firestore writes and the revocation
   check. If App Hosting → Logs ever shows `PERMISSION_DENIED`, it needs
   **Cloud Datastore User** and **Firebase Authentication Viewer**.

### Deploying changes

Pushing to `main` deploys. `.github/workflows/deploy.yml` runs the typecheck
and the rules tests, then deploys rules, indexes and the app, then checks
that a pending idea still returns 403. Pull requests run the checks only.

There are no secrets in GitHub. The workflow signs in to Google with
Workload Identity Federation: GitHub's OIDC token is exchanged for
short-lived credentials of `github-deploy@basic-bison-508123-k7.iam.gserviceaccount.com`.
The pool (`github`) and provider (`github`) accept tokens only where
`repository == 'Light-Labs/ryder-feedback'` and `ref == 'refs/heads/main'`,
so forks, pull requests and other branches cannot deploy, even with an
edited workflow. If the repository is renamed or moved, update that
condition in IAM → Workload Identity Federation, or deploys stop with an
auth error.

`github-deploy` holds only what a deploy needs: App Hosting Admin, Firebase
Rules Admin, Cloud Datastore Index Admin, Service Usage Consumer and Firebase
Viewer on the project; Storage Admin on the
`firebaseapphosting-sources-648320838171-us-central1` bucket alone; and
Service Account User on the App Hosting runtime account, so rollouts can run
as it.

By hand, from a machine with `firebase login`:

```bash
firebase deploy --only firestore:rules,firestore:indexes,apphosting --project basic-bison-508123-k7
```

The standalone `firebase` binary runs `emulators:exec` scripts with its own
embedded Node and cannot find the test files; use
`npx firebase-tools@15.33.0 emulators:exec ...` for the rules tests.

For local development `.env.local` is unchanged: copy `.env.local.example`,
and the service account key there is still how scripts and `next dev` reach
the project. Never add `FIREBASE_PRIVATE_KEY` to App Hosting; its presence
switches the server back to key-based credentials.

## 2. Firebase console

- **Authentication → Sign-in method**: Anonymous *and* Google both enabled.
  Anonymous is how ordinary visitors get a stable id so one-vote-per-person
  works without anyone registering. Google is how admins get in.
- **Do not enable Email/password.** Admin access is "a verified Google
  address on the domain", and a provider that lets people type their own
  address is a provider that lets people type `ceo@ryder.id`. The rule
  requires `sign_in_provider == 'google.com'` for exactly this reason and
  `tests/rules.test.mjs` pins it, but the safest version is not to turn it on.
- **Authentication → Settings → Authorized domains**: add `feedback.ryder.id`
  and the App Hosting domain
  (`ryder-feedback--basic-bison-508123-k7.<region>.hosted.app`, shown on the
  backend page). Sign-in fails silently from an unlisted
  domain, which looks exactly like "the login button does nothing".

## 3. Rules and indexes

```bash
npm run deploy:rules
```

Both are already live on the project, so this is a no-op unless you have
changed `firestore.rules` or `firestore.indexes.json`. Run it anyway — it is
cheap, and a board running on rules that do not match this repo is the worst
version of this deployment.

If `firebase login` is not an option (CI, no browser), there is
`node scripts/deploy-with-key.mjs` — dry run by default, `--write` to apply,
using the service account instead of an interactive login.

## 4. Admin access

There is no admin list and nothing to grant. An admin is a Google account on
`@ryder.id` with a verified address — see `src/lib/access.ts`, restated in
`firestore.rules` because rules cannot call into TypeScript.

Open `/admin` and press **Sign in with @ryder.id**. Signing in links Google to
the anonymous session already in the browser, so votes and submissions made
before signing in are kept.

Joining the company grants access; leaving revokes it, because Workspace
suspending an account kills its refresh token and `/api/me` verifies with
`checkRevoked` on every call. Nobody has to remember to run anything. The
trade: if Workspace is down, nobody can administer the board. The public side
keeps working — reads go straight to Firestore, and voting only needs an
anonymous session.

## 5. The domain

`feedback.ryder.id` currently points at Frill. To move it:

- add it to Firebase **Authorized domains** (step 2) *before* cutting over,
  or admin sign-in breaks the moment the domain switches;
- App Hosting → the backend → Settings → Domains → Add custom domain, and
  create the DNS records it lists. It issues the certificate itself once DNS
  resolves;
- Frill keeps serving until DNS propagates, so there is a window where both
  exist. Nothing new should be answered on Frill after the cutover starts.

## 6. After deploying

- `/` shows 29 ideas. If it shows 82, the rules are wrong — see the top of
  this file.
- `/admin` shows 53 in the review queue, with a count badge on the Review tab.
- `/roadmap` shows the three ideas that carried a status over from Frill.
- Run the two `curl` checks above.

## Known gaps, so they are not surprises

- **Votes came over as counts, not voters.** Frill's board exposes totals,
  not who voted. The numbers are real; one-vote-per-person has nothing to
  enforce against for historical votes and starts working from the first vote
  cast here.
- **Comment replies are flattened.** Frill's public feed does not expose the
  parent relationship, so all 42 comments are top-level.
- **Boards on the pending 53 are guessed** from the title, since Frill's inbox
  items mostly carry no topic. See `scripts/build-pending.mjs`. Expect a few
  to be filed wrong.
- **One submission was truncated** to the 4,000-character body limit, and one
  title to 120 characters. Both are marked with a trailing `…`.
- **`npm run test:rules` and `npm run test:e2e` need JDK 21+.** The rules
  tests (39, covering the admin gate and the pending queue) pass and run in
  CI on every push. The e2e smoke test has still never been run.
- **Unit tests do not block deploys.** CI runs them and shows a failure, but
  only the typecheck and the rules tests stop a deploy.
