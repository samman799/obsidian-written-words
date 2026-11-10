# Plan: Obsidian-plugin 'Geschreven woorden'

28 oktober 2026

## Doel en uitgangspunten

De plugin telt hoeveel woorden je zelf typt in gekozen mappen, niet hoeveel woorden er netto staan. Typ je 300 woorden, verwijder je er 200 en typ je er weer 300, dan heb je 600 woorden geschreven. Wat je binnen 20 seconden weer weghaalt, telt niet.

Jouw keuzes:

- **Plakken telt niet mee**, net als tekst van templates, andere plugins en sync. Alleen wat je typt telt.
- **Zijpaneel** met statistieken per dag, week en map.
- **Dagelijks doel** met voortgangsbalk.
- **Geschiedenis als heatmap** van eerdere dagen.
- **Twee totalen** in het zijpaneel: het totaal aantal woorden dat nu in de mappen staat, en het totaal aantal woorden dat je ooit geschreven hebt.
- **Alleen desktop**, dus geen samenvoegen van tellingen tussen apparaten.
- **Claude schrijft de code**; dit plan is daar de basis voor.

Werknaam: *Written Words* (plugin-id `written-words`).

## Hoe 'geschreven woorden' geteld worden

De plugin luistert naar elke wijziging in de editor en telt alleen nieuwe woorden die door typen ontstaan. Verwijderen trekt alleen iets af binnen een correctievenster van 20 seconden (punt 5).

**1. Alleen getypte wijzigingen.** Obsidian gebruikt de editor CodeMirror 6. Elke wijziging is een *transactie* met een label (`userEvent`) dat zegt waar ze vandaan komt. De plugin telt alleen:

- `input.type` — gewoon typen, inclusief Vim-invoegmodus en IME-invoer (`input.type.compose`)
- `input.complete` — een woord gekozen uit autocomplete

Bij het optellen genegeerd: `input.paste`, `input.drop`, `delete.*`, `undo`, `redo`, `move` en elke wijziging zonder label (templates, andere plugins, sync, herladen van een bestand). `undo` en `redo` tellen zelf nooit als nieuwe woorden, maar corrigeren wel de telling, zie punt 5.

> **Gewijzigd 29 oktober 2026:** eerder stond hier dat redo nooit telt. Dat is aangepast, zie punt 5 en de keuzetabel.

**2. De delta-methode.** Per getypte wijziging pakt de plugin het stukje tekst rond de wijziging, uitgebreid tot hele woorden. Ze telt de woorden daarin voor en na de wijziging. Is het verschil positief, dan gaat dat erbij; is het nul of negatief, dan gebeurt er niets.

| Actie | Woorden voor → na | Telt |
| --- | --- | --- |
| Je typt de `h` van een nieuw woord | 0 → 1 | +1 |
| Je typt de rest van `hallo` | 1 → 1 | 0 |
| Je typt een spatie | 1 → 1 | 0 |
| Je verbetert een tikfout in een woord | 1 → 1 | 0 |
| Je verwijdert 200 woorden | — | 0 (genegeerd) |
| Je plakt een alinea | — | 0 (genegeerd) |

Zo komt 300 typen, 200 wissen en 300 typen uit op precies 600.

**3. Wat is een woord.** Eén telfunctie voor alles: een reeks letters of cijfers (Unicode), waarbij `zo'n`, `auto's` en `zelf-standig` één woord zijn. Markdown-tekens als `#`, `**` en `>` tellen niet. Frontmatter (het `---`-blok bovenaan) telt niet mee.

**4. Welke map.** Bij elke transactie leest de plugin via `editorInfoField` welk bestand in die editor openstaat. Ligt het pad in een gekozen map (submappen inbegrepen), dan telt het voor die map. Verplaats je later een bestand, dan blijft de oude geschiedenis bij de oude map.

**5. Correctievenster van 20 seconden.** Nieuwe woorden staan eerst 20 seconden in de wacht. Haal je ze binnen die tijd weg met wissen, knippen of undo, dan vallen ze uit de telling. Daarna zijn ze definitief.

