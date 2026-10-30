# Unser Sonnenhaus

Eine Seite über unser Haus in Goldbach: Solardach, Batterie, Klimaanlage als Wärmepumpe und alle Energie aus Strom. Mit echten Messwerten seit 2019, erklärt für Groß und Klein.

Die Seite ist **statisch**: Sie hat keinen eigenen Server, setzt keine Cookies und lädt nichts von fremden Servern. Auch Schriften und Diagramm-Bibliothek liegen bei der Seite.

## Lokal ansehen und bearbeiten

```bash
npm install
npm run dev        # Vorschau mit Live-Neuladen auf http://localhost:5173
npm test           # Rechnungen und Datenskripte prüfen
npm run build      # fertige Seite nach dist/
```

## Aufbau

| Pfad | Inhalt |
|---|---|
| `index.html`, `impressum.html`, `datenschutz.html` | die drei Seiten |
| `src/config.ts` | Haus, Anschaffungen, Preise, Vergleichshäuser |
| `src/calc.ts` | alle Rechnungen (Autarkie, Kosten, CO₂, Amortisation), getestet in `calc.test.ts` |
| `src/scene.ts` | Zeichnung, Sprechblasen, Monats-Regler, Energiebilanz |
| `src/sections.ts` | Abschnitte und Diagramme darunter |
| `data/energy.json` | Monatswerte (wird von den Skripten geschrieben) |
| `scripts/` | Import aus dem Sunny Portal, Übernahme der Werte von Home Assistant |
| `homeassistant/sonnenhaus.yaml` | Paket für Home Assistant |

## Welches Jahr die Seite zeigt

Es gibt keine Jahresauswahl mehr. Die Seite zeigt 2026 (erstes Jahr mit Batterie und eigenem Tarif) und danach immer das letzte komplette Jahr (`SHOW_Y` in `src/model.ts`). Alle Jahre seit 2019 stehen oben unter „Unsere Jahre auf einen Blick“ in einem Diagramm: ein Balken pro Jahr durch die Nulllinie, nach oben die Sonnenernte (selbst genutzt, in die Batterie, eingespeist), nach unten der Verbrauch (direkt vom Dach, über die Batterie, aus dem Netz gekauft), darunter die Autarkie.

## Lohnt sich die Klimaanlage?

Im Abschnitt „Lohnt es sich?“ lässt sich die Klimaanlage umschalten. Weil das Haus vorher Stromheizung hatte, hätten beide Alternativen erst Heizkörper und Rohre gebraucht. Gezählt wird jeweils, was die Klimaanlage beim Kauf weniger gekostet hat, plus der Unterschied bei den Energiekosten seit 2020 (Heizen und warmes Wasser, `acAdvantage` in `src/calc.ts`):
- **gegen eine Gasheizung:** Anschaffung ca. 16.000 € mit Gasanschluss, ohne Förderung. Im Betrieb Gas für Wärme und warmes Wasser (Kessel-Wirkungsgrad, Gaspreis des Jahres) plus Gas-Grundgebühr, gegen den Strom für Klimaanlage und Durchlauferhitzer.
- **gegen eine Luft-Wasser-Wärmepumpe mit Heizkörpern:** Anschaffung ca. 25.000 € minus 35 % Förderung. Im Betrieb heizt die Klimaanlage sparsamer (JAZ 4 statt 3), die Wärmepumpe würde dafür das warme Wasser günstiger machen.

„Alles zusammen“ zählt die Klimaanlage mit dem gewählten Vergleich, der Film mit dem Vergleich zur Gasheizung. Alle Annahmen lassen sich unter „Für Zahlen-Fans“ ändern.

## Daten

**Alte Jahre aus dem Sunny Portal:** Die Exporte „Energiebilanz – Jahr“ nach `data/raw/` legen, Batteriewerte in `data/batterie.csv` eintragen und dann:

```bash
npm run import:csv
```

`data/raw/` wird nie veröffentlicht, weil die Exporte E-Mail-Adresse und Anlagen-ID enthalten (siehe `.gitignore`).

