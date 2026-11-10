(function () {
  var $ = function (id) { return document.getElementById(id); };
  var WORDS = 'apple river tiger mango cloud stone light ocean pepper rocket silver garden candle forest monkey planet butter window lemon thunder pencil bridge camel rabbit sugar violet anchor jungle marble parrot coffee dragon falcon ginger harbor island jacket kettle ladder magnet needle orange pillow quartz rainbow saddle tomato velvet walnut yellow zebra basket circus donkey engine feather guitar hammer igloo jelly kiwi lotus meadow nectar orbit puzzle quiet ribbon summer tunnel unicorn valley wizard canyon breeze copper dolphin ember glacier honey indigo jasmine koala lantern mirror noodle olive peacock raven saffron tulip urban vapor willow cobalt'.split(' ');
  var getKind = SK.choices($('kind'), function (v) { $('sets').hidden = v === 'phrase'; $('len').min = v === 'phrase' ? 3 : 6; $('len').max = v === 'phrase' ? 10 : 64; $('len').value = v === 'phrase' ? 4 : 16; gen(true); });
  function rnd(n) { // unbiased secure random integer in [0, n)
    var max = Math.floor(0x100000000 / n) * n, a = new Uint32Array(1);
    do { crypto.getRandomValues(a); } while (a[0] >= max);
    return a[0] % n;
  }
  function gen(user) {
    var len = Number($('len').value), out, bits;
    $('len-v').textContent = len + (getKind() === 'phrase' ? ' words' : '');
    if (getKind() === 'phrase') {
      var w = []; for (var i = 0; i < len; i++) { var x = WORDS[rnd(WORDS.length)]; w.push(x[0].toUpperCase() + x.slice(1)); }
      out = w.join('-') + '-' + (10 + rnd(90)); bits = len * Math.log2(WORDS.length) + Math.log2(90);
    } else {
      var sets = [], look = $('x').checked;
      function add(id, chars) { if ($(id).checked) sets.push(look ? chars.replace(/[0O1lI|]/g, '') : chars); }
      add('u', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'); add('l', 'abcdefghijklmnopqrstuvwxyz'); add('d', '0123456789'); add('s', '!@#$%^&*()-_=+[]{};:,.?/');
      if (!sets.length) { $('l').checked = true; return gen(user); }
      var all = sets.join(''), arr = [];
      sets.forEach(function (s) { arr.push(s[rnd(s.length)]); }); // at least one of each chosen type
      while (arr.length < len) arr.push(all[rnd(all.length)]);
      arr = arr.slice(0, len);
      for (var j = arr.length - 1; j > 0; j--) { var k = rnd(j + 1), t = arr[j]; arr[j] = arr[k]; arr[k] = t; }
      out = arr.join(''); bits = len * Math.log2(all.length);
    }
    $('out').textContent = out;
    var pct = Math.min(100, bits / 1.28), label = bits < 40 ? 'Weak' : bits < 60 ? 'OK' : bits < 80 ? 'Strong' : 'Very strong';
    $('str').style.width = pct + '%'; $('str').style.background = bits < 40 ? '#c0392b' : bits < 60 ? '#d68910' : '#1D6B45';
    $('str-t').textContent = label + ' · about ' + Math.round(bits) + ' bits of randomness';
    if (user) SK.used('generate', { kind: getKind() });
  }
  $('len').addEventListener('input', function () { gen(true); });
  ['u', 'l', 'd', 's', 'x'].forEach(function (id) { $(id).addEventListener('change', function () { gen(true); }); });
  $('gen').addEventListener('click', function () { gen(true); });
  $('copy').addEventListener('click', function () { SK.copy($('out').textContent, this); });
  gen(false);
})();
