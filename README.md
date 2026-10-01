# JobPix

# App Build Prompt — Contractor Quote & Invoice App

Copy and paste everything below into your AI app builder of choice.

---

Build a mobile-friendly app for a solo contractor/handyman to turn a quick set of project photos into a professional quote or invoice.

## Core flow

1. **Add a project** — user starts a new project/quote and gives it a name (e.g., client name or job address).

2. **Photos** — user takes or uploads one or more photos of the job site/repair.

3. **AI scope draft** — using the photos, the AI writes a first-pass description of the work needed: what's damaged or needed, a list of likely tasks, and a rough materials list. This is a starting guess, not a final answer — it should be clearly editable, not locked in.

4. **Edit scope** — user can freely edit, add, or delete any scope item the AI suggested.

5. **Materials list** — for each material/supply item:

   - Fields: name, quantity, unit price (starts blank or with the AI's rough guess; user edits)

   - A button next to each item that opens a browser search for that item on Home Depot's, Rona's, and Home Hardware's own websites (separate buttons or a small dropdown), so the user can check the current price and type it in themselves

   - No live pricing API or scraping — link-out to each store's search results only

6. **Labor** — simple fields for estimated hours and hourly rate (both editable), auto-multiplied into a labor subtotal.

7. **Totals** — materials subtotal + labor subtotal + optional tax/markup percentage field = total estimate, shown clearly.

8. **Generate quote/invoice** — a clean, professional, printable/shareable document with: contractor's name and contact info, client name, project description, itemized materials, labor, and total. Should be exportable or shareable (PDF or device share sheet).

9. **Save history** — past quotes/projects are saved and can be reopened, duplicated, or converted from "quote" to "invoice" once a job is done.

## Explicitly NOT in this version (keep scope small)

- No automotive or small-engine repair features — general contracting/handyman/trades only

- No live pricing API or scraping of hardware store websites — link-out to search only

- No multi-user accounts, logins, or team features — single user only

- No payment processing

- No inventory management beyond a simple per-quote materials list

## Design notes

- Should work well on a phone: large touch targets, camera access, simple forms

- Clean, professional look — this is a document a contractor hands to a client

- Local storage on the device is fine for this version — no cloud backend required yet

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://job-pix-pro.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/0edbe856-053e-4ee2-be42-d64fdd8a6026).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
