# Agava

Bakterienkampf auf der Agarplatte: Du entwirfst ein Bakterium, setzt es mit Gegnern auf eine runde Agarplatte und schaust zu, wer sich durchsetzt. Das Spiel ist eine Web-App (PWA), die auf dem iPhone wie eine App läuft, auch offline und ohne App Store.

## Auf dem iPhone spielen

1. **GitHub Pages einschalten** (einmalig): Im Repo auf GitHub unter **Settings → Pages** bei „Build and deployment“ die Quelle **Deploy from a branch** wählen, dann den Branch (`main`, oder vorerst `claude/agava-spiel`) und den Ordner `/ (root)` einstellen und speichern.
2. Nach ein bis zwei Minuten ist das Spiel erreichbar unter `https://nechus0.github.io/agavar/`.
3. Die Adresse in **Safari** öffnen, auf **Teilen** tippen und **„Zum Home-Bildschirm“** wählen. Danach startet Agava im Vollbild und funktioniert auch offline.

> Hinweis: GitHub Pages ist bei privaten Repos nur mit einem bezahlten GitHub-Tarif verfügbar. Alternativ kannst du das Repo öffentlich machen oder den Ordner bei einem anderen kostenlosen Static-Hoster (z. B. Netlify oder Cloudflare Pages) hochladen. Ein Build-Schritt ist nicht nötig.

## Funktionen

- **Karriere**:
  - Jedes Bakterium hat eine eigene Karriere und startet mit 6 Ausbaupunkten und den einfachsten Bewegungsschritten.
  - 10 Level, jedes mit einem besonderen Gegner: einem echten Keim mit seiner typischen Eigenschaft (z. B. Sporen von *Bacillus subtilis*, Toxine von *Staphylococcus aureus*).
  - Jeder erste Sieg bringt +2 Ausbaupunkte und schaltet die Eigenschaft des besiegten Keims frei.
  - Nach dem Sieg erscheint ein Glückwunsch-Popup mit Bild und Fakt zum Keim.
- **Editor**:
  - Bewegungsart als Karte wählen (Geradeaus, Kreisen, Ecken, Welle, Treppe; freischaltbar: Sitzen, Pendeln, Taumeln, Schlängeln, Acht), dazu Größe und Richtung
  - zwei Live-Vorschauen: eine einzelne Zelle und die ganze Kolonie auf einer kleinen Agarplatte
  - Teilung, Stoffwechsel, Geschwindigkeit, Lebensdauer, Verwertung, Chemotaxis, Angriff, Abwehr
  - eine Spezialfähigkeit: Kapsel, Photosynthese, Räuber, Sporen, Biofilm oder Toxine
- **Sterne, Atlas & Erfolge**:
  - drei Sterne pro Level (Sieg, Sieg unter 12 h, 25 % der Platte); alle drei bringen +1 Ausbaupunkt
  - Auswertung nach jedem Spiel mit konkreten Tipps (woran deine Zellen gestorben sind)
  - Bakterien-Atlas mit allen besiegten Keimen und 12 Erfolge
- **Freies Spiel**: eigenes Bakterium mit frei einstellbarem Budget (6–40). Spezialfähigkeiten und besondere Schritte gibt es nur, wenn sie in einer Karriere freigespielt wurden. Dazu 1–5 Zufallsgegner, Plattengröße und Nährboden einstellbar.
- **Simulation**:
  - Pixeldarstellung mit ablaufender Uhr (48 h Brutzeit), Tempo 1× / 2× / 5× / 10×
  - Live-Ereignisse: erster Kontakt, Wendepunkte, ausgerottete Kulturen, Zeitlupe bei knappen Rennen
  - Spezialfähigkeiten sind sichtbar: Giftwolken, helle Sporen, dunkle Biofilm-Matten, hell leuchtende Kapseln, schimmernde Photosynthese, rote Fraßspuren

## Technik

Reines HTML, CSS und JavaScript (ES-Module), ohne Abhängigkeiten und ohne Build-Schritt.

| Datei | Inhalt |
|---|---|
| `js/sim.js` | Simulations-Engine (läuft auch in Node) |
| `js/genome.js` | Eigenschaften, Bewegungsschritte, Punktekosten, Zufallsgegner |
| `js/levels.js` | die 10 Level |
| `js/progression.js` | Karriere- und Freischalt-System |
| `js/insights.js` | Auswertung nach dem Spiel und Erfolge |
| `js/movement.js` | Bewegungsarten und ihre Übersetzung in Schrittmuster |
| `js/germs.js` | echte Keime: Fakten und Zeichnungen |
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
