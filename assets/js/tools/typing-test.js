(function () {
  var $ = function (id) { return document.getElementById(id); };
  // Original practice passages (written for DocAura)
  var TEXTS = {
    en: [
      'Every morning the small town wakes up to the sound of milk vans and temple bells. Shopkeepers lift their shutters, children walk to school with heavy bags, and office workers wait at the bus stop with a cup of tea in their hands. Life here is simple, but it is never slow. Farmers bring fresh vegetables to the market before sunrise, and by noon the streets are full of people buying, selling and talking. In the evening the park fills with families, and old friends sit together to share news about their week.',
      'Good habits are built one small step at a time. A student who reads for twenty minutes every day will finish many books in a year without feeling any pressure. The same rule works for typing practice. If you sit with a straight back, keep your fingers on the home row and look at the screen instead of the keyboard, your speed will grow week after week. Accuracy matters more than speed in the beginning, because every mistake costs time later. Stay calm, breathe slowly and trust the practice you have done.',
      'Digital services have changed the way citizens deal with the government. Today people can apply for certificates, pay electricity bills, book railway tickets and check exam results from a mobile phone. This saves time and reduces the need to stand in long queues. However, every user must stay careful online. Never share a password or a one time code with anyone, even if the caller says that he is from a bank. Read every message slowly, check the website address, and report anything that looks suspicious to the proper authority.',
      'Water is the most precious resource on our planet, yet we often waste it without thinking. A dripping tap can lose many litres in a single day, and careless washing of vehicles uses far more water than needed. Villages that collect rain water in ponds and tanks are able to grow crops even in dry months. Schools can teach children to close taps properly and to reuse water for plants. If every family saves a little water each day, the whole country will be better prepared for the summer.'
    ],
    hi: [
      'हर सुबह हमारा छोटा सा शहर दूध की गाड़ियों और मंदिर की घंटियों की आवाज़ से जागता है। दुकानदार अपनी दुकानें खोलते हैं, बच्चे भारी बस्ते लेकर स्कूल जाते हैं और दफ़्तर जाने वाले लोग बस का इंतज़ार करते हैं। यहाँ का जीवन सादा है, लेकिन कभी धीमा नहीं होता। किसान सूरज निकलने से पहले ताज़ी सब्ज़ियाँ बाज़ार में लाते हैं। शाम को पार्क में परिवार घूमने आते हैं और पुराने दोस्त बैठकर अपने हफ़्ते की बातें करते हैं।',
      'अच्छी आदतें धीरे धीरे बनती हैं। जो विद्यार्थी हर दिन बीस मिनट पढ़ता है, वह साल भर में बिना किसी दबाव के कई किताबें पढ़ लेता है। टाइपिंग के अभ्यास में भी यही नियम काम करता है। सीधे बैठिए, उँगलियों को सही जगह पर रखिए और कीबोर्ड की जगह स्क्रीन पर देखिए। शुरुआत में गति से ज़्यादा शुद्धता ज़रूरी है, क्योंकि हर गलती बाद में समय लेती है। शांत रहिए और अपने अभ्यास पर भरोसा रखिए।',
      'डिजिटल सेवाओं ने नागरिकों और सरकार के बीच का काम आसान कर दिया है। आज लोग मोबाइल फ़ोन से प्रमाण पत्र के लिए आवेदन कर सकते हैं, बिजली का बिल भर सकते हैं और परीक्षा का परिणाम देख सकते हैं। इससे समय बचता है और लंबी कतारों में खड़े होने की ज़रूरत कम होती है। फिर भी हर व्यक्ति को सावधान रहना चाहिए। अपना पासवर्ड या ओटीपी कभी किसी को न बताएँ, चाहे फ़ोन करने वाला खुद को बैंक का कर्मचारी ही क्यों न बताए।'
    ]
  };
  var getLang = SK.choices($('lang'), function () { idx = 0; reset(); });
  var getDur = SK.choices($('dur'), reset);
  var idx = 0, words = [], t0 = 0, timer = null, keys = 0, done = false;
  var box = $('passage'), ta = $('typed');

  function fmt(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  function reset() {
    clearInterval(timer); timer = null; t0 = 0; keys = 0; done = false;
    var list = TEXTS[getLang()], text = list[idx % list.length];
    // Repeat the passage so fast typists never run out of text
    words = (text + ' ' + text + ' ' + text).split(/\s+/);
    box.lang = getLang(); ta.lang = getLang();
    box.innerHTML = '';
    words.forEach(function (w, i) { var s = document.createElement('span'); s.textContent = w; s.id = 'w' + i; box.appendChild(s); box.appendChild(document.createTextNode(' ')); });
    ta.value = ''; ta.disabled = false; $('result').classList.remove('show');
    $('timer').textContent = fmt(Number(getDur())); $('live').textContent = getLang() === 'hi' ? 'टाइप करना शुरू करें — टाइमर अपने आप चलेगा' : 'Start typing to begin the timer';
    paint(); SK.step(1);
  }
  function typedWords() { return ta.value.split(/\s+/).filter(Boolean); }
  function paint() {
    var tw = typedWords(), endsSpace = /\s$/.test(ta.value), cur = endsSpace ? tw.length : Math.max(0, tw.length - 1);
    for (var i = 0; i < Math.min(words.length, tw.length + 2); i++) {
      var el = $('w' + i); if (!el) continue;
      var cls = '';
      if (i < tw.length && (i < cur || endsSpace)) cls = tw[i] === words[i] ? 'ok' : 'bad';
      if (i === cur) cls += ' cur';
      el.className = cls;
    }
    var c = $('w' + cur);
    if (c) { var top = c.offsetTop; if (top > box.scrollTop + box.clientHeight - 40 || top < box.scrollTop) box.scrollTop = top - 10; }
  }
  function stats() {
    var mins = Math.max(1 / 60, (Date.now() - t0) / 60000), tw = typedWords(), ok = 0;
    tw.forEach(function (w, i) { if (w === words[i]) ok++; });
    var wrong = tw.length - ok;
    return { gross: Math.round(tw.length / mins), net: Math.max(0, Math.round(ok / mins)), acc: tw.length ? Math.round(ok * 100 / tw.length) : 0,
      wrong: wrong, typed: tw.length, kdph: Math.round(keys / mins * 60), mins: mins };
  }
  function finish() {
    if (done) return; done = true; clearInterval(timer); ta.disabled = true;
    var s = stats(), hi = getLang() === 'hi', need = hi ? 30 : 35;
    var cells = [['Net speed', s.net + ' WPM'], ['Gross speed', s.gross + ' WPM'], ['Accuracy', s.acc + '%'], ['Mistakes', s.wrong + ' words'], ['Words typed', s.typed], ['KDPH', s.kdph.toLocaleString('en-IN')]];
    $('stats').innerHTML = '';
    cells.forEach(function (c) { var d = document.createElement('div'); var b = document.createElement('b'); b.textContent = c[1]; var sp = document.createElement('span'); sp.textContent = c[0]; d.appendChild(b); d.appendChild(sp); $('stats').appendChild(d); });
    var v = [];
    v.push((s.net >= need ? '✓ ' : '✗ ') + 'SSC CHSL target: ' + need + ' WPM in ' + (hi ? 'Hindi' : 'English') + '.');
    if (!hi) v.push((s.kdph >= 8000 ? '✓ ' : '✗ ') + 'SSC CGL DEST target: 8,000 KDPH.');
    v.push(s.acc < 95 ? 'Tip: slow down a little — accuracy above 95% matters more than raw speed.' : 'Great accuracy! Now practise longer tests (5–10 min).');
    $('verdict').textContent = v.join(' ');
    $('result').classList.add('show'); SK.step(3);
    SK.track('action', { name: 'typing-result', lang: getLang(), wpm: s.net >= 60 ? '60+' : s.net >= 40 ? '40-59' : s.net >= 25 ? '25-39' : '0-24' });
    $('again').focus();
  }
  ta.addEventListener('input', function (e) {
    if (done) return;
    if (!t0) {
      t0 = Date.now(); SK.step(2); SK.used('typing-start', { lang: getLang() });
      var dur = Number(getDur());
      timer = setInterval(function () {
        var left = dur - (Date.now() - t0) / 1000;
        $('timer').textContent = fmt(left);
        var s = stats(); $('live').textContent = s.net + ' WPM · ' + s.acc + '% accurate';
        if (left <= 0) finish();
      }, 250);
    }
    // Key depressions: one per typed character, backspace or new line (works on phones too)
    var it = e.inputType || '';
    if (it === 'insertText') keys += (e.data || ' ').length;
    else if (it.indexOf('delete') === 0 || it === 'insertLineBreak' || it === 'insertParagraph') keys++;
    else if (it === 'insertCompositionText' || it === 'insertReplacementText') keys += 1;
    paint();
    if (typedWords().length >= words.length) finish();
  });
  ta.addEventListener('paste', function (e) { e.preventDefault(); });
  $('next').addEventListener('click', function () { idx++; reset(); ta.focus(); });
  $('again').addEventListener('click', function () { reset(); ta.focus(); });
  reset();
})();
