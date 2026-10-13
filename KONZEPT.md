# Agava – Konzept und Spielregeln

## Idee
Man entwirft ein Bakterium und setzt es mit Gegnern auf eine runde Agarplatte. Sobald die Simulation läuft, greift niemand mehr ein. Man beobachtet nur noch (Tempo 1×, 2×, 5× oder 10×), welche Kultur die anderen verdrängt. Jede Zelle ist ein farbiger Pixel.

## Getroffene Entscheidungen
- **Plattform**: Web-App (PWA). Läuft in Safari, lässt sich auf dem Home-Bildschirm installieren und funktioniert offline. Kein App Store nötig.
- **Punktebudget**: Im freien Spiel einstellbar (6–40 Punkte, Standard 20). In den Leveln hat jedes Level sein eigenes Budget (8 → 20), die Gegner haben ungefähr gleich viele Punkte.
- **Freischalten**: Fähigkeiten gibt es erst nach und nach (siehe unten).
- **Nährboden**: einstellbar nach Verteilung, Menge und Nachwachsen.
- **Sprache**: Deutsch.
- **10 Level** mit aufsteigend schwereren Gegnern.

## Eigenschaften eines Bakteriums

| Eigenschaft | Stufen | Kosten | Wirkung |
|---|---|---|---|
| Bewegungsmuster | 1–6 Schritte: vor, halbrechts/halblinks (45°), rechts/links (90°), umkehren, warten, Zufall | – | Folge, die sich endlos wiederholt; Drehungen relativ zur Blickrichtung |
| Teilung | sehr früh … sehr spät | kostenlos | Energieschwelle für die Teilung (26–80). Früh heißt viele schwache Zellen. |
| Stoffwechsel | genügsam … gefräßig | kostenlos | Nahrungsaufnahme und Grundumsatz steigen gemeinsam |
| Geschwindigkeit | 0–4 | 1/Stufe | Bewegungschance pro Runde 25–95 %. Jede Bewegung kostet Energie. |
| Lebensdauer | 0–4 | 1/Stufe | maximales Alter 50–200 Runden (±20 %) |
| Verwertung | 0–4 | 1/Stufe | Energie pro Nahrungseinheit 0,5–1,06 |
| Angriff | 0–5 | 1/Stufe | Kampfwert beim Hineinlaufen in Gegner |
| Abwehr | 0–5 | 1/Stufe | Kampfwert beim Verteidigen (dazu ein Bonus durch die eigene Energie) |
| Spezialfähigkeit | eine | 3 | siehe unten |

**Spezialfähigkeiten:**
- **Sporen**: Verhungernde Zellen werden zu ruhenden Sporen und erwachen, wenn wieder Nahrung da ist. Sporen leben höchstens 400 Runden.
- **Chemotaxis**: In 35 % der Bewegungen geht es zum nahrungsreichsten Nachbarfeld statt dem Muster nach.
- **Biofilm**: Zellen, die mindestens 4 Runden stillstehen, erhalten +2,5 Abwehr.
- **Giftwolke**: Mit 25 % Chance pro Runde verliert eine gegnerische Nachbarzelle 7 Energie.

## Ablauf einer Runde
Alle Zellen werden in zufälliger Reihenfolge abgearbeitet:
1. **Altern und Grundumsatz**: Das Alter steigt, der Grundumsatz zieht Energie ab.
2. **Fressen**: Die Zelle nimmt Nährstoff vom eigenen Feld auf.
3. **Sterben**: bei zu hohem Alter oder leerer Energie (mit Sporen: Sporenbildung statt Tod). Tote Zellen geben etwas Nahrung an den Boden zurück.
4. **Bewegen**: Die Zelle führt den nächsten Musterschritt aus.
   - Der Plattenrand lässt die Zelle umkehren.
   - Eigene Zellen blockieren.
   - Ein Gegner bedeutet Kampf: `Angriff + Zufall(0–3)` gegen `Abwehr + Energie/50 + Zufall(0–3)`.
5. **Teilen**: Ab der Teilungsschwelle entsteht eine Tochterzelle auf einem freien Nachbarfeld. Die Energie wird geteilt.

## Spielende
- Nur noch eine Kultur lebt, **oder**
- eine Kultur stellt 250 Runden lang mindestens 97 % aller Zellen, **oder**
- nach 4000 Runden gewinnt die größte Kultur.

## Freischalten

| Nach Sieg in | Neu verfügbar |
|---|---|
| Start | Schritte vor, halb/ganz rechts und links, warten; Stufe 2; Muster bis 4 Schritte |
| Level 1 | Umkehren, Stufe 3 |
| Level 2 | Chemotaxis |
| Level 3 | Zufallsschritt, Muster bis 5 Schritte |
| Level 4 | Sporen, Stufe 4 |
| Level 5 | Biofilm, Muster bis 6 Schritte |
| Level 6 | Stufe 5 (Angriff/Abwehr) |
| Level 7 | Giftwolke |

## Level

| # | Name | Budget | Gegner (Punkte) | Besonderheit |
|---|---|---|---|---|
| 1 | Erste Schritte | 8 | 8 | träger Gegner |
| 2 | Der Wanderer | 9 | 8 | kreisender Gegner |
| 3 | Zwei auf einmal | 10 | 9, 9 | erstmals drei Kulturen |
| 4 | Fleckenteppich | 12 | 11, 11 | Nahrung in Flecken, Chemotaxis-Gegner |
| 5 | Der Ring | 13 | 11, 11, 11 | nur der Rand ist nahrhaft |
| 6 | Hungersnot | 14 | 13, 14 | wenig Nahrung, Sporen |
| 7 | Giftküche | 15 | 13, 13, 13 | Giftwolke (noch nicht freigeschaltet) |
| 8 | Festung | 16 | 17, 17 | Biofilm-Bollwerk, große Platte |
| 9 | Übermacht | 18 | 4 × 16 | vier starke Gegner |
| 10 | Der Endgegner | 20 | 22, 19, 19 | Boss |

Die Schwierigkeit wird per Massensimulation geprüft (`tools/levels-check.mjs`). Die Spieler-Bakterien halten dabei das Level-Budget und die bis dahin freigeschalteten Fähigkeiten ein. Gemessen werden zufällig gebaute Bakterien und ein per Optimierung gefundenes „cleveres“ Bakterium. Aktueller Stand: Zufällige Entwürfe gewinnen Level 1 meist (~80 %), Level 2 selten (~25 %) und ab Level 3 so gut wie nie (0–13 %). Ein optimierter Entwurf schafft dagegen jedes Level.

## Mögliche Erweiterungen
- Mutationen während des Spiels
- Turniermodus (Best of 5/10)
- Hindernisse oder Antibiotika-Zonen auf der Platte
- Simulation in einem Web Worker für noch größere Platten
