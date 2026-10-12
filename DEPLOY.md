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
2. **Create the backend.** Console → Build → App Hosting → Get started:
   connect the GitHub repo, branch `main`, root `/`, backend id
   `ryder-feedback`, and link it to the existing web app. **Pick the region
   your Firestore database is in** (Firestore → Databases shows it), so
   every write stays inside one region. From then on every push to `main`
   deploys.

   Without GitHub: `npm i -g firebase-tools`, `firebase login`, then
   `firebase deploy --only apphosting --project basic-bison-508123-k7`
   uploads the local source using the `apphosting` block in `firebase.json`.
3. **Check the server's permissions.** The first time you vote on the
   deployed site, watch App Hosting → Logs. A `PERMISSION_DENIED` there means
   the backend's service account
   (`firebase-app-hosting-compute@basic-bison-508123-k7.iam.gserviceaccount.com`)
   needs **Cloud Datastore User** and **Firebase Authentication Viewer** in
   IAM: the first for writes, the second for the revocation check on admin
   routes.

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
- **`npm run test:rules` and `npm run test:e2e` need JDK 21+.** They were
  written but never executed on Banno's machine, which has Java 8. Worth
  running once somewhere with a modern JDK before cutover — they cover the
  admin gate and the pending-queue rules directly.