- **Op positie.** De plugin onthoudt waar elk woord in de wacht in de tekst staat; CodeMirror schuift die posities mee bij elke wijziging. Alleen wissen dat zo'n woord raakt, telt als correctie. Wis je binnen 20 seconden oude tekst elders, dan blijven je nieuwe woorden staan.
- **Wissen en undo** (`delete.*`, `undo`) gebruikt de plugin alleen voor dit venster. Wissen van oudere tekst blijft genegeerd.
- **Redo geeft terug wat undo weghaalde.** Haalt een undo binnen het venster net getypte woorden weg, dan onthoudt de plugin hoeveel dat er waren, en de bijbehorende redo geeft precies dat aantal terug. Redo van geplakte tekst, of van woorden die al definitief waren, geeft niets. Typ je tussen undo en redo iets nieuws, dan vervalt de redo, net als in de editor. *(Gewijzigd 29 oktober 2026; eerder: "Redo telt nooit".)*
- **Live teller.** Het zijpaneel telt woorden in de wacht al mee, zodat het direct reageert; bij een correctie zakt de teller terug.
- **Afsluiten.** Sluit je een notitie of Obsidian, dan worden woorden in de wacht meteen definitief en opgeslagen.
- **Instelbaar.** Standaard 20 seconden; 0 zet het venster uit.

| Actie | Telt |
| --- | --- |
| 3 woorden typen, binnen 20 s wissen, 3 andere typen | +3 |
| 3 woorden typen, na 30 s wissen | +3 |
| Een woord beginnen en direct wissen | 0 |
| 300 typen, na meer dan 20 s 200 wissen, 300 typen | +600 |

## Gemaakte keuzes

Deze keuzes zijn vastgelegd na jouw review.

| Onderwerp | Keuze |
| --- | --- |
| Ongedaan maken | Undo trekt net getypte woorden af binnen het correctievenster. Redo geeft die woorden terug, maar telt nooit iets wat niet eerst door een undo is afgetrokken. *(Gewijzigd 29 oktober 2026; eerder: redo telt niet.)* |
| Correctievenster | Woorden die je binnen 20 seconden weer weghaalt, tellen niet; instelbaar |
| Submappen | Tellen mee voor de bovenliggende map |
| Geneste mappen | Een bestand in `Schrijven/Roman` telt voor beide mappen, maar één keer voor het dagtotaal |
| Dagdoel | Eén doel voor alle mappen samen |
| Begin van de dag | 02:00, instelbaar (bijv. 04:00 voor nachtschrijvers) |
| Frontmatter | Telt niet mee |
| Autocomplete | Telt mee als getypt |
| Canvas | Telt niet mee; alleen gewone notities |

## Architectuur

De plugin bestaat uit zes onderdelen in TypeScript: twee bronnen, twee tellers, opslag en het zijpaneel.

```text
Editor (CodeMirror 6)                     Vault-events
elke wijziging = transactie met userEvent wijzigen, aanmaken, verwijderen, hernoemen
        │                                         │
        ▼                                         ▼
tracker.ts                                folderTotals.ts
alleen input.type en input.complete       scan bij opstarten, daarna per bestand
delta-methode: alleen nieuwe woorden      = totaal woorden nu in de mappen
correctievenster (woorden in de wacht)    telt met wordCount.ts
controleert: bestand in gekozen map?
telt met wordCount.ts
        │ +n woorden per map                      │ totaal nu per map
        ▼                                         ▼
store.ts  ──────── dagtellingen ────────▶ StatsView.ts (zijpaneel)
geschreven woorden per dag per map        vandaag, doel, week, maand, per map
bewaart elke 5 s in data.json             totalen en heatmap van 52 weken
```

De tracker is de kern: hij laat alleen getypte wijzigingen door. `settings.ts` (mappen, doel, beginuur, correctievenster) wordt door alle onderdelen gelezen, en `main.ts` start alles op.

