# Copilot Instructions - Technic Brick Tools

## Project Architecture

**Technic Brick Tools** is a vanilla JS web app (no build step) for calculating Technic Brick configurations. It's deployed on GitHub Pages from the `docs/` folder.

### Module System
- **Core**: `docs/app.js` - Module registration pattern using `TechnicTools` namespace (IIFE-based)
- **Modules** are self-contained and wrap themselves in IIFE `(function() { ... })()` to isolate scope
- **Lazy loading**: Modules init only when tab is clicked; store in `initializedModules` Set to prevent re-init
- **Registration**: Each module calls `TechnicTools.registerModule(id, name, initFn)` where `id` matches container `#id` in HTML

### Key Files
- `docs/index.html` - 3 tabs, 3 module containers with matching IDs: `liftarms-module`, `gears-module`, `gearbox-module`
- `docs/app.js` - Tab switching + module init orchestration (~137 lines)
- `docs/lib/table.js` - Shared `DataTable` class for all tabular modules (370 lines)
- `docs/styles.css` - Complete theming, no component libraries (895 lines)
- `docs/modules/*.js` - Three separate modules, 400-900 lines each

## Module Development Patterns

### DataTable Usage (Liftarms, Gears modules)
```javascript
// Create table
const table = new DataTable('container-id', [
  { key: 'sx', label: 'S.x', type: 'number' },
  { key: 'name', label: 'Name', type: 'text' }
]);

// Set data + presets
table.setData(results);
table.setPresets([
  { name: 'Preset 1', filters: { sx: 1, name: 'foo' } }
]);
table.render();
```
- Columns defined with `type: 'number'` or `'text'` - auto-handles min/max range filtering vs text search
- Presets appear as dropdown above table; clicking a preset applies its filters
- Sorting: click column headers, shows ▲/▼ indicator, toggling asc/desc
- **Important**: `formatNumber()` helper for coordinate precision (see liftarms.js L67-71)

### IIFE Module Pattern (Gearbox module - most complex)
```javascript
(function() {
    'use strict';

    // Private data
    let state = {};
    
    function init() {
        container = document.getElementById('gearbox-module');
        resetData();  // Fresh state each tab switch
        renderControls();
        renderDiagram();
        renderResults();
        compute();
    }
    
    // Public: only the register call
    TechnicTools.registerModule('gearbox-module', 'Gearbox Calculator', init);
})();
```
- **No global state pollution** - all state is closure-scoped
- `init()` runs once when tab is clicked; clears container, rebuilds UI
- Helper functions (render*, compute, etc.) are private to module
- Only call `TechnicTools.registerModule()` at module end

### Geometry Calculations (Liftarms module)
- **Point class**: `x`, `y` coords, methods `distanceTo(other)` and `circleIntersections(r0, other, r1)`
- Circle intersection returns 0-2 Point objects (handles edge cases: no solution, tangent, normal)
- **Precision**: Use `formatNumber(value, decimals)` for consistent rounding; store as string, parse later if needed
- Dedup with Set of unique keys: `createKey(sx, sy, aLen, bLen)` (see L83-86)
- **Tolerance**: For filter presets, use `Math.abs(val1 - val2) < 0.001` for float comparison (not `===`)

### Complex State with Classes (Gearbox module)
- `class Axle`, `class Connection`, `class Tool` - objects stored in module-scoped arrays
- Tool types: `'source'`, `'coupling'`, `'selector'`, `'differential'` (immutable after creation)
- **IMPORTANT TERMINOLOGY**:
  - "gear mode" = overall gearbox operating mode (Mode 1, Mode 2, etc.) - stored as `tool.status[modeNum]`
  - "gear piece" = individual circular component with teeth (Gear A, Gear B on couplings)
  - Never use just "gear" alone - always clarify which meaning
- Selector params use `mode${g}` keys (e.g., `tool.params.mode1 = 'A'|'Free'|'B'`)
- Tool status tracked per mode: `tool.status[modeNum] = { error?: string, flagged?: bool }`
- Error "Conflicting outputs" used when multiple tools output to same axle in a mode
- **Propagation algorithm** (compute function): 
  1. Initialize axle values from source (speed=1, torque=1)
  2. Loop tools, evaluate each, update axle values
  3. Repeat until no changes (max 100 iterations)
  4. Store errors/flags in `tool.status` for rendering

