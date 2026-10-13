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
| Bewegungsmuster | 1–6 Schritte, je ×1 bis ×4 | – | Folge, die sich endlos wiederholt; Drehungen relativ zur Blickrichtung. Tochterzellen übernehmen Richtung und Takt. |
| Teilung | sehr früh … sehr spät | kostenlos | Energieschwelle für die Teilung. Früh heißt viele schwache Zellen. |
| Stoffwechsel | genügsam … gefräßig | kostenlos | Nahrungsaufnahme und Grundumsatz steigen gemeinsam |
| Geschwindigkeit | 0–4 | 1/Stufe | Bewegungschance pro Runde 25–95 % |
| Lebensdauer | 0–4 | 1/Stufe | maximales Alter |
| Verwertung | 0–4 | 1/Stufe | Energie pro Nahrungseinheit |
| Angriff | 0–5 | 1/Stufe | Kampfwert beim Hineinlaufen in Gegner |
| Abwehr | 0–5 | 1/Stufe | Kampfwert beim Verteidigen |
| Spezialfähigkeit | eine | 3 | Chemotaxis, Sporen, Biofilm, Toxine |

**Bewegungsschritte:**
- vor
- halbrechts und halblinks (45°)
- rechts und links (90°)
- warten
- taumeln (zufällige Richtung)
- umkehren (180°)
- Seitenwechsel (rechts und links ab jetzt vertauscht)

**Spezialfähigkeiten und wie man sie auf der Platte erkennt:**
- **Chemotaxis**: Die Kolonie zieht gezielt zu nahrhaften Stellen.
- **Sporen**: Verhungernde Zellen werden zu hellen, fast weißen Punkten und erwachen bei neuer Nahrung.
- **Biofilm**: Stillstehende Zellen bilden eine dunkle, gemusterte Matte mit +2,5 Abwehr.
- **Toxine**: Eine giftgrüne Wolke um die Kolonie schwächt gegnerische Nachbarn.

## Karriere: Level und besondere Gegner

Die Gegner sind echte Keime. Ihre Spieleigenschaften entsprechen ihren echten Eigenschaften.

| # | Level | Besonderer Gegner | echte Eigenschaft | Freischaltung |
|---|---|---|---|---|
| 1 | Hautkontakt | *Staphylococcus epidermidis* | hat keine Geißeln, bewegt sich nicht | Schritt „warten“ |
| 2 | Das Rudel | *Myxococcus xanthus* | gleitet und kehrt regelmäßig die Richtung um, jagt im Rudel | Schritt „umkehren“, 5. Musterplatz |
| 3 | Run and Tumble | *Escherichia coli* | schwimmt geradeaus, taumelt dann in eine Zufallsrichtung | Schritt „taumeln“ |
| 4 | Der Spürhund | *Pseudomonas putida* | Chemotaxis zu Nährstoffen | Chemotaxis |
| 5 | Schwärmer | *Proteus mirabilis* | schwärmt rhythmisch in langen Bahnen (Ringmuster) | Wiederholungen ×2–×4, 6. Musterplatz |
| 6 | Hungersnot | *Bacillus subtilis* | bildet Endosporen | Sporen |
| 7 | Korkenzieher | *Helicobacter pylori* | korkenzieherförmig, schraubt sich durch Schleim | Schritt „Seitenwechsel“ |
| 8 | Schleimfestung | *Pseudomonas aeruginosa* | Paradebeispiel für Biofilme | Biofilm |
| 9 | Giftküche | *Staphylococcus aureus* | bildet viele Toxine | Toxine |
| 10 | Der Endgegner | *Clostridium botulinum* | Sporen und Botulinumtoxin | Titel „Meister der Agarplatte“ |

**Begleitgegner** (ebenfalls echte Keime, mit passenden Eigenschaften):
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

## Spielende
- Nur noch eine Kultur lebt, **oder**
- eine Kultur stellt lange Zeit mindestens 97 % aller Zellen, **oder**
- nach 48 h Brutzeit gewinnt die größte Kultur.
