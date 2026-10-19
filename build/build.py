#!/usr/bin/env python3
"""Builds the static site from build/pages/*.html.

Each page file starts with a JSON header inside <!--- ... ---> followed by the page body.
Run:  python3 build/build.py
Output goes to the repo root (index.html, compress-pdf/index.html, ...), ready for GitHub Pages.
"""
import json, os, re, html, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
CONFIG = json.load(open(os.path.join(HERE, 'config.json')))
BRAND = CONFIG['brand']
SITE_URL = CONFIG['site_url'].rstrip('/')

ICONS = {
  'logo': '<path d="M13.5 2.5H6.5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8.5z"/><path d="M13.5 2.5v6h6"/><path d="M12 11.2c.35 1.75 1.05 2.45 2.8 2.8-1.75.35-2.45 1.05-2.8 2.8-.35-1.75-1.05-2.45-2.8-2.8 1.75-.35 2.45-1.05 2.8-2.8z" fill="currentColor"/>',
  'resume': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/>',
  'compress': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="m9 13 3 3 3-3M12 9v7"/>',
  'merge': '<rect x="3" y="3" width="11" height="14" rx="2"/><rect x="10" y="7" width="11" height="14" rx="2"/>',
  'split': '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12"/>',
  'image': '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
  'resize': '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
  'passport': '<rect x="4" y="2" width="16" height="20" rx="3"/><circle cx="12" cy="10" r="3"/><path d="M7 18a5 5 0 0 1 10 0"/>',
  'convert': '<path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
  'pdfimg': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><rect x="8" y="12" width="8" height="6" rx="1"/>',
  'upload': '<path d="M12 16V4M6 10l6-6 6 6"/><path d="M4 18v2h16v-2"/>',
  'back': '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  'arrow': '<path d="M5 12h14M13 6l6 6-6 6"/>',
  'search': '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  'shield': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  'check': '<path d="M20 6 9 17l-5-5"/>',
  'download': '<path d="M12 4v12M6 10l6 6 6-6"/><path d="M4 20h16"/>',
  'x': '<path d="M18 6 6 18M6 6l12 12"/>',
  'up': '<path d="m6 15 6-6 6 6"/>',
  'down': '<path d="m6 9 6 6 6-6"/>',
  'plus': '<path d="M12 5v14M5 12h14"/>',
  'letter': '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  'word': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="m7.5 12 1.5 6 1.5-4.5 1.5 4.5 1.5-6"/>',
  'edit': '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  'form': '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h4"/><path d="m14 16 1.5 1.5L18 15"/>',
  'sign': '<path d="M3 17c3-4 5-9 7-9s-1 9 1 9 3-5 5-5-1 5 1 5 3-2 4-3"/><path d="M3 21h18"/>',
  'organize': '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="9" rx="1.5"/><path d="M21 16a5 5 0 0 1-9 3M12 21v-3h3"/>',
  'numbers': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M10 17h1.5v-5L10 13M14 12h2.5l-2.5 5h2.5"/>',
}

def icon(name, size=24, color='currentColor', width=2.2):
    return ('<svg width="%d" height="%d" viewBox="0 0 24 24" fill="none" stroke="%s" stroke-width="%s" '
            'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">%s</svg>') % (size, size, color, width, ICONS[name])

