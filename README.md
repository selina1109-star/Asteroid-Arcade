# Asteroid Arcade

Ein kleines, sofort spielbares **Asteroids-inspiriertes Arcade-Spiel** als reine statische Website.
Das Projekt läuft ohne Backend, ohne Datenbank und ohne Build-Prozess.

## Lokaler Start

1. Repository klonen oder Dateien herunterladen.
2. `index.html` im Browser öffnen.

Optional (empfohlen für lokale Entwicklung mit sauberem Reload):

```bash
python3 -m http.server 8080
```

Dann im Browser öffnen: `http://localhost:8080`

## Hosting als statische GitHub-Vorschau (GitHub Pages)

1. Projekt in ein GitHub-Repository pushen.
2. In GitHub zu **Settings → Pages**.
3. Bei **Build and deployment** als Source **Deploy from a branch** wählen.
4. Branch `main` (oder `master`) und Ordner `/ (root)` auswählen.
5. Speichern.

Nach kurzer Zeit ist das Spiel über die GitHub-Pages-URL verfügbar (z. B. `https://<user>.github.io/<repo>/`).

## Steuerung

- **Pfeil links / rechts**: Schiff rotieren
- **Pfeil hoch**: Schub
- **Leertaste**: Schießen
- **P**: Pause/Fortsetzen
- **Enter**: Neustart bei Game Over

## Features

- Trägheitsbasierte Schiffsteuerung
- Screen-Wrapping für Schiff, Asteroiden und Schüsse
- Große Asteroiden zerbrechen in kleinere
- Schüsse zerstören Asteroiden und erhöhen den Score
- Kollisionen mit Asteroiden kosten Leben (3 Leben)
- Game-Over-Screen mit sauberem Neustart
- Schlichte Retro-Effekte (Partikel/Explosion, Mündungsfeuer, Treffer-Flash)
- Level-Fortschritt (neue Welle, wenn alle Asteroiden zerstört sind)

## Projektstruktur

```text
.
├── index.html   # Grundstruktur + HUD + Canvas
├── style.css    # Retro-UI und Layout
├── script.js    # Spiel-Logik (Loop, Input, Rendering, Kollisionen)
└── README.md    # Dokumentation
```

## Technik

- Reines **HTML / CSS / Vanilla JavaScript**
- Rendering über **HTML5 Canvas**
- Hauptschleife via **requestAnimationFrame**
