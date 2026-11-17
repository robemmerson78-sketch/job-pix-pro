# JobPix launch-readiness audit and app store release plan

This audit made no changes to the app, its settings or its saved data.

## What was checked and run
- **Automated tests:** 16 passed, 0 failed. They only cover the draft-merge and clarification rules.
- **Type check:** passed, with no errors.
- **Lint:** did not finish. It was stopped after about 100 seconds, so there is no lint result.
- **Not run in this audit:** a real AI request, a print/PDF test, and any phone test.

## 1. What JobPix is today
**A mobile-friendly web app only.**
- `public/` contains just `favicon.ico` and `robots.txt`. There is no web app manifest, no app icons, no apple-touch-icon and no service worker.
- `__root.tsx` links only the favicon.
- There are no Capacitor, TWA, `ios/` or `android/` folders.
- `package.json` has only web scripts (dev, build, preview, lint, format), and its package name is still `tanstack_start_ts`.
- It is **not installable** and **not offline-capable**. All AI features need the internet.

## 2. What the stores actually require
Publishing in Lovable only updates the website. It does not submit anything to Apple or Google.

- **Google Play (fastest route):**
  - Add a manifest and icons, then wrap the published site as a Trusted Web Activity (TWA), for example with Bubblewrap or PWABuilder.
  - Host `/.well-known/assetlinks.json` on the domain.
  - Requires a Play Console account ($25), the Data safety form, a content rating, privacy policy URL, screenshots, and closed testing (new personal accounts need 12 testers for 14 days).
- **Apple App Store:**
  - Apple rejects a plain website wrapper (guideline 4.2, minimum functionality), so a Capacitor native shell is needed, built on a Mac with Xcode.
  - Requires an Apple Developer account ($99/yr), app privacy "nutrition labels", a privacy policy URL, a support URL, screenshots, and TestFlight testing.
  - Native camera and file sharing are recommended. Today printing uses `window.print()`, which is unreliable inside app shells.
- **Recommended for speed and reliability:** do Play first through the TWA, which reuses the live web app. Do iOS second through Capacitor.
- **Key decision:** where the data lives. A Capacitor app has its own storage, separate from the website, so jobs do not move between them. That is fine for a single-device user, but only if backup/export exists (see P0 items 3 and 4).

## 3. Contractor workflow review (from the code)
- **Job create, edit, duplicate, quote→invoice:** present (`index.tsx`, `project.$id.tsx`).
- **Photos:** 8-photo limit, compressed to 1024px. The sharper copies go to separate on-device storage, with a keep / don't-keep setting. AI drafting uses only the **first 4** photos, and the screen does not say so.
- **AI scope draft:** the `draftScope` function. It uses `google/gemini-3.6-flash`, which is **deprecated** in the gateway catalog.
- **Clarification questions:** `askClarifications` (`openai/gpt-6-astra`), only run on tap. Safe material merge, confirm and exclude are covered by tests.
- **Supplier default:** Home Hardware Building Centre, with RONA and Home Depot. Check-price links are search pages only.
- **Totals:** a single "Tax / markup %" field, with a default of 5% (GST only) and CAD. There is no province selection and no separate GST/HST/PST, and the default is wrong for HST provinces.
- **Quote/invoice PDF:** browser print only. It was not tested on iPhone or Android.
- **Settings persistence:** saved on the device.
- **Backup/export/restore:** **missing.**
- **Offline:** none.
- **Privacy, terms, support:** pages exist. Support email: `jobpixhelp@repairman.com`.

## 4. Findings

### P0 — release blockers
1. **The AI functions are public and unlimited, which is a billing risk.**
   - `draftScope` and `askClarifications` can be called by anyone who finds the published site's address. There is no sign-in, rate limit, size cap per day, or abuse check, and each call spends this workspace's AI credits.
   - Commercial use needs at least a per-device/IP rate limit and request caps, or accounts and paid plans. The AI key itself stays on the server and is not exposed.
2. **Saving can fail without warning when storage fills up.**
   - `saveProjects` in `src/lib/storage.ts` calls `localStorage.setItem` with no error handling.
   - Photos are saved as base64 text in the same space, which is about 5 MB in most browsers. A few photo-heavy jobs fill it, and then the next save throws an error: the edit is lost and the page may break.
   - The safe route is to keep job data in localStorage but warn on failure, and move display photos to the existing IndexedDB store.