# Tool registry: drives the homepage grid, related links and sitemap.
TOOLS = [
  dict(slug='resume-builder', name='Free resume builder', desc='25 free designs. Fill simple boxes, download a clean PDF.', icon='resume', keys='resume cv biodata job builder maker template', group='resume'),
  dict(slug='cover-letter', name='Cover letter builder', desc='Written from your resume, in the same design.', icon='letter', keys='cover letter builder application letter job letter write', group='resume'),
  dict(slug='pdf-to-word', name='PDF to Word', desc='Turn a PDF into a Word file you can edit.', icon='word', keys='pdf to word docx convert editable doc microsoft word', group='pdf', dark=True),
  dict(slug='edit-pdf', name='Edit a PDF', desc='Add text, white-out, highlight, ticks and pictures.', icon='edit', keys='edit pdf add text write on pdf whiteout white out highlight annotate typewriter', group='pdf'),
  dict(slug='fill-pdf', name='Fill a PDF form', desc='Type into any PDF form and tick boxes.', icon='form', keys='fill pdf form fillable application form type on form checkbox', group='pdf'),
  dict(slug='resize-image', name='Resize photo to KB', desc='Make a photo 20KB, 50KB, 100KB — for exam and job forms.', icon='resize', keys='resize image photo kb 20kb 50kb 100kb 200kb compress jpg reduce size signature', group='image', dark=True),
  dict(slug='compress-pdf', name='Make PDF smaller', desc='Compress a PDF to 100KB, 200KB or any size you need.', icon='compress', keys='compress pdf reduce size smaller 100kb 200kb 500kb 1mb', group='pdf'),
  dict(slug='merge-pdf', name='Join PDFs', desc='Put many PDF files together into one file.', icon='merge', keys='merge join combine pdf', group='pdf'),
  dict(slug='split-pdf', name='Split a PDF', desc='Take out only the pages you want.', icon='split', keys='split pdf extract pages remove pages cut', group='pdf'),
  dict(slug='jpg-to-pdf', name='Photos to PDF', desc='Scan homework or documents into one clean PDF.', icon='image', keys='jpg to pdf image to pdf photo png scan convert homework scanner document camera', group='pdf'),
  dict(slug='pdf-to-jpg', name='PDF to photos', desc='Save each PDF page as a JPG picture.', icon='pdfimg', keys='pdf to jpg pdf to image png convert pages', group='pdf'),
  dict(slug='sign-pdf', name='Sign a PDF', desc='Draw, type or upload your signature and place it.', icon='sign', keys='sign pdf signature esign e-sign electronic signature fill sign document', group='pdf', dark=True),
  dict(slug='organize-pdf', name='Turn & reorder pages', desc='Fix upside-down pages, change order, delete pages.', icon='organize', keys='rotate pdf pages reorder delete remove pages organize upside down sideways', group='pdf'),
  dict(slug='page-numbers', name='Add page numbers', desc='Number pages and add your name to every page.', icon='numbers', keys='page numbers pdf add name header roll number student', group='pdf'),
  dict(slug='passport-photo', name='Passport photo', desc='Crop your photo to passport size and print a sheet.', icon='passport', keys='passport photo size visa crop 35x45 2x2 print sheet', group='image'),
  dict(slug='heic-to-jpg', name='iPhone photo to JPG', desc='Change HEIC photos into normal JPG files.', icon='convert', keys='heic to jpg iphone photo convert heif', group='image'),
]
TOOL_BY_SLUG = {t['slug']: t for t in TOOLS}

def rel(depth):
    return '../' * depth if depth else './'

def header(r, active):
    def nav(href, label, key, cls=''):
        cur = ' aria-current="page"' if active == key else ''
        return '<a href="%s%s" class="%s"%s>%s</a>' % (r, href, cls, cur, label)
    return '''<a class="skip" href="#main">Skip to content</a>
<header class="site-header"><div class="wrap">
  <a class="logo" href="%(r)s" aria-label="%(brand)s home"><span class="logo-mark">%(logo)s</span><span>%(b1)s<strong>%(b2)s</strong></span></a>
  <nav class="nav" aria-label="Main">
    %(n1)s%(n2)s%(n3)s
    <button type="button" class="text-btn" data-big-text aria-pressed="false"><span class="a1">A</span><span class="a2">A</span> Bigger text</button>
  </nav>
</div></header>''' % dict(r=r, brand=BRAND['name'], logo=icon('logo', 28, '#FFFFFF'), b1=BRAND['name_light'], b2=BRAND['name_bold'],
      n1=nav('resume-builder/', 'Resume', 'resume', 'hide-sm'), n2=nav('#tools', 'All tools', 'tools', 'hide-sm'),
      n3=nav('guides/', 'Guides', 'guides', 'hide-sm'))

def footer(r):
    year = datetime.date.today().year
    return '''<footer class="site-footer"><div class="wrap"><div class="card">
  <span style="font-size:21px">%(b1)s<strong>%(b2)s</strong> · %(tag)s</span>
  <nav aria-label="Footer"><a href="%(r)sguides/">Guides</a><a href="%(r)sabout/">About</a><a href="%(r)sprivacy/">Privacy</a><a href="%(r)scontact/">Contact</a><a href="%(r)sterms/">Terms</a></nav>
  <small>© %(y)s %(brand)s. Your files are processed on your own device and are never uploaded.</small>
</div></div></footer>''' % dict(r=r, b1=BRAND['name_light'], b2=BRAND['name_bold'], brand=BRAND['name'], y=year, tag=html.escape(BRAND.get('tagline', 'free tools for everyone')))

def tool_card(t, r):
    cls = 'ic dark' if t.get('dark') else 'ic'
    col = '#FFFFFF' if t.get('dark') else '#3B2D8F'
    return ('<a class="tool" href="%s%s/" data-keys="%s"><span class="%s">%s</span>'
            '<span class="t">%s</span><span class="d">%s</span></a>') % (
        r, t['slug'], html.escape(t['name'].lower() + ' ' + t['keys']), cls, icon(t['icon'], 36, col, 2), t['name'], t['desc'])

