# Agava – Konzept und Spielregeln

## Idee
Man entwirft ein Bakterium und setzt es mit Gegnern auf eine runde Agarplatte. Sobald die Simulation läuft, greift niemand mehr ein. Man beobachtet nur noch (Tempo 1×, 2×, 5× oder 10×), welche Kultur die anderen verdrängt. Jede Zelle ist ein farbiger Pixel. Eine Runde dauert höchstens 48 Stunden Brutzeit (4000 Simulationsschritte).

## Spielmodi
- **Karriere**:
  - Jedes Bakterium ist eine eigene Karriere und gehört zu genau einer Welt (z. B. Haut). Für jede neue Welt erstellt man ein neues Bakterium; alle freigeschalteten Fähigkeiten bleiben erhalten.
  - Der Würfel im Editor schlägt einen lateinischen Namen vor, der zur Welt passt und keinem echten Keim der Welt oder einem eigenen Bakterium gleicht.
  - Start: 12 Ausbaupunkte, nur die einfachen Schritte, Muster mit höchstens 4 Schritten.
  - Jeder erste Level-Sieg: +1 Ausbaupunkt und die Fähigkeit des besiegten besonderen Gegners (am Ende einer Welt also rund 30 Punkte, plus Sternboni).
  - Punkte können jederzeit neu verteilt werden.
- **Freies Spiel** (vorerst ausgeblendet):
  - eigenes Bakterium, Budget frei einstellbar (10–60)
  - Spezialfähigkeiten und besondere Schritte nur, wenn sie in irgendeiner Karriere freigespielt wurden
  - Zufallsgegner nutzen dieselben Freischaltungen
- Export/Import gibt es bewusst nicht.

## Eigenschaften

Stufen 1–4 kosten je 1 Punkt, 5–7 je 2 und 8–10 je 3 (verteilen ist günstiger als eine Eigenschaft auszureizen).

| Eigenschaft | Stufen | Kosten | Wirkung |
|---|---|---|---|
| Bewegungsart | Art + Größe + Richtung | – | Wird intern in ein Schrittmuster übersetzt. Tochterzellen übernehmen Richtung und Takt. |
| Teilung | sehr früh … sehr spät | kostenlos | Energieschwelle für die Teilung. Früh heißt viele schwache Zellen. |
| Stoffwechsel | genügsam … gefräßig | kostenlos | Nahrungsaufnahme und Grundumsatz steigen gemeinsam |
| Geschwindigkeit | 0–10 | 1/Stufe | Bewegungschance pro Runde 25–95 % |
| Lebensdauer | 0–10 | 1/Stufe | maximales Alter |
| Verwertung | 0–10 | 1/Stufe | Energie pro Nahrungseinheit |
| Chemotaxis | 0–10 | 1/Stufe | Chance je Bewegung (3–12 %), gezielt zur nahrhaftesten Nachbarstelle zu laufen |
| Angriff | 0–10 | 1/Stufe | Kampfwert beim Hineinlaufen in Gegner |
| Abwehr | 0–10 | 1/Stufe | Kampfwert beim Verteidigen |
| Zweiter Fähigkeitsplatz | ab Level 8 | 5 + Fähigkeit | zweite Spezialfähigkeit gleichzeitig |
| Spezialfähigkeit | eine | 4–7 | Sporen 4, Kapsel 5, Photosynthese 5, Biofilm 6, Räuber 6, Toxine 7 (stärkere kosten mehr) |

**Bewegungsarten:**
- Von Anfang an verfügbar:
  - Geradeaus
  - Kreisen (4 Größen, rechts oder links herum)
  - Ecken (Quadrate)
  - Welle
  - Treppe
- Freischaltbar:
  - Sitzen (Level 1)
  - Pendeln (Level 2)
  - Taumeln (Level 3)
  - Schlängeln und Acht (Level 7)
- Größere Varianten gibt es nach Level 2 und Level 5.
- Im Editor zeigen zwei Live-Vorschauen die Bahn einer einzelnen Zelle und die Ausbreitung der ganzen Kolonie auf einer kleinen Platte.

