(function () {
  var $ = function (id) { return document.getElementById(id); };
  var status = $('status'), result = $('result');
  var getLang = SK.choices($('lang'));
  var worker = null, workerLang = '';
  var base = new URL(SK.root + 'assets/vendor/ocr/', location.href).href;

  async function getWorker(lang, onProg) {
    if (worker && workerLang === lang) return worker;
    if (worker) { try { await worker.terminate(); } catch (e) {} worker = null; }
    await SK.loadScript(base + 'tesseract.min.js');
    worker = await window.Tesseract.createWorker(lang.split('+'), 1, {
      workerPath: base + 'worker.min.js', corePath: base, langPath: base + 'lang', gzip: true,
      cacheMethod: 'write', logger: function (m) { if (onProg) onProg(m); }
    });
    workerLang = lang;
    return worker;
  }

  SK.drop($('drop'), async function (files) {
    var list = files.filter(SK.isImage);
    if (!list.length) { SK.status(status, 'err', 'Please choose a photo or screenshot.'); return; }
    result.classList.remove('show'); SK.step(2);
    var lang = getLang(), texts = [];
    try {
      var cur = 0;
      var w = await getWorker(lang, function (m) {
        if (m.status === 'recognizing text') SK.status(status, 'info', 'Reading text' + (list.length > 1 ? ' (image ' + (cur + 1) + ' of ' + list.length + ')' : '') + '…', 20 + m.progress * 80);
        else if (/load|initiali/.test(m.status)) SK.status(status, 'info', 'Getting the reader ready (first time only)…', Math.min(20, (m.progress || 0) * 20));
      });
      for (cur = 0; cur < list.length; cur++) {
        var f = list[cur], src = f;
        if (SK.isHeic(f)) src = await SK.heicToJpeg(f, 0.92);
        var r = await w.recognize(src);
        texts.push((r.data.text || '').trim());
      }
      var all = texts.filter(Boolean).join('\n\n');
      if (!all) throw new Error('No text could be found. Try a sharper, brighter photo taken straight from above.');
      $('out').value = all; $('out').lang = lang === 'hin' ? 'hi' : '';
      var words = all.split(/\s+/).filter(Boolean).length;
      $('meta').textContent = words + ' words from ' + list.length + (list.length === 1 ? ' image' : ' images') + '. Check and fix any small mistakes below.';
      SK.status(status); result.classList.add('show'); SK.step(3);
      SK.used('ocr', { lang: lang });
    } catch (e) { SK.status(status, 'err', e.message || SK.errText(e)); }
  });
  $('copy').addEventListener('click', function () { SK.copy($('out').value, this); });
  $('dl').addEventListener('click', function () { SK.download(new Blob([$('out').value], { type: 'text/plain;charset=utf-8' }), 'text-from-image.txt'); });
  $('again').addEventListener('click', function () { result.classList.remove('show'); SK.step(1); $('drop').querySelector('input').click(); });
})();