def tool_grid(r, exclude=None):
    return '<div class="tools" id="tool-grid">' + ''.join(tool_card(t, r) for t in TOOLS if t['slug'] != exclude) + '</div>'

def related(r, slugs):
    return '<nav class="related" aria-label="Related tools">' + ''.join(
        '<a href="%s%s/">%s</a>' % (r, s, TOOL_BY_SLUG[s]['name']) for s in slugs) + '</nav>'

def faq_html(faqs):
    if not faqs: return ''
    items = ''.join('<details><summary>%s</summary><p>%s</p></details>' % (html.escape(q), a) for q, a in faqs)
    return '<section class="section"><h2>Questions people ask</h2><div class="faq">%s</div></section>' % items

def faq_schema(faqs):
    if not faqs: return ''
    data = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": re.sub('<[^>]+>', '', a)}} for q, a in faqs]}
    return '<script type="application/ld+json">%s</script>' % json.dumps(data)

GUIDES = []  # filled in main(): list of article metas

def guide_cards(r, limit=None, exclude=None):
    items = [g for g in GUIDES if g['slug'] != exclude][:limit]
    return '<div class="guide-grid">' + ''.join(
        '<a class="guide-card" href="%s%s/"><span class="g-tag">%s</span><b>%s</b><span>%s</span></a>' % (
            r, g['slug'], html.escape(g.get('topic', 'Guide')), html.escape(g['h1']), html.escape(g['desc'])) for g in items) + '</div>'

def article_shell(meta, body, r):
    t = TOOL_BY_SLUG.get(meta.get('cta'))
    cta = ''
    if t:
        cta = ('<aside class="cta-card"><span class="ic%s">%s</span><div><b>%s</b><span>%s Free, no sign-up, works on your phone.</span></div>'
               '<a class="btn" href="%s%s/">Open the tool %s</a></aside>') % (
            ' dark' if t.get('dark') else '', icon(t['icon'], 32, '#FFFFFF' if t.get('dark') else '#3B2D8F', 2), t['name'], t['desc'], r, t['slug'], icon('arrow', 22, '#FFFFFF'))
    words = len(re.sub('<[^>]+>', ' ', body).split())
    return '''<main id="main" class="wrap narrow">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="%(r)s">Home</a> › <a href="%(r)sguides/">Guides</a></nav>
  <article class="article">
    <h1>%(h1)s</h1>
    <p class="art-meta">Updated %(date)s · %(mins)d min read</p>
    %(cta)s
    <div class="prose art-body">%(body)s</div>
    %(cta)s
  </article>
  <div class="ad-slot"></div>
  <section class="section"><h2>More helpful guides</h2>%(more)s</section>
</main>''' % dict(r=r, h1=meta['h1'], date=meta.get('date', '20 October 2026'), mins=max(2, round(words / 200)), cta=cta, body=body,
                  more=guide_cards(r, 4, meta['slug']))

def article_schema(meta, url):
    if not meta.get('article'): return ''
    data = {"@context": "https://schema.org", "@type": "Article", "headline": meta['h1'], "description": meta['desc'],
            "dateModified": meta.get('iso', '2026-10-20'), "datePublished": meta.get('iso', '2026-10-20'), "mainEntityOfPage": url,
            "author": {"@type": "Organization", "name": BRAND['name']}, "publisher": {"@type": "Organization", "name": BRAND['name']},
            "image": SITE_URL + '/assets/img/share.png'}
    return '<script type="application/ld+json">%s</script>' % json.dumps(data)

def tool_schema(meta, url):
    if not meta.get('tool'): return ''
    data = {"@context": "https://schema.org", "@type": "WebApplication", "name": meta['h1'], "url": url,
            "applicationCategory": "UtilitiesApplication", "operatingSystem": "Any (runs in your web browser)",
            "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"}}
    return '<script type="application/ld+json">%s</script>' % json.dumps(data)

