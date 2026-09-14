# SiteQuote visual identity refresh

## Goal
Refresh the entire SiteQuote experience so it feels like premium estimating software built for working contractors, while preserving every existing feature, workflow, label, navigation path, calculation, and local-storage behavior.

## Visual system
- Apply the four-color hierarchy consistently:
  - Warm Off-White `#F6F7F4` as the dominant canvas
  - Deep Navy `#17233C` for the brand, navigation, headings, and primary structure
  - Electric Teal `#18B7A0` for creation, progress, AI analysis, and interactive emphasis
  - Warm Amber `#F4A62A` sparingly for estimates, prices, pending states, warnings, and important information
- Build accessible semantic color roles and restrained supporting tints from this palette; no unrelated brand colors.
- Replace the current Barlow typography with Plus Jakarta Sans throughout the app and generated documents.
- Standardize the requested weight hierarchy: extra-bold wordmark and totals, bold page titles, semi-bold section and job titles, readable regular body copy, and medium labels/numerical details.
- Use generous spacing, subtle borders, restrained shadows, modest corner radii, and clear focus/pressed states.

## Home command dashboard
- Keep the existing sticky SiteQuote header, settings access, job creation dialog, job opening, duplication, and deletion.
- Recompose the home screen as a mobile-first command dashboard using only information already available from saved jobs: job count, quote/invoice count, and saved project value.
- Give the job feed stronger hierarchy with larger job names, clearer client/date context, prominent prices, restrained type indicators, and cleaner action placement.
- Upgrade the empty state so it feels intentional and engaging without inventing a new capability.
- Keep the thumb-friendly fixed **New job** action, styled in Electric Teal.

## Job editor
- Restyle job details, photo capture/upload, scope, tasks, materials, labor, totals, and the fixed document action as one coherent system.
- Give AI photo analysis a distinct but restrained teal identity, including its loading and generated-content cues.
- Make measurements, quantities, hours, rates, subtotals, and prices easier to scan on a phone.
- Make the final total the strongest element in the pricing area, using bold navy typography with a small amber accent.
- Preserve all editing behavior, store-search links, quote/invoice switching, and calculations unchanged.

## Settings and generated documents
- Bring business settings into the same typography, spacing, field, and action hierarchy.
- Restyle the printable/shareable quote and invoice with matching SiteQuote branding, clearer itemization, and a prominent professional total.
- Preserve clean printing, PDF output, and sharing behavior while ensuring the printed version remains economical and legible.

## Shared controls and quality checks
- Update shared buttons, fields, dialogs, menus, notifications, status treatments, and the header so every screen follows the same system.
- Keep icon buttons recognizable and add clear accessible labels where needed.
- Verify the complete existing workflow on mobile and desktop: create job, add/edit details, photo actions, AI scope state, materials, labor, totals, quote/invoice conversion, duplicate/delete, settings, share, and print.
- Check text fit, contrast, focus states, sticky/fixed controls, print output, and reduced-motion behavior.

## Technical details
- Define the palette, derived surfaces, borders, shadows, typography, and state roles as semantic tokens in the global design system.
- Load Plus Jakarta Sans through the document head and apply it consistently to both screen and print views.
- Reuse the existing component library for interactive controls and keep all changes confined to presentation code.
- Add complete per-page social metadata where currently incomplete, without changing page behavior.