**Spezialfähigkeiten und wie man sie auf der Platte erkennt:**
- **Kapsel**: Jede Zelle übersteht einen tödlichen Angriff. Zellen mit intakter Kapsel leuchten heller.
- **Photosynthese**: +0,3 Energie pro Runde aus Licht, auch ohne Nahrung. Die Zellen schimmern.
- **Räuber**: Ein getöteter Gegner liefert +25 Energie. Rote Fraßspuren auf der Platte.
- **Sporen**: Verhungernde Zellen werden zu hellen, fast weißen Punkten und erwachen bei neuer Nahrung.
- **Biofilm**: Stillstehende Zellen bilden eine dunkle, gemusterte Matte mit +2,5 Abwehr.
- **Toxine**: Eine giftgrüne Wolke um die Kolonie schwächt gegnerische Nachbarn.

## Karriere: Level und besondere Gegner

Die Gegner sind echte Keime. Ihre Spieleigenschaften entsprechen ihren echten Eigenschaften.

Welt 1 (Haut) hat 20 Level. Jedes Level hat ein Szenario mit Begründung („Labornotiz“): Warum ist hier so wenig/viel Futter, warum liegt es in Flecken, im Ring oder in der Mitte? So kann man sich vorbereiten. Ab Level 11 kommt pro Level ein Element auf der Platte hinzu.

| # | Level | Besonderer Gegner | Platte / Element |
|---|---|---|---|
| 1 | Skin Contact | *Staphylococcus epidermidis* | gleichmäßig |
| 2 | Twitching | *Acinetobacter johnsonii* | Poren |
| 3 | Hot Tub Rash | *Pseudomonas aeruginosa* | Poren |
| 4 | The Sore | *Streptococcus pyogenes* | Flecken |
| 5 | Armpit | *Corynebacterium* | Poren |
| 6 | Sweaty Feet | *Brevibacterium linens* | Poren, wenig Futter |
| 7 | Tick Bite | *Borrelia burgdorferi* | Mitte |
| 8 | The Catheter | *Staphylococcus epidermidis* (Biofilm) | Schnitt |
| 9 | Tropical Sore | *Corynebacterium diphtheriae* | körnig |
| 10 | The Abscess | *Staphylococcus aureus* | Schnitt |
| 11 | Gravel Graze | *Staphylococcus lugdunensis* | Steine |
| 12 | Antiseptic Cream | *Corynebacterium jeikeium* | Antibiotika-Plättchen (zweites nach 20 h auf die größte Kolonie) |
| 13 | Beach Towel | *Dermacoccus nishinomiyaensis* | Sonne & Schatten |
| 14 | Salt Crust | *Brevibacterium linens* | Salzkristalle |
| 15 | Acid Mantle | *Cutibacterium acnes* | saure Seite |
| 16 | Honey Dressing | *Finegoldia magna* | Honigtropfen, kein Nachwachsen |
| 17 | Fever | *Streptococcus pyogenes* | warme & kalte Seite |
| 18 | Rinsing | *Pasteurella multocida* | Strömung |
| 19 | Mouldy Plaster | *Staphylococcus aureus* | Penicillin-Schimmel |
| 20 | Pus & Phages | *Pseudomonas aeruginosa* | Immunzellen und Phagen |

## Elemente auf der Platte

Alle Elemente sind deterministisch (gleicher Seed = gleicher Verlauf) und werden in `js/sim.js` simuliert, Texte stehen in `js/elements.js`. Jedes Element wird beim ersten Auftreten mit einem Info-Blatt vorgestellt, steht in der Legende unter der Platte, und geplante Ereignisse sind als Marken auf der Zeitleiste sichtbar und werden als Meldung unter der Platte angekündigt.