def tool_shell(meta, body, r):
    """Standard tool page: back button, title, steps, panel, ad, how-to, faq, related."""
    slug = meta['slug']
    steps = meta.get('steps', ['Choose file', 'Pick options', 'Download'])
    ps = '<div class="progress-steps" aria-hidden="true">' + '<span class="bar"></span>'.join(
        '<span class="ps%s" data-step="%d"><span class="dot">%d</span><span class="lbl">%s</span></span>' % (' on cur' if i == 0 else '', i + 1, i + 1, s)
        for i, s in enumerate(steps)) + '</div>'
    rel_slugs = meta.get('related') or [t['slug'] for t in TOOLS if t['slug'] != slug][:4]
    return '''<main id="main" class="wrap narrow">
  <div class="tool-head"><a class="back" href="%(r)s" aria-label="Back to all tools">%(back)s</a><h1>%(h1)s</h1></div>
  <p class="tool-sub">%(sub)s</p>
  <p class="promise"><span>%(chk)s No daily limit</span><span>%(chk)s No watermark</span><span>%(chk)s No sign-up</span><span>%(chk)s Files never uploaded</span></p>
  %(ps)s
  %(body)s
  <div class="ad-slot"></div>
  %(howto)s
  %(faq)s
  %(guide)s
  <section class="section"><h2>Other free tools</h2>%(related)s</section>
</main>''' % dict(r=r, back=icon('back', 26, '#3B2D8F', 2.6), h1=meta['h1'], sub=meta.get('sub', ''), ps=ps, body=body, chk=icon('check', 18, '#1D6B45', 3), guide=(('<section class="section"><h2>Learn more</h2><div class="guide-grid">' + ''.join('<a class="guide-card" href="%s%s/"><span class="g-tag">Guide</span><b>%s</b><span>%s</span></a>' % (r, g['slug'], html.escape(g['h1']), html.escape(g['desc'])) for g in GUIDES if g.get('cta') == slug) + '</div></section>') if any(g.get('cta') == slug for g in GUIDES) else ''),
                  howto=meta.get('howto_html', ''), faq=faq_html(meta.get('faq')), related=related(r, rel_slugs))

ADS_ON = bool(CONFIG.get('adsense_client'))

def csp():
    """Content-Security-Policy: only our own scripts run, and pages cannot send data to other websites.
    Ad domains are allowed only once an AdSense id is set in config.json."""
    ads_script = ' https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.google.com https://*.doubleclick.net https://*.googleadservices.com https://*.adtrafficquality.google https://fundingchoicesmessages.google.com' if ADS_ON else ''
    ads_frame = 'https://*.doubleclick.net https://*.googlesyndication.com https://*.google.com https://*.adtrafficquality.google' if ADS_ON else "'none'"
    ads_conn = ' https://*.google.com https://*.googlesyndication.com https://*.doubleclick.net https://*.adtrafficquality.google https://*.googleadservices.com' if ADS_ON else ''
    ads_img = ' https:' if ADS_ON else ''
    return ("default-src 'self'; "
            "script-src 'self' 'wasm-unsafe-eval'%s; " % ads_script +
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' data: https://fonts.gstatic.com; "
            "img-src 'self' data: blob:%s; " % ads_img +
            "connect-src 'self' blob: data:%s; " % ads_conn +
            "worker-src 'self' blob:; child-src 'self' blob:; "
            "frame-src %s; " % ads_frame +
            "object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests")

def email_html():
    u, d = CONFIG['contact_email'].split('@')
    # Built into a real link by common.js, so simple spam bots can't read the address from the page source
    return '<a class="js-email" href="%scontact/" data-u="%s" data-d="%s">%s [at] %s</a>' % ('{{R}}', html.escape(u), html.escape(d), html.escape(u), html.escape(d.replace('.', ' [dot] ')))

def write_site_config():
    js = '/* Generated by build/build.py from build/config.json - do not edit by hand */\nwindow.SK_CONFIG = %s;\n' % json.dumps({
        'adsenseClient': CONFIG.get('adsense_client', ''), 'brand': BRAND['name']})
    open(os.path.join(ROOT, 'assets', 'js', 'site-config.js'), 'w').write(js)

