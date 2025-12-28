# Technic Brick Tools

Static web app (GitHub Pages-ready) with three modules:
- Two Liftarm Dimensions — enumerate positions/angles for two liftarms.
- Gear Couplings — enumerate fit options for gear pairs.
- Gearbox Calculator — build a tool diagram and compute axle speed/torque per gear.

## Run Locally
Open `docs/index.html` in a browser. Or serve the `docs` folder.

## Publish on GitHub Pages
- Set Pages source to `docs/` in the repository settings.

## Notes
- Tables use Tabulator (CDN) with per-column filters and sorting.
- Charts use Chart.js (CDN).
- Heavy computations run in Web Workers and stream rows incrementally.