| Element | Wirkung | Darstellung |
|---|---|---|
| Steine | blockieren den Weg | graue Steine |
| Antibiotika-Plättchen | tötet im Hemmhof, Hof schrumpft mit der Zeit; Kapsel/Biofilm halten länger | weißes Plättchen, klarer Ring |
| Sonne & Schatten | Sonne kostet Energie, Schatten schützt; Schleim schützt; Photosynthese nur im Licht stark | helle und abgedunkelte Hälfte |
| Salzkristalle | Futter wächst schnell nach, Salz zieht Energie | weiße Kristalle, helle Zone |
| Saure Seite | Zellen altern schneller; Abwehr/Biofilm schützen | rötliche Tönung |
| Honigtropfen | frisches Futter, eine Stunde vorher markiert | blinkender Ring, Welle |
| Warm & kalt | warm: alles schneller (Fressen, Bewegung, Altern), kalt: langsamer | orange/blaue Tönung |
| Strömung | schiebt Zellen weiter, Biofilm klebt | wandernde helle Streifen |
| Penicillin-Schimmel | wächst und schiebt einen Hemmhof vor sich her | weißgrüner Flaum mit klarem Ring |
| Phagen | befallen die größte Kolonie, springen auf Nachbarn derselben Kolonie über; Kapsel schützt meist | Zellen werden blass und platzen |
| Immunzellen | ziehen zur größten Kolonie und fressen, was sie berühren | große, blasse Zellen mit Kern |

Die Schwierigkeit wird per Massensimulation geprüft (`node tools/levels-check.mjs`). Dabei halten die Spieler-Bakterien das Karriere-Budget und die bis dahin freigeschalteten Fähigkeiten ein. Getestet werden drei Spielertypen:
- zufällig gebaute Bakterien
- ein „faules“ Bakterium (Punkte gleichmäßig verteilt, nur geradeaus)
- ein per Optimierung gefundenes „cleveres“ Bakterium

Ziel: Ein durchdachter Entwurf schafft jedes Level, ein unüberlegter ab Level 3 kaum noch.

## Ablauf einer Runde
Alle Zellen werden in zufälliger Reihenfolge abgearbeitet:
1. **Altern und Grundumsatz**
2. **Fressen**
3. **Sterben**: bei zu hohem Alter oder leerer Energie (mit Sporen: Sporenbildung statt Tod)
4. **Toxine**: Abgabe von Giftstoffen
5. **Bewegen**: nächster Musterschritt
   - Der Plattenrand lässt die Zelle umkehren.
   - Ein Gegner bedeutet Kampf: Angriff + Zufall gegen Abwehr + Energiebonus + Zufall.
6. **Teilen**: Die Tochterzelle übernimmt Richtung und Musterfortschritt.

## Motivation: Sterne, Auswertung, Atlas, Erfolge, Ereignisse
- **Drei Sterne pro Level**:
  - ★ Sieg
  - ★ Sieg in unter 12 h
  - ★ zeitweise 25 % der Platte besiedelt

  Sterne aus verschiedenen Versuchen zählen zusammen. Alle drei bringen +1 Ausbaupunkt.
- **Auswertung**: Nach jedem Spiel gibt es 1–4 Punkte, z. B. „Knapp! Zeitweise 41 % aller Zellen“, „Die Toxine von *S. aureus* haben 812 deiner Zellen getötet“ oder Tipps für fehlende Sterne. Grundlage ist eine Statistik der Todesursachen (verhungert, Alter, Kampf, Toxin) und wer wen getötet hat.
- **Bakterien-Atlas**: Jeder besiegte Keim erscheint mit Bild, Fakt und Fähigkeit. Unentdeckte Keime zeigen nur ihre Silhouette.
- **Erfolge** (12 Stück): z. B. Blitzsieg, Kolonie-Riese, Comeback, Stubenhocker, Purist, Meister der Agarplatte.
- **Live-Ereignisse**: Banner über der Platte bei:
  - erstem Kontakt
  - Führungswechsel
  - ausgerotteter Kultur
  - „Noch 6 Stunden“
  - knappem Rennen in den letzten 3 Stunden: Dann wird automatisch auf Zeitlupe (1×) gebremst.

## Spielende
- Nur noch eine Kultur lebt, **oder**
- eine Kultur stellt lange Zeit mindestens 97 % aller Zellen, **oder**
- nach 48 h Brutzeit gewinnt die größte Kultur.
