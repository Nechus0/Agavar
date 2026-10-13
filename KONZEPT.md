# Agava – Konzept und Spielregeln

## Idee
Man entwirft ein Bakterium und setzt es mit Gegnern auf eine runde Agarplatte. Sobald die Simulation läuft, greift niemand mehr ein. Man beobachtet nur noch (Tempo 1×, 2×, 5× oder 10×), welche Kultur die anderen verdrängt. Jede Zelle ist ein farbiger Pixel. Eine Runde dauert höchstens 48 Stunden Brutzeit (4000 Simulationsschritte).

## Spielmodi
- **Karriere**:
  - Jedes Bakterium ist eine eigene Karriere. Es muss zuerst selbst erstellt werden; ein vorgefertigtes Bakterium gibt es nicht.
  - Start: 6 Ausbaupunkte, nur die einfachen Schritte, Muster mit höchstens 4 Schritten.
  - Jeder erste Level-Sieg: +2 Ausbaupunkte und die Fähigkeit des besiegten besonderen Gegners.
  - Punkte können jederzeit neu verteilt werden.
- **Freies Spiel**:
  - eigenes Bakterium, Budget frei einstellbar (6–40)
  - Spezialfähigkeiten und besondere Schritte nur, wenn sie in irgendeiner Karriere freigespielt wurden
  - Zufallsgegner nutzen dieselben Freischaltungen
- Export/Import gibt es bewusst nicht.

## Eigenschaften

| Eigenschaft | Stufen | Kosten | Wirkung |
|---|---|---|---|
| Bewegungsart | Art + Größe + Richtung | – | Wird intern in ein Schrittmuster übersetzt. Tochterzellen übernehmen Richtung und Takt. |
| Teilung | sehr früh … sehr spät | kostenlos | Energieschwelle für die Teilung. Früh heißt viele schwache Zellen. |
| Stoffwechsel | genügsam … gefräßig | kostenlos | Nahrungsaufnahme und Grundumsatz steigen gemeinsam |
| Geschwindigkeit | 0–4 | 1/Stufe | Bewegungschance pro Runde 25–95 % |
| Lebensdauer | 0–4 | 1/Stufe | maximales Alter |
| Verwertung | 0–4 | 1/Stufe | Energie pro Nahrungseinheit |
| Chemotaxis | 0–4 | 1/Stufe | Chance je Bewegung (3–12 %), gezielt zur nahrhaftesten Nachbarstelle zu laufen |
| Angriff | 0–5 | 1/Stufe | Kampfwert beim Hineinlaufen in Gegner |
| Abwehr | 0–5 | 1/Stufe | Kampfwert beim Verteidigen |
| Spezialfähigkeit | eine | 3 | Kapsel, Photosynthese, Räuber, Sporen, Biofilm, Toxine |

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

| # | Level | Besonderer Gegner | echte Eigenschaft | Freischaltung |
|---|---|---|---|---|
| 1 | Hautkontakt | *Staphylococcus epidermidis* | hat keine Geißeln, bewegt sich nicht | Bewegungsart „Sitzen“ |
| 2 | Das Rudel | *Myxococcus xanthus* | gleitet und kehrt regelmäßig die Richtung um, jagt im Rudel | Bewegungsart „Pendeln“, größere Muster |
| 3 | Run and Tumble | *Escherichia coli* | schwimmt geradeaus, taumelt dann in eine Zufallsrichtung | Bewegungsart „Taumeln“ |
| 4 | Die Kapsel | *Klebsiella pneumoniae* | dicke Schleimkapsel | Kapsel |
| 5 | Lichtfänger | *Synechococcus elongatus* | Cyanobakterium, Photosynthese | Photosynthese, größere Bewegungsmuster |
| 6 | Hungersnot | *Bacillus subtilis* | bildet Endosporen | Sporen |
| 7 | Der Räuber | *Bdellovibrio bacteriovorus* | Raubbakterium, frisst andere Bakterien | Räuber, Bewegungsarten „Schlängeln“ und „Acht“ (gezeigt vom Begleiter *Helicobacter pylori*) |
| 8 | Schleimfestung | *Pseudomonas aeruginosa* | Paradebeispiel für Biofilme | Biofilm |
| 9 | Giftküche | *Staphylococcus aureus* | bildet viele Toxine | Toxine |
| 10 | Der Endgegner | *Clostridium botulinum* | Sporen und Botulinumtoxin | Titel „Meister der Agarplatte“ |

**Begleitgegner** (ebenfalls echte Keime, mit passenden Eigenschaften):
- *Pseudomonas putida*: riecht Nahrung (Chemotaxis 2)
- *Proteus mirabilis*: schnell schwärmend
- *Helicobacter pylori*: schlängelt sich korkenzieherartig
- *Micrococcus luteus*: gelb, unbeweglich
- *Lactobacillus acidophilus*: Milchsäure, hoher Angriff
- *Serratia marcescens*: roter Farbstoff mit antimikrobieller Wirkung
- *Vibrio cholerae*: sehr schneller Schwimmer
- *Bacillus cereus*: Sporen

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
  - ★ zeitweise 30 % der Platte besiedelt

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
