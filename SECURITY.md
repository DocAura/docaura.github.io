# Security

DocAura is a static website. All file processing happens in the visitor's browser, and nothing is uploaded.

## Protections in place
- A **Content-Security-Policy** on every page (set in `build/build.py`). Only scripts from this site run, and pages cannot send data to other origins (`connect-src 'self'`). Ad domains are allowed only when `adsense_client` is set in `build/config.json`.
- **All libraries are self-hosted** in `assets/vendor/` (pdf-lib, PDF.js, jsPDF 4.2.1, docx, libheif-js), with no third-party script CDNs.
- **PDF.js runs in safe mode:** `isEvalSupported: false`, XFA off, no network fetches.
- **Frame-busting** in `assets/js/common.js` to stop clickjacking. GitHub Pages can't send `X-Frame-Options` headers.
- **No `innerHTML` with user data.** File names, PDF text and form input are always inserted as text.
- **Safe download file names** (`SK.safeName`).

## Keeping it secure
- Check the libraries regularly: `npm audit` on the versions listed above. Update `assets/vendor/` when fixes are released.
- Turn on **two-factor authentication** on the GitHub account that owns this repo. That is the main way a site like this gets taken over.
- Keep "Enforce HTTPS" on in the repo's Settings → Pages.

## Reporting a vulnerability
Email **praveen.kumar@gmail.com**. See also `/.well-known/security.txt`.