### Event Listener Pattern
- **Button clicks**: `document.getElementById(...).addEventListener('click', handler)`
- **Form changes**: `addEventListener('change', handler)` for inputs/selects
- **Event delegation**: Card-level listeners for all param/connection inputs (not individually)
  - See gearbox.js `attachParamListeners()` - querySelectorAll on card, iterate inputs
- **DOM updates**: After state change, call `updateDiagram()` or `render*()` to rebuild affected sections

### HTML/DOM Patterns
- **Container IDs match module IDs** for `document.getElementById()` reliability
- **data-* attributes**: Use `data-param="name"`, `data-conn="Center"`, `data-module="liftarms-module"` for event target lookup
- **CSS classes for state**: `.active`, `.error`, `.has-flag`, `.has-error` for styling
- **innerHTML for bulk content** (no performance concern in this app), direct DOM creation for dynamic event-heavy elements

## Adding a New Module

1. Create `docs/modules/my-module.js` with IIFE + `registerModule()` call
2. Add tab button + container in `index.html`:
   ```html
   <button class="tab-button" data-module="my-module">My Module</button>
   <!-- later in main -->
   <div id="my-module" class="module-container"></div>
   <script src="modules/my-module.js"></script>
   ```
3. If using tables, instantiate `DataTable` with columns array
4. For complex state (like Gearbox), use classes + module-scoped arrays
5. CSS: Add to `docs/styles.css` under module-specific sections (search for `.gearbox-` for example)

## Development Workflow

### Local Testing
- **Python**: `cd docs && python -m http.server 8000` → `http://localhost:8000`
- **Node/npx**: `cd docs && npx http-server` → `http://localhost:8080`
- **Live reload** (npx): `npx http-server -c-1`

### Browser DevTools Debugging
- **F12 Console**: Check for module init errors; test `TechnicTools.getModules()` to inspect registered modules
- **Network tab**: Verify all JS files load (check `.nojekyll` is committed on GitHub Pages)
- **Performance**: Liftarms with max=15 + half-studs can take 1-2s; acceptable range

### GitHub Pages Deployment
- Ensure `.nojekyll` exists in `docs/` (disables Jekyll processing)
- Push to `main` → Settings → Pages → Source: `docs` folder
- Check Actions tab for build status

## Code Style & Conventions

- **Strict mode**: `'use strict';` at top of every module
- **Formatting**: No semicolon requirement enforced, but module code is consistent (uses semicolons)
- **Variable naming**: 
  - Single-letter (S, T, I, A, B) for geometric points (matches domain language in Technic)
  - camelCase for functions/variables (e.g., `calculatePositions`, `formatNumber`)
  - UPPERCASE for constants (none in current codebase, but follow if adding)
- **Comments**: JSDoc blocks for public functions, inline for complex logic (circle intersection math)
- **Error handling**: Try/catch in module init (see app.js L68-77); display errors in UI, don't throw silently

## Common Gotchas

1. **Module state not resetting**: Call `resetData()` in `init()` (Gearbox does this, Liftarms recalculates on button click)
2. **Floating-point comparison**: Always use tolerance `< 0.001` for filter logic, never `===`
3. **DataTable presets not filtering**: Presets apply via dropdown; manually call `table.applyFilters()` if setting filters from code
4. **Tool status not updating**: Status is computed in `compute()` and stored in `tool.status[modeNum]`; call `updateDiagram()` after to re-render
5. **Event listeners firing multiple times**: Clear container with `innerHTML = ''` before re-rendering, or use `.removeEventListener()` for re-use

## File Size & Performance

- Total HTML+CSS+JS: ~3000 lines, ~80KB minified
- Slowest operation: Liftarms with `maxA=15, maxB=15, halfStuds=true` (~2000 rows, ~1.5s on modern browser)
- No external libraries; all math is procedural
- DOM rendering is bulk `innerHTML` (fast enough for <5000 rows)

## Testing Strategy

- **Unit test approach**: Manual testing in browser (no test framework)
- **Critical paths to verify**:
  - Tab switching loads correct module
  - Table filtering + presets work together
  - Gearbox propagation converges (no infinite loops)
  - Floating-point edge cases (e.g., angles near 0° or 180°)

## Reference & Documentation

- `README.md` - User-facing guide, deployment, extending instructions
- Inline comments in modules explain complex math (e.g., circle intersection in liftarms.js L35-60)
