"""Make the social preview pictures (1200x630) shown when a tool link is shared on WhatsApp,
Facebook, X or Telegram, plus the app icons. Run once after adding tools:  python3 build/og_images.py
Needs Playwright with Chromium (only on the computer that builds, not on the website)."""
import os, sys, html
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build as B
from playwright.sync_api import sync_playwright

OUT = os.path.join(B.ROOT, 'assets', 'img', 'og')
IMG = os.path.join(B.ROOT, 'assets', 'img')

def card(name, desc, ic, slug=''):
    first = 'First resume free' if slug == 'resume-builder' else 'Free'
    chips = ''.join('<span>✓ %s</span>' % c for c in [first, 'No login', 'No watermark', 'Files stay on your phone'])
    return '''<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0}body{width:1200px;height:630px;font-family:Poppins,sans-serif;background:#F4EEF6;color:#221A5C;overflow:hidden}
.wrap{position:absolute;inset:36px;background:#fff;border-radius:44px;padding:58px 64px;display:flex;gap:48px;align-items:center;box-shadow:0 30px 60px -30px rgba(59,45,143,.45)}
.l{flex:1;display:flex;flex-direction:column;gap:22px}
.brand{display:flex;align-items:center;gap:14px;font-size:34px}.brand i{width:56px;height:56px;border-radius:16px;background:#3B2D8F;display:flex;align-items:center;justify-content:center}
.brand b{font-weight:800}
h1{font-size:%(fs)dpx;line-height:1.08;font-weight:800;color:#3B2D8F}
p{font-size:29px;line-height:1.35;color:#4A4370}
.chips{display:flex;flex-wrap:wrap;gap:10px}.chips span{background:#DDF3E6;color:#1D6B45;font-weight:700;font-size:22px;padding:8px 16px;border-radius:99px}
.r{width:300px;height:300px;border-radius:70px;background:#3B2D8F;display:flex;align-items:center;justify-content:center;box-shadow:inset 0 -14px 0 rgba(0,0,0,.18),0 30px 50px -20px rgba(59,45,143,.6);flex:none;transform:rotate(-4deg)}
.blob{position:absolute;right:-60px;top:-60px;width:330px;height:330px;border-radius:50%%;background:#F7D9E3;z-index:-1}
</style></head><body><div class="blob"></div><div class="wrap"><div class="l">
<div class="brand"><i>%(logo)s</i><span>Doc<b>Aura</b></span></div>
<h1>%(name)s</h1><p>%(desc)s</p><div class="chips">%(chips)s</div></div>
<div class="r">%(icon)s</div></div></body></html>''' % dict(name=html.escape(name), desc=html.escape(desc), chips=chips, icon=B.icon(ic, 170, '#FFFFFF', 1.8),
        logo=B.icon('logo', 36, '#FFFFFF'), fs=74 if len(name) <= 22 else 60)

def icon_html(size, pad):
    inner = size - 2 * pad
    return ('<!doctype html><html><body style="margin:0;background:transparent"><div style="width:%dpx;height:%dpx;background:#3B2D8F;display:flex;align-items:center;justify-content:center;%s">%s</div></body></html>'
            % (size, size, '' if pad else 'border-radius:%dpx' % (size // 4.5), B.icon('logo', int(inner * 0.62), '#FFFFFF', 2)))

def main():
    os.makedirs(OUT, exist_ok=True)
    with sync_playwright() as pw:
        br = pw.chromium.launch(); pg = br.new_page(viewport={'width': 1200, 'height': 630})
        for t in B.TOOLS:
            pg.set_content(card(t['name'], t['desc'], t['icon'], t['slug'])); pg.wait_for_timeout(150)
            pg.screenshot(path=os.path.join(OUT, t['slug'] + '.png'))
        pg.set_content(card('30+ free tools for PDF, photos & resume', 'Compress PDF, resize photo to KB, resume builder, image to text, QR codes and more.', 'logo'))
        pg.wait_for_timeout(150); pg.screenshot(path=os.path.join(IMG, 'share.png'))
        for size, name, pad in [(192, 'icon-192.png', 0), (512, 'icon-512.png', 0), (512, 'icon-maskable-512.png', 60)]:
            p2 = br.new_page(viewport={'width': size, 'height': size})
            p2.set_content(icon_html(size, pad)); p2.screenshot(path=os.path.join(IMG, name), omit_background=True); p2.close()
        br.close()
    print('made', len(B.TOOLS), 'preview pictures + share.png + 3 app icons')

if __name__ == '__main__':
    main()