**Neue Monate von Home Assistant:** Home Assistant schickt jede Nacht um 23:58 den Stand des laufenden Monats an GitHub. Die Verbindung geht nur von Home Assistant nach außen, Home Assistant bleibt aus dem Internet unerreichbar. GitHub prüft die Werte (`scripts/merge-month.mjs`), speichert sie in `data/energy.json`, lässt die Tests laufen und veröffentlicht die Seite neu.

## Einrichten (einmalig)

1. **Repository auf GitHub anlegen** und diesen Ordner hochladen. Unter *Settings → Pages → Source* „GitHub Actions“ wählen.
2. **Impressum und Datenschutz:** sind ausgefüllt (Andreas Gerhard, Weberborn 8b, 63773 Goldbach). Steht dort je wieder „BITTE ERGÄNZEN“, bricht die Veröffentlichung absichtlich ab.
3. **Token für Home Assistant:** Unter GitHub *Settings → Developer settings → Fine-grained tokens* einen Token anlegen: nur für dieses Repository, Recht *Contents: Read and write*. In Home Assistant in `secrets.yaml` eintragen:
   ```yaml
   sonnenhaus_github_auth: "Bearer github_pat_…"
   ```
4. **`homeassistant/sonnenhaus.yaml`** als Paket einbinden, die fünf Quell-Sensoren und `OWNER/REPO` eintragen, Home Assistant neu starten und die Automation einmal von Hand auslösen.
5. **Eigene Domain (optional):** Unter *Settings → Pages → Custom domain* eintragen, zum Beispiel eine Subdomain von oneguitar.eu.

## Schaufenster: der Film

**„Das Sonnenhaus von Goldbach“** ist eine kleine Comic-Doku von etwa 2 Minuten 55 Sekunden. Sie steht ganz oben auf `index.html`, direkt darunter folgen alle Zahlen und Diagramme. `kiosk.html` zeigt nur den Film. Am Ende bleibt der Film stehen und bietet „Nochmal ansehen“ und „Zahlen & Diagramme“ an. Mit `kiosk.html?loop` läuft er endlos, so startet ihn auch `scripts/kiosk-start.sh` am Außen-Display. Eine Kamera fährt durch eine gezeichnete Welt. Volti, ein kleines Strom-Männchen, moderiert in Sprechblasen, Erzähl-Kästen erklären, und Lautmalereien („KLONK!“, „PLING!“) setzen Akzente. Kleine Strom-Männchen laufen sichtbar an den Leitungen entlang.

| Zeit | Szene |
|---|---|
| 0:00 | Titel, die Kamera schwebt vom Himmel nach Goldbach |
| 0:07 | Früher: grauer Himmel, aller Strom kommt aus dem Netz |
| 0:17 | März 2019: Die Sonne geht auf, Solarmodule fallen aufs Dach, Ernte pro Jahr zählt hoch |
| 0:31 | Mittags: Strom fließt zu den Nachbarn, deren Fenster gehen an |
| 0:41 | 2020: Klimaanlage als Wärmepumpe, mit Erklär-Bild „1 kWh Strom → 4 kWh Wärme“ |
| 0:55 | Im Haus alles mit Strom: E-Bike fährt herein, Öl und Gas werden durchgestrichen, Strom bekommt einen grünen Haken. Dass das Auto noch Benzin tankt, sagt der Erzähl-Kasten ehrlich |
| 1:07 | Und bei Wolken? Gewitterwolken vor der Sonne, weniger Strom-Männchen, Regen, Blitz und Donner, dann ein Regenbogen |
| 1:19 | Ein Jahr im Zeitraffer: Kalender blättert, Sonne steigt und sinkt, Schnee, Säulen wachsen |
| 1:37 | Dezember 2025: die Batterie, zweimal Tag und Nacht, Autarkie vorher gegen nachher |
| 2:04 | Seit 2019: Auf den Hügeln wächst ein Wald, Ersparnis, CO₂ und Amortisation zählen hoch |
| 2:18 | Unterm Strich: die vier größten Vorteile groß im Bild (Autarkie, Ersparnis, CO₂, Amortisation) |
| 2:28 | Demnächst: Das Benzin-Auto fährt weg („TÖFF TÖFF!“), ein Elektroauto rollt herein („BALD!“) |
| 2:38 | „MACH MIT!“: Dach prüfen, klein anfangen (Balkonkraftwerk), groß denken, Kontakt andreas.gerhard@oneguitar.eu |
| 2:51 | Sonnenuntergang, die Katzen schlafen ein, „ENDE“ |

