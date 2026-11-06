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

**Neue Monate von Home Assistant:** Am 1. jedes Monats um 00:15 (und zur Sicherheit noch einmal um 12:00) schickt Home Assistant die Endstände des Vormonats an GitHub. Die Verbindung geht nur von Home Assistant nach außen, Home Assistant bleibt aus dem Internet unerreichbar. GitHub prüft die Werte (`scripts/merge-month.mjs`), speichert sie in `data/energy.json`, lässt die Tests laufen und veröffentlicht die Seite neu. Ein vorhandener Monat wird nicht durch deutlich kleinere Werte ersetzt (Schutz vor unvollständigen Monaten); dann schlägt der Lauf fehl und GitHub schickt eine E-Mail.

## Einrichten (einmalig)

1. **GitHub:** Repository `andygeedot/sonnenhaus-goldbach`, Pages mit Quelle „GitHub Actions“ – erledigt. Seite: https://andygeedot.github.io/sonnenhaus-goldbach/
2. **Impressum und Datenschutz:** sind ausgefüllt (Andreas Gerhard, Weberborn 8b, 63773 Goldbach). Steht dort je wieder „BITTE ERGÄNZEN“, bricht die Veröffentlichung absichtlich ab.
3. **Eigene Domain (optional):** Unter *Settings → Pages → Custom domain* eintragen, zum Beispiel eine Subdomain von oneguitar.eu.

## Home Assistant

**1. Token bei GitHub anlegen.** Profilbild → *Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token*:
- *Repository access:* „Only select repositories“ → `sonnenhaus-goldbach`
- *Permissions → Repository permissions → Contents:* „Read and write“ (sonst nichts)
- *Expiration:* bis zu 1 Jahr – im Kalender notieren und dann erneuern.

**2. Token in Home Assistant eintragen,** in `/config/secrets.yaml` (mit „Bearer “ davor):
```yaml
sonnenhaus_github_auth: "Bearer github_pat_…"
```

**3. Paket einbinden.** `homeassistant/sonnenhaus.yaml` nach `/config/packages/sonnenhaus.yaml` kopieren (z. B. mit dem Add-on „File editor“ oder „Samba“). In `/config/configuration.yaml` einmalig:
```yaml
homeassistant:
  packages: !include_dir_named packages
```

**4. Die fünf Quell-Sensoren eintragen.** In der Paket-Datei stehen fünf `sensor.ERSETZEN_…`. Gebraucht werden **Gesamtzähler in kWh**, die immer weiter steigen (Zustandsklasse „total_increasing“) – also dieselben, die im Energie-Dashboard stehen (*Einstellungen → Dashboards → Energie*). Die genauen Namen findet man unter *Einstellungen → Geräte & Dienste → Entitäten* mit der Suche:

| Platzhalter | Was | wo es typischerweise herkommt |
|---|---|---|
| `ERSETZEN_pv_erzeugung_gesamt` | Solarstrom erzeugt, gesamt | SMA-Wechselrichter, „Total yield“ / „Gesamtertrag“ |
| `ERSETZEN_netzbezug_gesamt` | Strom aus dem Netz, gesamt | Sunny Home Manager, „Metering total absorbed“ (Bezug) |
| `ERSETZEN_netzeinspeisung_gesamt` | Strom ins Netz, gesamt | Sunny Home Manager, „Metering total yield“ (Einspeisung) |
| `ERSETZEN_batterie_geladen_gesamt` | in die Batterie geladen, gesamt | Zendure-Integration |
| `ERSETZEN_batterie_entladen_gesamt` | aus der Batterie entladen, gesamt | Zendure-Integration |

Gibt es für die Batterie nur Leistung (W) statt Energie (kWh): *Einstellungen → Geräte & Dienste → Helfer → Helfer erstellen → „Integral-Sensor“* (Methode „Links“, Einheiten-Präfix „k“, Zeiteinheit „Stunden“) – den daraus entstehenden kWh-Sensor eintragen. Gleiches gilt, wenn die Zendure Laden und Entladen nur als eine Leistung mit Vorzeichen liefert: dann vorher zwei Template-Sensoren bauen (nur positive bzw. nur negative Werte).

**5. Prüfen und neu starten.** *Entwicklerwerkzeuge → YAML → Konfiguration prüfen*, dann neu starten. Danach gibt es fünf neue Sensoren `sensor.sonnenhaus_…_monat`, die ab jetzt mitzählen.

**6. Was dann passiert.**
- Die Zähler zählen ab dem Einrichten. Der erste **vollständige** Monat ist der erste, der komplett danach liegt. Wer am 30. Oktober einrichtet, bekommt am 1. Dezember den November gesendet.
- Am 1. November würde der angebrochene Oktober gesendet – GitHub lehnt ihn ab, weil der Oktober aus dem Sunny Portal schon mit viel größeren Werten drin ist. Das ist gewollt; der Lauf auf GitHub wird dann rot und GitHub schickt eine E-Mail, die man ignorieren kann.
- Klappt das Senden nicht (z. B. Token abgelaufen), erscheint in Home Assistant eine Benachrichtigung.

**Klimaanlage (Heizen und Kühlen, seit November 2026).** Ein Shelly-Zwischenstecker misst die Klimaanlage. Das Paket `klima_modus.yaml` (im Repo `homeassistant-dashboard`) teilt das auf `sensor.klima_heizen_monat` und `sensor.klima_kuhlen_monat` auf. Die Automation schickt beides als `heat` und `cool` mit. Wo diese Werte in `data/energy.json` stehen, zeigt die Seite den gemessenen Heizstrom statt der Schätzung. Kühlen zählt nicht in die Vergleiche mit Gas, Öl oder Wärmepumpe. Was der Zähler verpasst hat (1.–4.11.2026, aus dem Mitsubishi-Zähler × 1,08), steht als `HEAT_TOPUP` in `scripts/energy-data.mjs` und wird beim Übernehmen dazugezählt.

**7. Testen.** Unter *Einstellungen → Automationen* „Sonnenhaus – Vormonat an die Website schicken“ öffnen, *⋮ → Ausführen*. In den ersten Wochen kommt nur der Hinweis „noch kein Vormonat“ – das ist richtig so. Ab dem ersten Monatswechsel sendet der Test den Vormonat; im Repo unter *Actions* startet dann ein Lauf und `data/energy.json` bekommt den Commit „Monatswerte aus Home Assistant“.

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
