# Technic Brick Tools

A web application providing engineering calculation tools for Technic Brick builders. Build complex mechanisms by calculating liftarm positions, gear couplings, and gearbox configurations.

**Live Demo**: https://joaocgreis.github.io/brick-tools (once deployed to GitHub Pages)

## Features

### 1. Two Liftarm Dimensions
Calculates all positions reachable by two technic liftarms locked in sequence.

- **Input Controls**:
  - Max Liftarm A Length (1-15 studs, default 5)
  - Max Liftarm B Length (1-15 studs, default 5)
  - Include half-stud positions (toggle)
  - Calculate button

- **Algorithm**: Uses circle intersection mathematics to find where two liftarms can connect
  - Liftarm A starts at origin (0,0)
  - Liftarm B ends at target point T
  - Connection point I is calculated as the intersection of two circles

- **Output Table**: 12 columns with full dimensions and angles
  - S position (x, y coordinates and stud number)
  - Liftarm lengths (A and B)
  - Target point T (x, y)
  - Intersection point I (x, y)
  - Angles (∠A°, ∠B°, Min∠°)

- **Filter Presets**:
  - **All Results**: No filtering
  - **Hypotenuses**: Iy = 0 AND Tx = Ix (horizontal A, vertical B)
  - **Catheti**: Ix = Tx AND Ty = 0 (B vertical from x-axis)
  - **90 Degrees**: Minimum angle between liftarms = 90°

- **Features**:
  - Multi-column sorting and filtering
  - Floating-point coordinates (0.001 precision)
  - Automatic deduplication

### 2. Gear Couplings
Calculates all possible gear coupling configurations between two Technic Brick gears.

- **Input Controls**:
  - Gear teeth selection: checkboxes for 1(1L), 1(2L), 8, 12, 16, 20, 24, 28, 36, 40
  - Custom gear input for any positive integer
  - Max overfit distance (0-1 studs, default 0.2)
  - Min underfit distance (0-1 studs, default 0.1)

- **Gear Types**:
  - **Worm Gears**: 1(1L) radius=0.75, 1(2L) radius=0.5 (driver only)
  - **Regular Gears**: Radius = teeth/16 studs

- **Output Table**: Calculates center distance and all valid mounting positions
  - **Gear A & B**: Tooth counts
  - **Ratio**: Gear ratio (2 decimal places)
  - **Dist**: Center distance in studs (3 decimal places)
  - **Exact**: Mounting positions with exact center distance (black text)
  - **Overfit**: Positions greater than ideal distance (color-coded)
    - 🟢 Green: distance ≤ centerDist + 0.05
    - 🟠 Orange: distance ≤ centerDist + 0.1
    - 🔴 Red: distance > centerDist + 0.1
  - **Underfit**: Positions less than ideal distance (red text)

- **Features**:
  - Half-stud mounting positions considered
  - Color-coded fit quality
  - Worm gears handled correctly
  - Multi-column sorting and filtering

### 3. Gearbox Calculator
Designs complex gearboxes by connecting transmission tools dynamically.

- **Tool Types**:
  - **Coupling**: Two gears with configurable teeth (8-40 each)
    - Speed multiplier: input_speed × (input_teeth / output_teeth)
    - Torque multiplier: input_torque × (output_teeth / input_teeth)
  
  - **Selector**: Rotary catch selector with 3 connections (Center, A, B)
    - Per-gear selection: A, B, or Free
    - Transmits speed/torque unchanged
  
  - **Differential**: Differential gear with 3 connections (Body, A, B)
    - Distributes input across two outputs
    - Mode 0: output = 2 × input0 × mul - input1
    - Mode 2: output = (input0 + input1) / 2 / mul

  - **Source Axle**: Starting point with fixed speed=1, torque=1

- **Input Controls**:
  - Number of gears (1-9, default 3)
  - Add Coupling, Selector, Differential buttons
  - Connection dropdowns (select which axle each connection links to)
  - Parameter inputs (teeth counts, selector positions)

- **Features**:
  - Dynamic tool adding/removing
  - Automatic axle creation and linking
  - Per-gear computation with error detection
  - Iterative propagation for speed/torque calculation
  - Visual status indicators (errors, flagged tools)
  - Bar chart visualization of results

## Project Structure

```
docs/
├── index.html              # Main HTML page
├── app.js                  # Module registration and tab logic
├── styles.css              # Comprehensive CSS styling
├── .nojekyll               # GitHub Pages configuration
├── lib/
│   └── table.js            # Reusable DataTable component
└── modules/
    ├── liftarms.js         # Liftarms calculator
    ├── gears.js            # Gear couplings calculator
    └── gearbox.js          # Gearbox designer
```

## Running Locally

### Option 1: Python (Built-in HTTP Server)

**Python 3.x**:
```bash
cd docs
python -m http.server 8000
```

