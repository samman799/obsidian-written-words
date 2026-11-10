# Written Words installeren op Windows

Written Words telt hoeveel woorden je zelf typt in de mappen die jij kiest. Plakken telt niet mee. Deze handleiding laat stap voor stap zien hoe je de plugin in Obsidian zet. Je hoeft er niets technisch voor te kunnen.

**Je hebt nodig**

- Obsidian voor Windows (versie 1.4.10 of nieuwer)
- De map `written-words` of het bestand `written-words.zip`
- Ongeveer 10 minuten

---

## Stap 1: Zoek de map van je vault

Je vault is de map waarin Obsidian je notities bewaart.

1. Open Obsidian en je vault.
2. Klik in de lijst met bestanden (links) met de rechtermuisknop op een notitie.
3. Kies **Tonen in systeemverkenner** (in het Engels: *Show in system explorer*).
4. Er opent een Verkenner-venster met je notitie. Dit is de map van je vault. Als je notities in submappen staan, ga dan met de pijl omhoog (linksboven in Verkenner) naar de hoofdmap van de vault, waar ook de map `.obsidian` zou moeten staan.

## Stap 2: Maak verborgen mappen zichtbaar

Obsidian bewaart zijn instellingen in een verborgen map. Die moet je eerst zichtbaar maken.

1. Klik bovenin Verkenner op **Beeld**.
2. Kies **Weergeven** en zet een vinkje bij **Verborgen items**.
3. Je ziet nu een map met de naam `.obsidian`. Open die.

## Stap 3: Zet de plugin op de goede plek

1. Staat er in `.obsidian` een map `plugins`? Zo niet, maak die dan aan: rechtermuisknop, **Nieuw**, **Map**, noem hem `plugins` (alles kleine letters).
2. Open de map `plugins`.
3. Als je een zip hebt gekregen: klik met de rechtermuisknop op `written-words.zip` en kies **Alles uitpakken**.
4. Kopieer de map `written-words` naar de map `plugins`.

**Controleer dit goed.** Open de map `written-words`. Je moet er direct drie bestanden in zien:

- `main.js`
- `manifest.json`
- `styles.css`

Zie je daar nog een tweede map `written-words`, dan is de plugin één map te diep gezet. Sleep dan de drie bestanden een niveau omhoog. De volledige plek is:

`jouw vault\.obsidian\plugins\written-words\main.js`

## Stap 4: Zet de plugin aan in Obsidian

1. Klik in Obsidian linksonder op het **tandwiel** (Instellingen).
2. Kies **Community-plugins**.
3. Staat er een knop **Beperkte modus uitschakelen** (*Turn on community plugins*)? Klik erop en bevestig. Dit is nodig voor alle plugins die niet uit de officiële lijst komen. Written Words is zo'n plugin.
4. Klik bij **Geïnstalleerde plugins** op het icoontje met twee pijltjes (vernieuwen).
5. Zet **Written Words** aan met de schakelaar.

Rechtsonder in beeld staat nu `✍ 0 / 500 woorden`. Dan werkt het.

## Stap 5: Kies in welke mappen er geteld wordt

Zonder mappen telt de plugin niets.

1. Ga naar **Instellingen** en scroll links naar **Written Words**.
2. Klik bij **Map toevoegen** in het vak en kies een map uit de lijst die verschijnt.
3. Klik op **Toevoegen**.
4. Je kunt hier ook je dagdoel instellen (standaard 500 woorden).

Alleen wat je typt in deze mappen telt mee, submappen inbegrepen.

## Zo gebruik je het

- **Rechtsonder** zie je hoeveel je vandaag hebt geschreven.
- Klik in de balk **links** op het potloodicoontje, of druk op Ctrl+P en typ `Written Words: open statistieken`. Je ziet dan je dag, week en maand, een overzicht per map en een kalender van het afgelopen jaar.
- Alleen **getypte** woorden tellen. Tekst die je plakt, of die door een sjabloon of een andere plugin wordt ingevoegd, telt niet.
- Haal je nieuwe woorden binnen 20 seconden weer weg, dan tellen ze niet mee. Zo telt een tikfout die je meteen herstelt niet dubbel.

---

## Als iets niet werkt

**Written Words staat niet in de lijst met plugins**
De map staat op de verkeerde plek of is één niveau te diep gezet. Loop stap 3 nog eens na en klik daarna op het vernieuwen-icoon.

**Er staat `0 woorden` terwijl ik typ**
Controleer of je in een map typt die je bij stap 5 hebt toegevoegd. De notitie zelf moet in die map (of een submap) staan.

**Ik zie de map `.obsidian` niet**
Doe stap 2 opnieuw en let erop dat je het vinkje bij **Verborgen items** hebt gezet.

**Windows waarschuwt me**
Bij het kopiëren van de map vraagt Windows soms om bevestiging. Kies **Doorgaan**.

## Bijwerken en verwijderen

**Bijwerken naar een nieuwe versie:** vervang de drie bestanden in de map `written-words` door de nieuwe. Verwijder het bestand `data.json` niet, want daarin staan al je tellingen. Start Obsidian daarna opnieuw op.

**Verwijderen:** zet de plugin uit in Instellingen, **Community-plugins**, en verwijder dan de map `written-words`. Je tellingen verdwijnen dan ook. Wil je ze bewaren, ga dan eerst naar **Instellingen**, **Written Words**, kies **Exporteren als CSV** en bewaar het bestand dat in je vault verschijnt.