**Ton:** Die Musik ist ein eigener Soundtrack im Stil der Super-Nintendo-Klassiker (`src/film/soundtrack.ts`). Er ist neu komponiert und wird im Browser erzeugt: Puls-Lead mit Vibrato, Arpeggios, Streicherfläche, Slap-Bass, Shuffle-Schlagzeug mit Handclaps, Shaker, Bongos, Kuhglocke und Tamburin, dazu das SNES-Echo. Auf Thema und Bridge folgt ein Tonartwechsel nach oben, nach etwa 2 Minuten beginnt er von vorn. Oben rechts schaltet ein Knopf die Musik aus und wieder an, die Geräusche bleiben dabei. Beim Laden ist die Musik immer an. Die Geräusche werden im Browser erzeugt (Web Audio): Geräusche zu jeder Lautmalerei (KLONK, PLING, WUSCH, BZZZT, PLOPP, MIAU, KAWUMM …), das Rauschen der Klimaanlage, Regen und Donner, Vögel am Tag und Grillen in der Nacht. In den Nachtszenen wird die Musik leiser und dumpfer. **Am Außen-Display (`?loop`) ist der Ton von 21 bis 6 Uhr aus**, aus Rücksicht auf die Nachbarn. Die Lautstärke steht als `VOLUME` in `src/film/film.ts`. Im Kiosk-Chromium vom Startskript läuft der Ton ohne Klick.

**Strom-Männchen:** Alle laufen gleich schnell. Wie viele unterwegs sind, richtet sich nach den echten Kilowattstunden auf der jeweiligen Leitung: ein Männchen pro Sekunde für je 1.400 kWh im Jahr. Zu den Nachbarn flitzen deshalb viele, aus dem Netz kommen seit der Batterie nur noch wenige.

**Bewohner:** zwei Menschen und drei Katzen (schwarz, schwarz mit weißer Brust, braun getigert). Die Katzen haben große Glanzaugen und rosa Bäckchen und kennen fünf Haltungen: sitzen, zusammengerollt schlafen, auf vier Pfoten laufen (mit schwingenden Beinen), Katzenbuckel und Vorwärtsstrecken. Sie bewegen sich mit Ruhe: Die schwarze macht beim „KLONK!“ einen Buckel und döst unter der warmen Luft der Klimaanlage, die getigerte macht mittags Katzenyoga und läuft dem E-Bike hinterher, die schwarz-weiße sonnt sich mittags. In der Klimaanlagen-Szene springt die schwarz-weiße erst auf das Außengerät und dann mit „HOPP!“ aufs Dach, sonnt sich bei den Modulen und klettert danach denselben Weg wieder hinunter. Nach der Batterie-Nacht wird sich gestreckt, beim „Mach mit!“ machen zwei zusammen Yoga. Beim Gewitter flitzen alle mit „MIAU!“ ins Haus.