**Python 2.7** (older systems):
```bash
cd docs
python -m SimpleHTTPServer 8000
```

Open your browser to `http://localhost:8000`

**Advantages**:
- No installation required (Python is often pre-installed)
- Simple one-liner command
- Perfect for quick local testing

### Option 2: Node.js with npx (http-server)

Install Node.js from https://nodejs.org/ (includes npx)

```bash
cd docs
npx http-server
```

By default, it runs on `http://localhost:8080`

To specify a different port:
```bash
npx http-server -p 8000
```

**Advantages**:
- Live reload capability with `-c-1` flag:
  ```bash
  npx http-server -c-1
  ```
- More features (basic auth, CORS, etc.)
- Better for development if you already use Node.js

### Option 3: Node.js with http-server (Global Installation)

Install http-server globally:
```bash
npm install -g http-server
```

Then run:
```bash
cd docs
http-server
```

## Deployment to GitHub Pages

### Step 1: Prepare Your Repository

Ensure the `docs` folder contains all files. The structure should be:
```
brick-tools/
├── docs/
│   ├── index.html
│   ├── app.js
│   ├── styles.css
│   ├── .nojekyll
│   ├── lib/
│   │   └── table.js
│   └── modules/
│       ├── liftarms.js
│       ├── gears.js
│       └── gearbox.js
├── README.md
└── ...
```

### Step 2: Push to GitHub

```bash
git add .
git commit -m "Add Technic Brick Tools application"
git push origin main
```

### Step 3: Configure GitHub Pages

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Pages**
3. Under "Build and deployment":
   - Source: select "Deploy from a branch"
   - Branch: select `main` (or your default branch)
   - Folder: select `/docs`
4. Click "Save"
5. Wait 1-2 minutes for deployment

Your site will be available at: `https://<username>.github.io/brick-tools/`

### Verify Deployment

- Check the Actions tab to see deployment status
- If there are issues, check the action logs
- Clear browser cache if changes don't appear

## Extending the Application

### Adding a New Module

1. **Create the module file** in `docs/modules/`:

```javascript
// docs/modules/my-tool.js
(function() {
    'use strict';

    function init() {
        const container = document.getElementById('my-tool-module');
        
        // Build your UI
        container.innerHTML = `
            <div class="module-content">
                <h2>My Tool</h2>
                <!-- Your controls and results here -->
            </div>
        `;
        
        // Add event listeners and logic
    }

    // Register with TechnicTools
    TechnicTools.registerModule('my-tool-module', 'My Tool', init);
})();
```

2. **Add to index.html**:

```html
<!-- In the <nav class="tabs"> section -->
<button class="tab-button" data-module="my-tool-module">My Tool</button>

<!-- In the <main class="content"> section -->
<div id="my-tool-module" class="module-container"></div>

<!-- In the script includes at the end -->
<script src="modules/my-tool.js"></script>
```

3. **Add CSS styling** to `docs/styles.css` as needed

4. **Use the DataTable component** for tabular results:

```javascript
const table = new DataTable('my-results-table', [
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'value', label: 'Value', type: 'number' }
]);

table.setData([
    { name: 'Item 1', value: 42 },
    { name: 'Item 2', value: 100 }
]);

table.setPresets([
    { name: 'Filter 1', filters: { name: 'Item' } }
]);

table.render();
```

## Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- IE 11: ❌ Not supported (uses ES6 features)

## Technologies Used

- **HTML5**: Semantic markup
- **CSS3**: Modern styling with CSS variables
- **Vanilla JavaScript**: ES6+ (no build step required)
- **Math.js-free**: Pure mathematical algorithms

## Performance Notes

- Liftarms module: Fast for reasonable arm lengths (≤10 studs)
- Gears module: Very fast, searches half-stud positions
- Gearbox module: Iterative propagation, typically converges in <10 iterations

For very large searches, consider:
1. Reducing max values
2. Disabling half-stud positions
3. Using browser dev tools to monitor performance

## Contributing

When adding features:
1. Keep modules self-contained
2. Use the DataTable component for tabular data
3. Follow the existing code style
4. Test locally before deploying
5. Update README with new features

## Troubleshooting

### Application won't load
- Check browser console (F12 → Console) for errors
- Verify all script files are present in docs folder
- Clear browser cache (Ctrl+F5 or Cmd+Shift+R)

### Tables are empty
- Click "Calculate" button to run calculations
- Check if filter presets are too restrictive
- Verify input parameters are in valid ranges

### GitHub Pages deployment fails
- Ensure `.nojekyll` file is present in docs folder
- Check GitHub Actions log for specific errors
- Verify branch name in Pages settings

### Slow calculations
- Reduce max length inputs
- Disable half-stud option
- Use a modern browser (Chrome/Firefox are fastest)