def page(meta, body):
    slug = meta['slug']
    depth = 0 if slug in ('', '404') else slug.count('/') + 1
    r = rel(depth)
    if slug == '404':
        r = '/' + CONFIG.get('base_path', '').strip('/') + '/' if CONFIG.get('base_path') else '/'
        r = r.replace('//', '/')
    url = SITE_URL + '/' + (slug + '/' if slug and slug != '404' else '')
    if meta.get('tool'):
        body = tool_shell(meta, body, r)
    if meta.get('article'):
        body = article_shell(meta, body, r)
    body = re.sub(r'\{\{TOPIC_GUIDES:(\w+)\}\}', lambda m: '<div class="guide-grid">' + ''.join('<a class="guide-card" href="%s%s/"><span class="g-tag">Guide</span><b>%s</b><span>%s</span></a>' % (r, g['slug'], html.escape(g['h1']), html.escape(g['desc'])) for g in GUIDES if g.get('topic') == m.group(1)) + '</div>', body)
    body = body.replace('{{GUIDE_CARDS}}', guide_cards(r, 6)).replace('{{ALL_GUIDES}}', guide_cards(r))
    body = body.replace('{{EMAIL}}', email_html()).replace('{{R}}', r).replace('{{TOOL_GRID}}', tool_grid(r)).replace('{{BRAND}}', BRAND['name']).replace('{{EMAIL}}', email_html()).replace('{{UPDATED}}', CONFIG.get('policy_updated', '19 October 2026'))
    body = re.sub(r'\{\{ICON:(\w+):(\d+):([#\w]+)\}\}', lambda m: icon(m.group(1), int(m.group(2)), m.group(3)), body)
    title = meta['title'] + ('' if BRAND['name'] in meta['title'] else ' | ' + BRAND['name'])
    canonical = '<link rel="canonical" href="%s">' % url if SITE_URL and slug != '404' else ''
    og = ''
    if SITE_URL:
        og = ('<meta property="og:title" content="%s"><meta property="og:description" content="%s">'
              '<meta property="og:url" content="%s"><meta property="og:type" content="website">'
              '<meta property="og:image" content="%s/assets/img/share.png">') % (html.escape(title), html.escape(meta['desc']), url, SITE_URL)
    scripts = ''.join('<script src="%s%s" defer></script>' % (r, s) for s in meta.get('scripts', []))
    robots = '<meta name="robots" content="noindex">' if slug == '404' else ''
    return '''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="%(csp)s">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%(title)s</title>
<meta name="description" content="%(desc)s">
%(canonical)s%(og)s%(robots)s
<meta name="theme-color" content="#3B2D8F">
<link rel="icon" href="%(r)sassets/img/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap">
<link rel="stylesheet" href="%(r)sassets/css/style.css">
<script src="%(r)sassets/js/site-config.js"></script>
<script src="%(r)sassets/js/common.js" data-root="%(r)s"></script>
%(schema)s
</head>
<body>
%(header)s
%(body)s
%(footer)s
%(scripts)s
</body>
</html>
''' % dict(csp=csp(), title=html.escape(title), desc=html.escape(meta['desc']), canonical=canonical, og=og, robots=robots, r=r,
           schema=faq_schema(meta.get('faq')) + tool_schema(meta, url) + article_schema(meta, url), header=header(r, meta.get('active')),
           body=body, footer=footer(r), scripts=scripts)

def parse(path):
    src = open(path, encoding='utf-8').read()
    m = re.match(r'\s*<!---(.*?)--->(.*)', src, re.S)
    meta = json.loads(m.group(1))
    body = m.group(2)
    # optional sections split by <!--howto--> marker
    if '<!--howto-->' in body:
        body, how = body.split('<!--howto-->', 1)
        meta['howto_html'] = how
    return meta, body

def main():
    write_site_config()
    pages_dir = os.path.join(HERE, 'pages')
    urls = []
    files = []
    for root, _, names in os.walk(pages_dir):
        for fn in names:
            if fn.endswith('.html'): files.append(os.path.join(root, fn))
    parsed = [parse(f) for f in sorted(files)]
    GUIDES[:] = sorted([m for m, b in parsed if m.get('article')], key=lambda m: m.get('order', 99))
    for meta, body in parsed:
        slug = meta['slug']
        out = os.path.join(ROOT, '404.html') if slug == '404' else os.path.join(ROOT, slug, 'index.html') if slug else os.path.join(ROOT, 'index.html')
        os.makedirs(os.path.dirname(out), exist_ok=True)
        open(out, 'w', encoding='utf-8').write(page(meta, body))
        if slug != '404':
            urls.append((SITE_URL + '/' + (slug + '/' if slug else ''), meta.get('priority', '0.8')))
        print('built', os.path.relpath(out, ROOT))
    today = datetime.date.today().isoformat()
    sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u, p in urls:
        sm.append('  <url><loc>%s</loc><lastmod>%s</lastmod><priority>%s</priority></url>' % (u, today, p))
    sm.append('</urlset>')
    open(os.path.join(ROOT, 'sitemap.xml'), 'w').write('\n'.join(sm) + '\n')
    open(os.path.join(ROOT, 'robots.txt'), 'w').write('User-agent: *\nAllow: /\n\nSitemap: %s/sitemap.xml\n' % SITE_URL)
    print('built sitemap.xml, robots.txt')

if __name__ == '__main__':
    main()