**Bedienung:** Die Musik startet beim Öffnen der Seite, wo der Browser das erlaubt. Viele Browser (vor allem Safari und das iPhone) lassen Ton erst nach dem ersten Tipp zu. Dann wackelt der gelbe Musik-Knopf, und der erste Tipp, Klick oder Tastendruck irgendwo auf der Seite startet die Musik. Der Film selbst beginnt mit „Film starten“. Oben rechts im Bild gibt es drei Knöpfe: Vollbild (auch Taste F), Pause und Musik an/aus. Wie bei einem Videoplayer blenden sie sich nach 2,5 Sekunden ohne Bedienung aus und kommen bei Mausbewegung oder Tipp zurück. Solange der Film pausiert, wartet oder zu Ende ist, bleiben sie stehen. Der Film sitzt in einem Rahmen, der genau das 16:9-Bild umfasst. Ist das Fenster breiter, bleibt daneben der helle Seitenhintergrund statt schwarzer Balken. Wird der Film aus dem Bild gescrollt, pausiert er von selbst, die Musik läuft aber auf der ganzen Seite weiter. Pause und Vollbild bleiben beim Film, nur der Musik-Knopf bleibt oben rechts neben der Menüleiste. So kann man jederzeit stummschalten. Am Handy schaltet der Vollbild-Knopf gleich ins Querformat. Auf Android ist das echtes Vollbild mit Dreh-Sperre. Das iPhone erlaubt im Browser echtes Vollbild nur für Videos, dort füllt der Film den Bildschirm und wird bei hochkant gehaltenem Handy um 90° gedreht. Ein Hinweis verrät einmal den Trick: Über „Teilen → Zum Home-Bildschirm“ wird die Seite zur App (`site.webmanifest`, für den reinen Film `film.webmanifest` mit Querformat). Von dort geöffnet läuft sie ohne Safari-Leisten, der Film füllt also wirklich den ganzen Bildschirm. Die Seite spielt den Ton als „Wiedergabe“ ab, er ist deshalb auch bei eingeschaltetem Stummschalter zu hören.

**Immer sichtbar** ist die Infoleiste unten: der aktuelle Monat (erzeugt, verbraucht, autark, in die Batterie, aus dem Netz) und das laufende Jahr.

**Technik:**
- [GSAP](https://gsap.com) steuert eine durchgehende Zeitleiste.
- Alles ist **eine einzige SVG-Zeichnung** mit 1920 × 1080, auch die Texte. Deshalb sieht der Film in Chrome, Safari und auf dem Raspberry Pi gleich aus und passt sich jedem Bildschirm an. Bei anderem Seitenverhältnis gibt es schwarze Ränder statt Überlappungen.
- Es gibt keine Emoji, weil die auf manchen Geräten fehlen.
- Keine Effekte über dem ganzen Bild: keine Maske, kein `clip-path`, kein CSS-Filter. Die bringen Chrome und Samsung Internet auf Android-Handys zum Flackern. Die Blende am Anfang ist nur sichtbar, solange sie sich öffnet. Die Nacht-Abdunklung ist eine halbdurchsichtige Fläche.
- Unsichtbare Knöpfe werden mit `visibility: hidden` abgeschaltet, damit sie keine Klicks abfangen.
- Nachts (21–6 Uhr) ist das Bild gedimmt. Alle 6 Stunden lädt die Seite neu und holt so neue Monatswerte.

Szenen ändern: `src/film/film.ts` (Zeitleiste), `src/film/world.ts` (die Welt), `src/film/hud.ts` (Texte und Einblendungen). Zum Prüfen springen die Pfeiltasten ±10 Sekunden, die Leertaste pausiert.

**Am eigenen Rechner ausprobieren:**

```bash
npm run kiosk      # baut und öffnet http://localhost:4173/kiosk.html
```


**Dauerbetrieb, z. B. mit einem Raspberry Pi am Display:**

1. Den Ordner auf den Pi kopieren, dann `npm ci && npm run build`.
2. Testen mit `scripts/kiosk-start.sh`. Das Skript startet die Seite lokal und Chromium im Vollbild, ganz ohne Internet.
3. Autostart (Raspberry Pi OS mit Wayland/labwc): in `~/.config/labwc/autostart` die Zeile
   `/home/pi/sonnenhaus/scripts/kiosk-start.sh &` eintragen.
4. Bildschirmschoner und Energiesparen im System ausschalten. Für draußen ein Display mit hoher Helligkeit (≥ 1.500 cd/m²) und Schutzklasse IP65 nehmen.

Neue Monatswerte: Wenn Home Assistant direkt auf den Pi schreibt (z. B. per SFTP nach `data/`), danach `npm run build`. Oder der Pi holt sich die Werte von der Website.
