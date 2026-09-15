/**
 * Baut aus quelle/index.html eine passwortgeschuetzte index.html.
 *
 *   node build.mjs "PASSWORT"
 *
 * Die Seite wird mit AES-256-GCM verschluesselt, der Schluessel per
 * PBKDF2-SHA256 (250.000 Runden) aus dem Passwort abgeleitet. Im Repo
 * liegt nur der verschluesselte Text — ohne Passwort ist er wertlos.
 * Entschluesselt wird im Browser per WebCrypto (nur ueber https).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { pbkdf2Sync, randomBytes, createCipheriv } from 'node:crypto';

const passwort = process.argv[2];
if (!passwort) {
  console.error('Aufruf: node build.mjs "PASSWORT"');
  process.exit(1);
}

const ITER  = 250000;
const quelle = readFileSync(new URL('./quelle/index.html', import.meta.url));

const salt = randomBytes(16);
const iv   = randomBytes(12);
const key  = pbkdf2Sync(Buffer.from(passwort, 'utf8'), salt, ITER, 32, 'sha256');

const cipher = createCipheriv('aes-256-gcm', key, iv);
const geheim = Buffer.concat([cipher.update(quelle), cipher.final(), cipher.getAuthTag()]);

const b64 = (b) => b.toString('base64');

const gate = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Malermeister Andy — geschützte Vorschau</title>
<link rel="icon" href="https://www.malermeister-andy.de/bilder/logo.webp">
<style>
:root{--bg:#1c1b19;--card:#2a2825;--line:rgba(255,255,255,.10);--text:#f6f4f0;--muted:#b3aea5;--gold:#f7d24b;--gold-2:#ffe888}
*{box-sizing:border-box;margin:0;padding:0}
body{
  background:var(--bg);color:var(--text);min-height:100vh;
  font-family:Inter,'Segoe UI',Roboto,Arial,sans-serif;line-height:1.6;
  display:grid;place-items:center;padding:24px;
  background-image:radial-gradient(700px 420px at 70% 10%,rgba(247,210,75,.14),transparent 60%);
}
.tor{width:100%;max-width:430px;text-align:center}
.logo{height:86px;width:auto;margin:0 auto 24px;display:block}
h1{font-size:26px;font-weight:900;letter-spacing:-.8px;line-height:1.15}
.schloss{font-size:30px;margin-bottom:14px}
p.info{color:var(--muted);font-size:14.5px;margin-top:12px}
form{margin-top:26px;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:24px;text-align:left}
label{display:block;font-size:13px;font-weight:700;letter-spacing:.3px;margin-bottom:8px}
input{
  width:100%;background:#191817;border:1px solid rgba(255,255,255,.14);border-radius:10px;
  color:var(--text);font:inherit;font-size:16px;padding:13px 15px;
}
input:focus{outline:none;border-color:var(--gold);box-shadow:0 0 0 3px rgba(247,210,75,.16)}
button{
  margin-top:16px;width:100%;border:0;cursor:pointer;font:inherit;font-weight:700;font-size:15px;
  background:linear-gradient(120deg,var(--gold),var(--gold-2));color:#1c1b19;
  padding:14px 22px;border-radius:999px;
}
button:disabled{opacity:.6;cursor:default}
.fehler{
  margin-top:14px;border-radius:10px;padding:12px 15px;font-size:14px;
  background:rgba(247,210,75,.12);border:1px solid rgba(247,210,75,.35);color:var(--gold-2);
}
.fuss{margin-top:22px;font-size:12px;color:var(--muted)}
</style>
</head>
<body>
<div class="tor">
  <img class="logo" src="https://www.malermeister-andy.de/bilder/logo.webp" alt="Malermeister Andy" onerror="this.remove()">
  <div class="schloss">\u{1F512}</div>
  <h1>Geschützte Vorschau</h1>
  <p class="info">Diese Seite ist noch nicht öffentlich. Der Inhalt liegt verschlüsselt auf dem Server und wird erst mit dem richtigen Passwort im Browser entschlüsselt.</p>

  <form id="tor">
    <label for="pw">Passwort</label>
    <input type="password" id="pw" autocomplete="current-password" autofocus placeholder="Passwort eingeben">
    <button type="submit" id="knopf">Seite öffnen</button>
    <div id="meldung"></div>
  </form>

  <p class="fuss">AES-256-GCM · PBKDF2-SHA256 mit ${ITER.toLocaleString('de-DE')} Runden</p>
</div>

<script>
(function(){
  var DATEN = {
    salt: "${b64(salt)}",
    iv:   "${b64(iv)}",
    text: "${b64(geheim)}",
    iter: ${ITER}
  };

  var form    = document.getElementById('tor');
  var feld    = document.getElementById('pw');
  var knopf   = document.getElementById('knopf');
  var meldung = document.getElementById('meldung');

  function zeige(text){ meldung.innerHTML = '<div class="fehler">' + text + '</div>'; }

  function roh(b64){
    var bin = atob(b64), arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
  }

  if (!window.crypto || !window.crypto.subtle) {
    zeige('Der Browser gibt die Verschl\\u00fcsselung nur \\u00fcber <b>https</b> frei. Bitte die Seite \\u00fcber ihre https-Adresse aufrufen, nicht als lokale Datei.');
    knopf.disabled = true;
    return;
  }

  form.addEventListener('submit', async function(e){
    e.preventDefault();
    var pw = feld.value;
    if (!pw) return zeige('Bitte das Passwort eingeben.');
    knopf.disabled = true;
    knopf.textContent = 'Wird entschl\\u00fcsselt \\u2026';
    meldung.innerHTML = '';
    try {
      var basis = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
      var key = await crypto.subtle.deriveKey(
        { name:'PBKDF2', salt: roh(DATEN.salt), iterations: DATEN.iter, hash:'SHA-256' },
        basis, { name:'AES-GCM', length:256 }, false, ['decrypt']
      );
      var klar = await crypto.subtle.decrypt({ name:'AES-GCM', iv: roh(DATEN.iv) }, key, roh(DATEN.text));
      var html = new TextDecoder().decode(klar);
      document.open(); document.write(html); document.close();
    } catch (err) {
      knopf.disabled = false;
      knopf.textContent = 'Seite \\u00f6ffnen';
      feld.value = '';
      feld.focus();
      zeige('Das Passwort passt nicht. Bitte noch einmal versuchen.');
    }
  });
})();
</script>
</body>
</html>
`;

writeFileSync(new URL('./index.html', import.meta.url), gate, 'utf8');
console.log('OK — index.html verschluesselt gebaut (' + Math.round(gate.length / 1024) + ' KB)');
