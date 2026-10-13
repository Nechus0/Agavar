# Agava

Bakterienkampf auf der Agarplatte: Du entwirfst ein Bakterium, setzt es mit Gegnern auf eine runde Agarplatte und schaust zu, wer sich durchsetzt. Das Spiel ist eine Web-App (PWA), die auf dem iPhone wie eine App läuft, auch offline und ohne App Store.

## Auf dem iPhone spielen

1. **GitHub Pages einschalten** (einmalig): Im Repo auf GitHub unter **Settings → Pages** bei „Build and deployment“ die Quelle **Deploy from a branch** wählen, dann den Branch (`main`, oder vorerst `claude/agava-spiel`) und den Ordner `/ (root)` einstellen und speichern.
2. Nach ein bis zwei Minuten ist das Spiel erreichbar unter `https://nechus0.github.io/agavar/`.
3. Die Adresse in **Safari** öffnen, auf **Teilen** tippen und **„Zum Home-Bildschirm“** wählen. Danach startet Agava im Vollbild und funktioniert auch offline.

> Hinweis: GitHub Pages ist bei privaten Repos nur mit einem bezahlten GitHub-Tarif verfügbar. Alternativ kannst du das Repo öffentlich machen oder den Ordner bei einem anderen kostenlosen Static-Hoster (z. B. Netlify oder Cloudflare Pages) hochladen. Ein Build-Schritt ist nicht nötig.

## Funktionen

- **Labor**: Bakterien erstellen, bearbeiten, kopieren und löschen. Zum Sichern oder Teilen per Code exportieren oder importieren.
- **Editor**:
  - Bewegungsmuster aus bis zu 6 Schritten (vor, halb/ganz rechts und links, umkehren, warten, Zufall) mit animierter Vorschau und Vorlagen
  - kostenlose Abwägungen bei Teilung und Stoffwechsel
  - Geschwindigkeit, Lebensdauer, Verwertung, Angriff und Abwehr
  - eine Spezialfähigkeit mit eigenem Symbol: Sporen, Chemotaxis, Biofilm oder Giftwolke
  - alles mit Punktebudget
- **10 Level** mit eigenem Budget pro Level (8 bis 20 Punkte) und Gegnern auf Augenhöhe. Jeder Sieg schaltet das nächste Level und neue Fähigkeiten frei (Schritte, höhere Stufen, längere Muster, Spezialfähigkeiten).
- **Freies Spiel**: 1–5 Zufallsgegner. Einstellbar sind Punktebudget (6–40), Plattengröße, Nährbodenverteilung, Nährstoffmenge und Nachwachsen.
- **Simulation**: Pixeldarstellung, Tempo 1× / 2× / 5× / 10×, Pause, Live-Anteile.
- **Ergebnis**:
  - Verlaufskurve und Statistik
  - Revanche mit exakt gleichem Startzustand
  - gute Gegner per „+ Labor“ übernehmen

## Technik

Reines HTML, CSS und JavaScript (ES-Module), ohne Abhängigkeiten und ohne Build-Schritt.

| Datei | Inhalt |
|---|---|
| `js/sim.js` | Simulations-Engine (läuft auch in Node) |
| `js/genome.js` | Eigenschaften, Punktekosten, Zufallsgegner, Export-Codes |
| `js/levels.js` | die 10 Level |
| `js/progression.js` | Freischalt-System |
| `js/icons.js` | SVG-Symbole |
| `js/render.js` | Canvas-Darstellung, Verlaufskurve, Mustervorschau |
| `js/main.js` | Bildschirme und Spielablauf |
| `js/storage.js` | Speichern auf dem Gerät |
| `sw.js`, `manifest.webmanifest` | Offline-Fähigkeit und App-Installation |

Entwicklung:

```sh
python3 -m http.server 8000        # lokal starten, dann http://localhost:8000
node --test tests/*.test.mjs       # Tests
node tools/levels-check.mjs        # Schwierigkeit der Level prüfen (dauert einige Minuten)
node tools/make-icons.mjs          # App-Icons neu erzeugen
```

Das ausführliche Konzept steht in [KONZEPT.md](KONZEPT.md).