3. **There is no backup or export.** Clearing the browser or uninstalling the app wipes every job. That is unacceptable for paid users and makes moving between the web app and the store apps impossible. It needs an Export/Import backup file.
4. **The privacy policy is incomplete or inaccurate.**
   - It says photos go to "an AI service", but the notes, scope, materials, prices and answers are sent too, and the providers (Google and OpenAI, through Lovable's gateway) are not named.
   - There is no retention statement and no business contact.
   - The store forms (Play Data safety, Apple privacy labels) must match it exactly.
5. **There is no app identity for the stores.** It lacks a manifest, app icons (512/1024, plus a maskable icon), a splash screen, a theme colour, a store listing, screenshots, and the package/bundle id (e.g. `ca.jobpix.app`).
6. **The support contact is unverified.** Confirm that `jobpixhelp@repairman.com` is a real mailbox you control. The stores also need a support **website URL**, not just an email address.

### P1 — fix before a wider launch
1. **Deprecated drafting model** (`scope.functions.ts`). Plan the switch to a current model and retest the drafts.
2. **Canadian tax:** add a province choice that sets the tax rate (HST 13/15%, GST+PST/QST), add a GST/HST registration number field on the business profile, and keep tax separate from markup on the document.
3. **PDF in app shells:** `window.print()` should be replaced with a generated PDF plus the native share sheet, or at least tested on iOS Safari, Android Chrome and inside the TWA/Capacitor shells.
4. **Photo disclosure:** tell the user that only the first 4 photos are used for the AI draft (an existing limitation).
5. **Terms:** state that AI estimates and prices are not supplier prices and that the contractor is responsible. Add liability, refund and subscription terms if you charge.
6. **Monetization:** there is no pricing or paywall. Selling digital features in the iOS app must use Apple's in-app purchase (and Google Play Billing on Android), and that choice affects the P0 AI cost controls. This needs your decision.
7. **Onboarding:** add a first-run walkthrough (business profile, tax province, first job). Today it is just a profile nudge card on the home screen.
8. **Error and crash reporting:** add it for the native builds.

### P2 — polish
- The package name `tanstack_start_ts` and the version are kept in two places (`APP_VERSION` 1.0.0, while `package.json` has none). These need to be aligned for store versioning.
- Add an offline notice ("AI needs a connection"). Optional offline app shell, for the web app only.
- Get lint to complete, and add tests for totals, tax and storage-failure handling.
- Accessibility pass (labels, contrast, large text), and French (Québec) localization if you are targeting Québec.

## 5. Manual tests still needed (iPhone and Android)
1. **Camera and photos:** take photos with the camera and from the gallery, including the 8-photo limit and HEIC photos on iPhone.
2. **AI:** run a draft and a redraft on a real job, run the clarification questions, and run the paint/primer scenario.
3. **Saving:** fill storage with many photo jobs, reload, and confirm nothing is lost.
4. **Quote/invoice:** print and save as PDF, and share it by email or text, on each phone and inside the store builds.
5. **Settings:** settings persist, Don't keep deletes the sharper copies, and the supplier choice carries into new jobs.
6. **Offline:** turn on airplane mode and check that errors are clear and nothing is lost.
7. **Links:** the support email opens the mail app, and the privacy and terms links open.

## 6. Realistic launch sequence
1. **Week 1:** P0 items 1–4 (AI cost guard, storage safety, backup/export, accurate privacy and terms), plus the P1 model update and tests.
2. **Week 2:** P0 items 5–6 (manifest, icons, support site), the Canadian tax province setting, and the PDF/share fix. Publish the web update.
3. **Week 3:** Google Play TWA build, internal and closed testing, store listing and Data safety form.
4. **Weeks 3–5:** iOS Capacitor build on a Mac, native camera and share, TestFlight, App Store review (allow 1–2 review rounds).
5. **After launch:** monetization (the stores' in-app purchase rules), onboarding, then automotive estimating (still deferred).

## Decisions needed from you
1. Free or paid at launch, and if paid, subscription or one-time purchase? This changes the AI cost controls and the store billing.
2. Should iOS ship in the first release, or Google Play first?
3. Who is the legal publisher (business name and address), and is there a domain and support website to use?
4. Which provinces do you serve? This sets the tax defaults.

Nothing will be built until you approve which items to start with.
