# Agava – Konzept und Spielregeln

## Idee
Man entwirft ein Bakterium und setzt es mit Gegnern auf eine runde Agarplatte. Sobald die Simulation läuft, greift niemand mehr ein. Man beobachtet nur noch (Tempo 1×, 2×, 5× oder 10×), welche Kultur die anderen verdrängt. Jede Zelle ist ein farbiger Pixel.

## Getroffene Entscheidungen
- **Plattform**: Web-App (PWA). Läuft in Safari, lässt sich auf dem Home-Bildschirm installieren und funktioniert offline. Kein App Store nötig.
- **Punktebudget**: Im freien Spiel einstellbar (6–40 Punkte, Standard 20). In den Leveln hat der Spieler immer 20 Punkte.
- **Nährboden**: einstellbar nach Verteilung, Menge und Nachwachsen.
- **Sprache**: Deutsch.
- **10 Level** mit aufsteigend schwereren Gegnern.

## Eigenschaften eines Bakteriums

| Eigenschaft | Stufen | Kosten | Wirkung |
|---|---|---|---|
| Bewegungsmuster | 1–6 Schritte aus ⬆ ↗ ↖ ⬇ ⏸ 🎲 | – | Folge, die sich endlos wiederholt |
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

## Level
| # | Name | Gegner | Besonderheit |
|---|---|---|---|
| 1 | Erste Schritte | 1 | träger Gegner |
| 2 | Der Wanderer | 1 | kreisender Gegner |
| 3 | Zwei auf einmal | 2 | erstmals drei Kulturen |
| 4 | Fleckenteppich | 2 | Nahrung in Flecken, Chemotaxis-Gegner |
| 5 | Der Ring | 3 | nur der Rand ist nahrhaft |
| 6 | Hungersnot | 2 | wenig Nahrung, Sporen |
| 7 | Giftküche | 3 | Giftwolke |
| 8 | Festung | 2 | Biofilm-Bollwerk, große Platte |
| 9 | Übermacht | 4 | vier starke Gegner |
| 10 | Der Endgegner | 3 | Boss mit 22 Punkten |

Die Schwierigkeit wurde per Massensimulation (`tools/levels-check.mjs`) geprüft. Zufällig gebaute Bakterien mit 20 Punkten gewinnen:

| Level | 1–3 | 4–5 | 6 | 7 | 8 | 9–10 |
|---|---|---|---|---|---|---|
| Siegquote | ~100 % | ~80 % | ~45 % | ~30 % | ~13 % | ~0 % |

Gezielt optimierte Bakterien können auch Level 9 und 10 gewinnen.

## Mögliche Erweiterungen
- Mutationen während des Spiels
- Turniermodus (Best of 5/10)
- Hindernisse oder Antibiotika-Zonen auf der Platte
- Simulation in einem Web Worker für noch größere Platten