```text
written-words/
  manifest.json, package.json, tsconfig.json, esbuild.config.mjs, vitest.config.ts, styles.css
  src/main.ts             opstarten; extensie, zijpaneel, commando's en instellingen registreren
  src/settings.ts         instellingen en het formaat van data.json
  src/settingsTab.ts      instellingenscherm met mappenkiezer
  src/wordCount.ts        de ene telfunctie (puur, getest)
  src/delta.ts            delta-methode, frontmatter en woorden rond een wijziging
  src/editorTracker.ts    per editor: userEvent-filter, correctievenster en undo/redo
  src/extension.ts        de CodeMirror-extensie die de editorTracker voedt
  src/counter.ts          boekt woorden op de huidige dag
  src/day.ts              dagsleutel met begin van de dag
  src/folders.ts          bij welke gekozen mappen hoort een pad
  src/store.ts            dagtellingen, gebufferd opslaan
  src/stats.ts            berekeningen voor week, maand en streak
  src/wordIndex.ts        woorden per bestand en per map (puur, getest)
  src/folderTotals.ts     scan van de vault en bijwerken bij wijzigingen
  src/csv.ts              CSV-export
  src/view/StatsView.ts   het zijpaneel
  src/view/heatmap.ts     SVG-heatmap
  tests/                  unit-tests voor alle pure onderdelen
  scripts/package.mjs     zet de installatiebestanden in dist/written-words/
  versies/fase-N/         kopie van het project aan het eind van elke fase
```

## Datamodel en opslag

Alles staat in het `data.json` van de plugin, opgeslagen met Obsidian's eigen `saveData`. Omdat je alleen op desktop werkt, is één bestand genoeg.

```json
{
  "version": 1,
  "settings": {
    "folders": ["Schrijven/Roman", "Blog"],
    "dailyGoal": 500,
    "dayStartHour": 2,
    "correctionWindowSeconds": 20
  },
  "days": {
    "2026-10-28": { "total": 612, "folders": { "Schrijven/Roman": 400, "Blog": 212 } }
  }
}
```

- **Per dag, per map.** Weken, maanden, streaks en de heatmap worden hieruit berekend; ze worden niet apart opgeslagen.
- **`total` per dag** staat los van de mappen, zodat een bestand in twee geneste mappen niet dubbel telt in het dagtotaal.
- **Totaal ooit geschreven** = de som van alle dagen.
- **Totaal woorden nu in de mappen** wordt niet opgeslagen, maar bij het opstarten berekend en daarna bijgehouden (zie Architectuur).
- **Wegschrijven** gebeurt gebufferd: hooguit elke 5 seconden en altijd bij afsluiten van de plugin. Zo blijft typen vlot.
- **`version`** maakt latere wijzigingen aan het formaat mogelijk zonder je geschiedenis te verliezen.

Een jaar dagelijks schrijven in 5 mappen is ongeveer 30 kB, dus groei is geen probleem.

## Zijpaneel en instellingen

Het zijpaneel opent via een icoon in de linkerbalk of het commando *Written Words: open statistieken*, en ververst live terwijl je typt.

**Zijpaneel, van boven naar onder:**

1. **Vandaag** — geschreven woorden vandaag, voortgangsbalk naar je dagdoel, en een vinkje plus streak (aantal dagen op rij doel gehaald).
2. **Deze week en maand** — geschreven woorden per periode.
3. **Per map** — een tabel met per map: vandaag, deze week, totaal ooit geschreven, en totaal woorden nu in de map.
4. **Totalen** — totaal woorden nu in alle mappen samen, en totaal woorden ooit geschreven.
5. **Heatmap** — de afgelopen 52 weken als blokjes, één per dag. Hoe donkerder, hoe dichter bij je doel; een vol gekleurd blokje betekent doel gehaald. Bij aanwijzen zie je datum en aantal.

De heatmap wordt met gewone SVG getekend, zonder externe bibliotheek. Kleuren volgen het actieve Obsidian-thema (licht en donker).

**Instellingen:**

- **Mappen** — lijst met toevoegen (met mapsuggesties tijdens typen) en verwijderen
- **Dagdoel** — aantal woorden, standaard 500
- **Begin van de dag** — uur, standaard 02:00
- **Correctievenster** — seconden, standaard 20 (0 = uit)
- **Gegevens** — exporteren als CSV en geschiedenis wissen (met bevestiging)

## Bouwfasen

Zeven fasen; na elke fase heb je iets werkends dat je in je vault kunt proberen.

