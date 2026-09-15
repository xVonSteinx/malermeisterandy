# Malermeister Andy — geschützte Vorschau

Diese Seite ist noch **nicht öffentlich**. Im Repository liegt ausschließlich
eine verschlüsselte Fassung: Ohne Passwort ist der Inhalt unlesbar — auch für
Suchmaschinen und für jeden, der hier hineinschaut.

* **Verfahren:** AES-256-GCM, Schlüssel per PBKDF2-SHA256 mit 250.000 Runden
* **Entschlüsselt** wird erst im Browser des Besuchers (WebCrypto, nur über https)
* Das Passwort steht **nirgends** im Repository

## Neu bauen

Die unverschlüsselte Originalseite liegt lokal unter `quelle/index.html`
(per `.gitignore` vom Repository ausgeschlossen). Nach einer Änderung:

```bash
node build.mjs "DAS-PASSWORT"
git commit -am "Seite aktualisiert"
git push
```

`build.mjs` erzeugt daraus die verschlüsselte `index.html` mit der Passwortabfrage.
