# SimpleKit

Free, private, easy-to-use tools: a resume builder plus PDF and photo tools. Everything runs in the visitor's browser. No files are uploaded, and there's no server to pay for.

## Tools

| Page | What it does |
|---|---|
| `/resume-builder/` | Form with live preview, 3 designs, 5 colours, autosave, real-text (ATS-friendly) PDF |
| `/resize-image/` | Resize a photo to 20 / 50 / 100 / 200 KB or a custom size, with optional exact pixels |
| `/compress-pdf/` | Shrink a PDF to "Smaller", 100 KB, 200 KB, 500 KB, 1 MB or a custom size |
| `/merge-pdf/` | Join PDFs in any order |
| `/split-pdf/` | Tap page thumbnails (or type `1-3, 5`) to keep pages, or save each page separately |
| `/jpg-to-pdf/` | Photos (JPG/PNG/WEBP/HEIC) to one PDF, as A4, Letter or fit-to-photo |
| `/pdf-to-jpg/` | PDF pages to JPG or PNG |
| `/passport-photo/` | Crop to 35×45 mm / 2×2 in / custom, then download a single photo, a 4×6 sheet or an A4 PDF |
| `/heic-to-jpg/` | Convert iPhone photos to JPG |

## Editing pages

Pages live in `build/pages/*.html`. Each one has a small JSON header (title, description, FAQ) followed by its content. After editing, rebuild:

```bash
python3 build/build.py
```

This regenerates every `index.html`, plus `sitemap.xml` and `robots.txt`. Commit the generated files too, because GitHub Pages serves them directly.

## Settings to fill in before launch

1. **`build/config.json`**
   - `site_url`: your real domain, e.g. `https://simplekit.in`. It's used for canonical links, the sitemap and share previews.
   - `base_path`: leave empty for a custom domain. For `username.github.io/simplekit`, set it to `simplekit`.
   - `contact_email`: the email shown on the Contact, Privacy and Terms pages.
   - `brand`: the site name.
2. **AdSense**: once approved, put your publisher id in `ADSENSE_CLIENT` at the top of `assets/js/common.js`. Then add an `ads.txt` file at the repo root containing the line Google gives you. Ads appear automatically in every `.ad-slot`.
3. Run `python3 build/build.py`, then commit and push.

## Libraries (in `assets/vendor/`, all open source)

pdf-lib (MIT), PDF.js (Apache-2.0), jsPDF (MIT), heic2any (MIT).
