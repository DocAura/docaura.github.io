(function () {
  var $ = function (id) { return document.getElementById(id); };
  var mode = document.querySelector('[data-mode]').getAttribute('data-mode'); // unlock | protect
  var status = $('status'), result = $('result'), file = null, out = null;
  var base = new URL(SK.root + 'assets/vendor/qpdf/', location.href).href, factory = null;

  async function qpdf(args, input) {
    if (!factory) { await SK.loadScript(base + 'qpdf.js'); factory = window.Module; }
    var log = [], code, m, ce = console.error, cl = console.log, cw = console.warn;
    // qpdf binds the console when it starts and writes its messages there; capture them to explain errors
    console.error = console.log = console.warn = function () { log.push(Array.prototype.join.call(arguments, ' ')); };
    try {
      m = await factory({ locateFile: function () { return base + 'qpdf.wasm'; }, noInitialRun: true });
      m.FS.writeFile('/in.pdf', input);
      try { code = m.callMain(args); } catch (e) { code = (e && typeof e.status === 'number') ? e.status : 2; log.push(String(e && e.message || e)); }
    } finally { console.error = ce; console.log = cl; console.warn = cw; }
    var data = null;
    try { data = m.FS.readFile('/out.pdf'); } catch (e) {}
    // qpdf exit code 3 = finished with warnings (file is still fine)
    return { ok: (code === 0 || code === 3) && data && data.length > 0, data: data, log: log.join('\n') };
  }

  $('show').addEventListener('change', function () {
    var t = this.checked ? 'text' : 'password';
    $('pw').type = t; if ($('pw2')) $('pw2').type = t;
  });

  SK.drop($('drop'), function (files) {
    var f = files[0];
    if (!SK.isPdf(f)) { SK.status(status, 'err', 'Please choose a PDF file.'); return; }
    file = f; result.classList.remove('show');
    $('file-info').innerHTML = ''; $('file-info').appendChild(SK.fileItem(f.name, f.size)); $('file-info').hidden = false;
    $('drop').hidden = true; $('opts').hidden = false; SK.status(status); SK.step(2); $('pw').focus();
  });

  $('go').addEventListener('click', async function () {
    if (!file) return;
    var pw = $('pw').value;
    if (mode === 'protect') {
      if (pw.length < 4) { SK.status(status, 'err', 'Please use a password with at least 4 characters.'); return; }
      if (pw !== $('pw2').value) { SK.status(status, 'err', 'The two passwords are not the same. Please type them again.'); return; }
    }
    var btn = this; btn.disabled = true; SK.status(status, 'info', mode === 'protect' ? 'Locking your PDF…' : 'Unlocking your PDF…');
    try {
      var input = new Uint8Array(await file.arrayBuffer()), r;
      if (mode === 'unlock') {
        r = await qpdf(['--password=' + pw, '--decrypt', '/in.pdf', '/out.pdf'], input);
        if (!r.ok) throw new Error(/password/i.test(r.log) ? (pw ? 'That password is not correct. Please check capital letters and try again.' : 'This PDF needs a password to open. Please type it above.') : 'This PDF could not be unlocked. It may be damaged.');
      } else {
        r = await qpdf(['--encrypt', pw, pw, '256', '--', '/in.pdf', '/out.pdf'], input);
        if (!r.ok) throw new Error(/password/i.test(r.log) ? 'This PDF is already locked. Unlock it first, then add a new password.' : 'This PDF could not be locked. It may be damaged.');
      }
      out = new Blob([r.data], { type: 'application/pdf' });
      $('out-meta').textContent = SK.bytes(out.size) + (mode === 'protect' ? ' · locked with AES-256 · keep your password safe' : ' · opens without a password');
      SK.status(status); result.classList.add('show'); SK.step(3); SK.used(mode);
      $('dl').focus();
    } catch (e) { SK.status(status, 'err', e.message); }
    btn.disabled = false;
  });
  $('dl').addEventListener('click', function () {
    if (out) SK.download(out, SK.baseName(file.name) + (mode === 'protect' ? '-protected.pdf' : '-unlocked.pdf'));
  });
  $('again').addEventListener('click', function () {
    file = out = null; $('pw').value = ''; if ($('pw2')) $('pw2').value = '';
    result.classList.remove('show'); $('opts').hidden = true; $('file-info').hidden = true; $('drop').hidden = false; SK.step(1);
  });
})();