1. **Opzet** — project op basis van de officiële `obsidian-sample-plugin` (TypeScript, esbuild). Telfunctie `countWords` schrijven met unit-tests (Vitest).
2. **Tracker** — CodeMirror-extensie met userEvent-filter, delta-methode, correctievenster en mapcontrole. Tellingen voorlopig in het geheugen en in de console. *Test: 300 typen, 200 wissen (na 20 s), 300 typen = 600; 3 typen, binnen 20 s wissen, 3 typen = 3.*
3. **Opslag en instellingen** — datamodel, gebufferd wegschrijven, dagwissel op basis van ingesteld beginuur, instellingenscherm met mappenkiezer.
4. **Zijpaneel, basis** — Vandaag met doelbalk, week, maand en de mappentabel (zonder het huidige totaal). Live verversen, maximaal één keer per seconde.
5. **Totaal woorden in mappen** — eenmalige scan bij opstarten, daarna bijwerken bij wijzigen, aanmaken, verwijderen en hernoemen van bestanden.
6. **Heatmap en streak** — 52 weken, kleuren uit het thema, tooltip.
7. **Afronden** — CSV-export, prestatie controleren in een grote vault, testscenario's hieronder doorlopen. Installeren door de map `written-words` in `.obsidian/plugins/` te zetten.

## Status

*Bijgewerkt 29 oktober 2026.* Alle zeven fasen zijn gebouwd. Na elke fase staat een kopie van het project in `versies/fase-N/` (fase 1 en 2 zijn niet apart bewaard). Afwijkingen van dit plan:

- **Redo** geeft terug wat undo weghaalde (zie boven).
- **Streak** zit al in het zijpaneel vanaf fase 4, niet pas in fase 6.
- **Console-logging** staat standaard aan en is uit te zetten in de instellingen.
- **CSV-export** schrijft een bestand in de hoofdmap van de vault.
- **Geselecteerde woorden overtypen** valt na het overtypen niet meer onder het correctievenster.
- Prestatiecontrole zonder Obsidian: 10.000 notities van 3.000 woorden tellen in ongeveer 1 s; een toetsaanslag in een document van 1 miljoen woorden kost gemiddeld 0,06 ms.

## Testscenario's

Elk scenario wordt in een testvault met de hand doorlopen; de pure telfuncties krijgen ook unit-tests.

| Scenario | Verwacht |
| --- | --- |
| 300 woorden typen, na meer dan 20 s 200 wissen, 300 typen | +600 |
| 3 woorden typen, binnen 20 s wissen, 3 andere typen | +3 |
| 3 woorden typen, na 30 s wissen | +3 |
| Woorden typen en binnen 20 s oude tekst elders wissen | Nieuwe woorden blijven tellen |
| 500 woorden plakken | +0 |
| Tikfout in een woord verbeteren | +0 |
| Template invoegen | +0 |
| Undo van net getypte woorden, binnen 20 s | Die woorden vallen weg |
| Redo van net getypte woorden die je met undo hebt weggehaald *(gewijzigd 29 oktober 2026; eerder: redo = +0)* | Die woorden tellen weer mee |
| Redo van geplakte tekst, of van undo na meer dan 20 s | +0 |
| Typen tussen undo en redo | Redo telt niet meer |
| Typen in een notitie buiten de gekozen mappen | +0 |
| Typen in `Schrijven/Roman` met beide mappen gekozen | +1 per woord bij beide mappen, +1 in dagtotaal |
| Typen in frontmatter | +0 |
| Zelfde notitie open in twee panelen, typen in één | Eén keer geteld, niet twee |
| Doortypen over 02:00 | Woorden voor en na vallen op de juiste dag |
| Typen in Vim-invoegmodus | Telt zoals gewoon typen |
| Typen in Bron- en Live Preview-modus | Telt in beide |
| Woord kiezen uit autocomplete | +1 |
| Bestand verplaatsen naar andere map | Geschiedenis blijft; totaal woorden in mappen past zich aan |
| Obsidian afsluiten binnen 20 s na typen | Woorden in de wacht zijn bewaard |

De twee-panelen-test en de Vim-test zijn de grootste onzekerheden: of Obsidian daar dezelfde labels gebruikt, moet in fase 2 blijken.
