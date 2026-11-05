let currentChartType = 'line';
let selectedIdx = 0;

// Separate default data for line/scatter vs bar charts
let lineSeries = [
  {
    label: 'Line 1',
    x_values: '0, 10, 20, 30, 40, 50',
    values: '0, 12, 24, 35, 42, 50',
    errors: '',
    color: '#1c1b18',
    linestyle: '-',
    marker: 'o',
    hatch: ''
  }
];

let barSeries = [
  {
    label: 'Group 1',
    x_values: 'Brown, Blue, Green, Hazel',
    values: '18, 12, 6, 4',
    errors: '',
    color: '#2c4c3e',
    linestyle: '-',
    marker: 'o',
    hatch: ''
  }
];

let savedLineMeta = {
  title: 'Graph',
  xlabel: 'Time (s)',
  ylabel: 'Meters (m)',
  scale_x: '0, 10, 20, 30, 40, 50',
  scale_y: '0, 10, 20, 30, 40, 50'
};

let savedBarMeta = {
  title: 'Graph',
  xlabel: 'Eye Colour',
  ylabel: 'Number of People',
  scale_x: '',
  scale_y: '0, 5, 10, 15, 20'
};

// Canvas font stacks for each family choice
const FONT_STACKS = {
  sans: '"DejaVu Sans", Arial, Helvetica, sans-serif',
  georgia: 'Georgia, "Times New Roman", serif',
  times: '"Times New Roman", Times, serif',
  mono: '"Courier New", Courier, monospace',
  verdana: 'Verdana, Geneva, sans-serif',
  trebuchet: '"Trebuchet MS", "Segoe UI", sans-serif'
};

function activeList() {
  return currentChartType === 'bar' ? barSeries : lineSeries;
}

// Read a number input safely with a default and limits
function clampInt(id, def, min, max) {
  const v = parseFloat(document.getElementById(id).value);
  if (Number.isNaN(v)) return def;
  return Math.max(min, Math.min(max, Math.round(v)));
}

// Split comma-separated text into trimmed items
function splitItems(text) {
  if (!text) return [];
  return String(text).split(',').map(s => s.trim()).filter(Boolean);
}

// Split comma-separated text into numbers
function splitNumbers(text) {
  return splitItems(text).map(Number).filter(n => !Number.isNaN(n));
}

// Pair X and Y values safely without breaking while typing
function pairXY(xText, yText, allowWords) {
  const xRaw = splitItems(xText);
  const yRaw = splitItems(yText);
  const count = Math.min(xRaw.length, yRaw.length);
  const xs = [];
  const ys = [];

  for (let i = 0; i < count; i++) {
    const yVal = Number(yRaw[i]);
    if (Number.isNaN(yVal)) continue;

    if (allowWords) {
      xs.push(xRaw[i]);
      ys.push(yVal);
    } else {
      const xVal = Number(xRaw[i]);
      if (!Number.isNaN(xVal)) {
        xs.push(xVal);
        ys.push(yVal);
      }
    }
  }
  return { xs, ys };
}

function saveMeta(type) {
  const target = type === 'bar' ? savedBarMeta : savedLineMeta;
  target.title = document.getElementById('title').value;
  target.xlabel = document.getElementById('xlabel').value;
  target.ylabel = document.getElementById('ylabel').value;
  target.scale_x = document.getElementById('scale_x').value;
  target.scale_y = document.getElementById('scale_y').value;
}

function loadMeta(type) {
  const src = type === 'bar' ? savedBarMeta : savedLineMeta;
  document.getElementById('title').value = src.title;
  document.getElementById('xlabel').value = src.xlabel;
  document.getElementById('ylabel').value = src.ylabel;
  document.getElementById('scale_x').value = src.scale_x;
  document.getElementById('scale_y').value = src.scale_y;
}

function setChartType(nextType) {
  const wasBar = (currentChartType === 'bar');
  const willBeBar = (nextType === 'bar');

  if (wasBar !== willBeBar) {
    saveMeta(currentChartType);
    loadMeta(nextType);
    selectedIdx = 0;
  }
  currentChartType = nextType;

  document.querySelectorAll('.type-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-type') === nextType);
  });

  // Hide Scale X in Bar Chart mode because the bottom axis holds categories
  document.getElementById('scale_x_row').style.display = willBeBar ? 'none' : 'grid';
  document.getElementById('points_heading').textContent = willBeBar ? '3. Bars to Plot' : '3. Points to Plot';
  document.getElementById('add_btn').textContent = willBeBar ? '+ Add Bar Group' : '+ Add Another Line';

  renderSeriesSection();
  draw();
}

function renderSeriesSection() {
  const list = activeList();
  const tabsEl = document.getElementById('seriesTabs');
  const editorEl = document.getElementById('seriesEditor');

  if (selectedIdx >= list.length) selectedIdx = Math.max(0, list.length - 1);

  tabsEl.innerHTML = list.map((s, idx) => `
    <div class="series-tab ${idx === selectedIdx ? 'active' : ''}" onclick="selectSeries(${idx})">
      <span class="dot" style="background:${s.color}"></span>
      <span>${escapeHtml(s.label || ('Line ' + (idx + 1)))}</span>
    </div>
  `).join('');

  const s = list[selectedIdx];
  const isBar = (currentChartType === 'bar');
  const xTag = isBar ? 'CATEGORIES' : 'X VALUE';
  const yTag = isBar ? 'BAR HEIGHT' : 'Y VALUE';
  const xHolder = isBar ? 'e.g. Brown, Blue, Green, Hazel' : 'e.g. 0, 10, 20, 30, 40, 50';
  const yHolder = isBar ? 'e.g. 18, 12, 6, 4' : 'e.g. 0, 12, 24, 35, 42, 50';

  editorEl.innerHTML = `
    <div class="xy-box">
      <div class="xy-row">
        <div class="xy-tag">${xTag}</div>
        <input type="text" class="xy-input" value="${escapeHtml(s.x_values)}"
          placeholder="${xHolder}"
          oninput="updateSeriesCoord(${selectedIdx}, 'x_values', this.value)">
      </div>
      <div class="xy-row">
        <div class="xy-tag">${yTag}</div>
        <input type="text" class="xy-input" value="${escapeHtml(s.values)}"
          placeholder="${yHolder}"
          oninput="updateSeriesCoord(${selectedIdx}, 'values', this.value)">
      </div>
      <div class="status-line" id="pairStatus">${getPairStatus(s)}</div>
    </div>

    <div class="row">
      <div>
        <label>Name (for Legend)</label>
        <input type="text" value="${escapeHtml(s.label)}" oninput="updateSeriesField(${selectedIdx}, 'label', this.value)">
      </div>
      <div>
        <label>Colour</label>
        <div style="display:flex; gap:6px;">
          <input type="color" value="${s.color}" style="width:42px; height:33px; padding:2px; border:1px solid #d6d3cb; border-radius:4px; cursor:pointer;"
            oninput="updateSeriesField(${selectedIdx}, 'color', this.value)">
          <select onchange="updateSeriesField(${selectedIdx}, 'color', this.value)">
            <option value="${s.color}">Select preset...</option>
            <option value="#1c1b18">Charcoal Black</option>
            <option value="#2c4c3e">Forest Green</option>
            <option value="#8f4426">Terracotta</option>
            <option value="#2b547e">Slate Blue</option>
            <option value="#a62b2b">Crimson Red</option>
            <option value="#8c6d2c">Ochre Gold</option>
            <option value="#75726b">Warm Grey</option>
          </select>
        </div>
      </div>
    </div>

    <div class="row">
      <div>
        <label>Line Style</label>
        <select onchange="updateSeriesField(${selectedIdx}, 'linestyle', this.value)">
          <option value="-" ${s.linestyle==='-'?'selected':''}>Solid (—)</option>
          <option value="--" ${s.linestyle==='--'?'selected':''}>Dashed (--)</option>
          <option value=":" ${s.linestyle===':'?'selected':''}>Dotted (...)</option>
          <option value="-." ${s.linestyle==='-.'?'selected':''}>Dash-Dot (-.)</option>
          <option value="None" ${s.linestyle==='None'?'selected':''}>No Line (Points Only)</option>
        </select>
      </div>
      <div>
        <label>Point Marker</label>
        <select onchange="updateSeriesField(${selectedIdx}, 'marker', this.value)">
          <option value="o" ${s.marker==='o'?'selected':''}>Circle (o)</option>
          <option value="s" ${s.marker==='s'?'selected':''}>Square</option>
          <option value="^" ${s.marker==='^'?'selected':''}>Triangle</option>
          <option value="D" ${s.marker==='D'?'selected':''}>Diamond</option>
          <option value="x" ${s.marker==='x'?'selected':''}>Cross (x)</option>
          <option value="None" ${s.marker==='None'?'selected':''}>None</option>
        </select>
      </div>
    </div>

    <div class="row" style="margin-bottom:0;">
      <div>
        <label>Bar Pattern (for Bar Charts)</label>
        <select onchange="updateSeriesField(${selectedIdx}, 'hatch', this.value)">
          <option value="" ${s.hatch===''?'selected':''}>Solid Fill</option>
          <option value="///" ${s.hatch==='///'?'selected':''}>Diagonal ///</option>
          <option value="..." ${s.hatch==='...'?'selected':''}>Dots ...</option>
          <option value="xxx" ${s.hatch==='xxx'?'selected':''}>Crosshatch xxx</option>
        </select>
      </div>
      <div>
        <label>Error Bars (±) (optional)</label>
        <input type="text" value="${escapeHtml(s.errors || '')}" placeholder="e.g. 1.5"
          oninput="updateSeriesCoord(${selectedIdx}, 'errors', this.value)">
      </div>
    </div>

    ${list.length > 1 ? `
      <div style="margin-top:10px; display:flex; justify-content:flex-end;">
        <button class="btn btn-danger" onclick="removeSeries(${selectedIdx})">Delete This Line / Bar</button>
      </div>
    ` : ''}
  `;
}

function getPairStatus(s) {
  const xCount = splitItems(s.x_values).length;
  const yCount = splitItems(s.values).length;
  const paired = Math.min(xCount, yCount);
  const unit = currentChartType === 'bar' ? 'bar(s)' : 'point(s)';
  if (xCount === yCount) {
    return `${paired} ${unit} plotted`;
  }
  return `${paired} ${unit} plotted (${xCount} in top box, ${yCount} in bottom box)`;
}

function selectSeries(idx) {
  selectedIdx = idx;
  renderSeriesSection();
}

function updateSeriesCoord(idx, key, val) {
  const list = activeList();
  list[idx][key] = val;
  const stEl = document.getElementById('pairStatus');
  if (stEl) stEl.textContent = getPairStatus(list[idx]);
  draw();
}

function updateSeriesField(idx, key, val) {
  const list = activeList();
  list[idx][key] = val;
  renderSeriesSection();
  draw();
}

function addSeries() {
  const palette = ['#1c1b18', '#8f4426', '#2c4c3e', '#2b547e', '#8c6d2c', '#a62b2b'];
  const markers = ['o', 's', '^', 'D', 'x'];
  const list = activeList();
  const i = list.length;

  if (currentChartType === 'bar') {
    list.push({
      label: `Group ${i + 1}`,
      x_values: list[0].x_values,
      values: '10, 15, 9, 7',
      errors: '',
      color: palette[(i + 1) % palette.length],
      linestyle: '-',
      marker: 'o',
      hatch: ''
    });
  } else {
    list.push({
      label: `Line ${i + 1}`,
      x_values: list[0].x_values,
      values: '0, 8, 18, 28, 36, 44',
      errors: '',
      color: palette[i % palette.length],
      linestyle: '--',
      marker: markers[i % markers.length],
      hatch: ''
    });
  }
  selectedIdx = list.length - 1;
  document.getElementById('show_legend').checked = true;
  renderSeriesSection();
  draw();
}

function removeSeries(idx) {
  const list = activeList();
  if (list.length <= 1) return;
  list.splice(idx, 1);
  if (selectedIdx >= list.length) selectedIdx = list.length - 1;
  renderSeriesSection();
  draw();
}

function escapeHtml(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Apply a resolution preset and scale the font sizes to match
function applyResPreset(val) {
  if (val === 'custom') return;
  const sizes = {
    small: [1000, 650],
    medium: [1400, 900],
    large: [2100, 1350],
    a4: [3508, 2480],
    square: [1400, 1400]
  };
  const pick = sizes[val];
  if (!pick) return;

  const curW = clampInt('res_w', 1400, 400, 6000);
  const ratio = pick[0] / curW;

  ['title_font', 'label_font', 'tick_font'].forEach(id => {
    const el = document.getElementById(id);
    const cur = parseFloat(el.value) || 28;
    el.value = Math.max(8, Math.min(200, Math.round(cur * ratio)));
  });

  document.getElementById('res_w').value = pick[0];
  document.getElementById('res_h').value = pick[1];
  draw();
}

// Manual width/height edits switch the preset box back to Custom
function markResCustom() {
  document.getElementById('res_preset').value = 'custom';
}

// Compute clean tick marks when Scale X or Scale Y is left empty
function buildAutoTicks(minVal, maxVal) {
  if (minVal === maxVal) {
    minVal -= 1;
    maxVal += 1;
  }
  const span = maxVal - minVal;
  const rawStep = span / 5;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / mag;
  let step = mag;
  if (norm > 5) step = 10 * mag;
  else if (norm > 2) step = 5 * mag;
  else if (norm > 1) step = 2 * mag;

  const start = Math.floor(minVal / step) * step;
  const end = Math.ceil(maxVal / step) * step;
  const ticks = [];
  for (let v = start; v <= end + step * 0.001; v += step) {
    ticks.push(Number(v.toFixed(6)));
  }
  return ticks;
}

// Shrink and wrap a long title so it stays inside the page
function layoutTitle(ctx, text, fontName, baseSize, maxW) {
  ctx.font = `${baseSize}px ${fontName}`;
  const w = ctx.measureText(text).width;
  if (w <= maxW) return { lines: [text], size: baseSize };

  let size = Math.floor(baseSize * maxW / w);
  if (size >= 14 || !text.includes(' ')) {
    return { lines: [text], size: Math.max(10, size) };
  }

  // Split into two balanced lines and shrink those instead
  const words = text.split(/\s+/);
  let best = null;
  let bestMax = Infinity;
  for (let i = 1; i < words.length; i++) {
    const l1 = words.slice(0, i).join(' ');
    const l2 = words.slice(i).join(' ');
    const m = Math.max(ctx.measureText(l1).width, ctx.measureText(l2).width);
    if (m < bestMax) {
      bestMax = m;
      best = [l1, l2];
    }
  }
  size = Math.max(10, Math.floor(baseSize * maxW / bestMax));
  return { lines: best, size };
}

// Create a canvas pattern for hatched bars (diagonal, dots, crosshatch)
function createBarPattern(ctx, color, hatch, k) {
  const pCanvas = document.createElement('canvas');
  pCanvas.width = Math.max(8, Math.round(16 * k));
  pCanvas.height = Math.max(8, Math.round(16 * k));
  const pCtx = pCanvas.getContext('2d');
  const s = pCanvas.width;

  pCtx.fillStyle = color;
  pCtx.fillRect(0, 0, s, s);

  pCtx.strokeStyle = 'rgba(255,255,255,0.65)';
  pCtx.fillStyle = 'rgba(255,255,255,0.65)';
  pCtx.lineWidth = Math.max(1.5, 2 * k);

  if (hatch === '///') {
    pCtx.beginPath();
    pCtx.moveTo(-s / 4, s); pCtx.lineTo(s, -s / 4);
    pCtx.moveTo(s / 4, s * 1.25); pCtx.lineTo(s * 1.25, s / 4);
    pCtx.stroke();
  } else if (hatch === '...') {
    pCtx.beginPath();
    pCtx.arc(s / 4, s / 4, s / 8, 0, Math.PI * 2);
    pCtx.arc(s * 0.75, s * 0.75, s / 8, 0, Math.PI * 2);
    pCtx.fill();
  } else if (hatch === 'xxx') {
    pCtx.beginPath();
    pCtx.moveTo(0, s); pCtx.lineTo(s, 0);
    pCtx.moveTo(0, 0); pCtx.lineTo(s, s);
    pCtx.stroke();
  }
  return ctx.createPattern(pCanvas, 'repeat');
}

// Draw the graph onto the canvas at the chosen resolution
function draw() {
  const canvas = document.getElementById('graphCanvas');
  const resW = clampInt('res_w', 1400, 400, 6000);
  const resH = clampInt('res_h', 900, 400, 6000);
  if (canvas.width !== resW) canvas.width = resW;
  if (canvas.height !== resH) canvas.height = resH;

  const W = canvas.width;
  const H = canvas.height;
  const ctx = canvas.getContext('2d');

  const title = document.getElementById('title').value;
  const xlabel = document.getElementById('xlabel').value;
  const ylabel = document.getElementById('ylabel').value;
  const scaleX = splitNumbers(document.getElementById('scale_x').value);
  const scaleY = splitNumbers(document.getElementById('scale_y').value);
  const showValues = document.getElementById('show_values').checked;
  const showLegend = document.getElementById('show_legend').checked;
  const barWidthRatio = parseFloat(document.getElementById('bar_width').value || 0.6);
  const refLineRaw = document.getElementById('ref_line_y').value.trim();
  const list = activeList();

  const fontKey = document.getElementById('font_family').value;
  const fontName = FONT_STACKS[fontKey] || FONT_STACKS.sans;
  const titleFont = clampInt('title_font', 28, 8, 200);
  const labelFont = clampInt('label_font', 24, 8, 200);
  const tickFont = clampInt('tick_font', 23, 8, 200);
  const valueFont = Math.max(9, Math.round(tickFont * 0.88));
  const gridStyle = document.getElementById('grid_style').value;
  const canvasBg = document.getElementById('canvas_bg').value;

  const isBar = (currentChartType === 'bar');
  const isHist = (currentChartType === 'histogram');

  // Background fill (or clear for a transparent PNG)
  const canvasBox = document.querySelector('.canvas-box');
  if (canvasBg === 'transparent') {
    canvasBox.classList.add('transparent');
    ctx.clearRect(0, 0, W, H);
  } else {
    canvasBox.classList.remove('transparent');
    ctx.fillStyle = canvasBg;
    ctx.fillRect(0, 0, W, H);
  }

  // Plot frame geometry, scaled with the canvas size
  const k = W / 1400;
  const padL = Math.max(135 * k, tickFont * 2.4 + 70 * k);
  const padR = 55 * k;
  const padT = Math.max(90 * k, titleFont * 1.6 + 26 * k);
  const padB = Math.max(120 * k, tickFont * 1.7 + 64 * k);
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  // ---- Parse the data for the current mode ----

  // Bar chart: categories on the bottom axis
  let categories = [];
  let barParsed = [];
  let nCats = 1;
  let stepX = plotW;
  if (isBar) {
    list.forEach(s => {
      const { xs, ys } = pairXY(s.x_values, s.values, true);
      if (ys.length === 0) return;
      xs.forEach(c => {
        if (!categories.includes(c)) categories.push(c);
      });
      barParsed.push({ s, xs, ys, errs: splitNumbers(s.errors) });
    });
    nCats = Math.max(categories.length, 1);
    stepX = plotW / nCats;
  }

  // Line/scatter: numeric X ticks and scaling
  let xTicks = null;
  let toX = null;
  if (!isBar && !isHist) {
    let allX = [0];
    list.forEach(s => {
      const { xs } = pairXY(s.x_values, s.values, false);
      allX.push(...xs);
    });

    xTicks = scaleX.length >= 2
      ? [...new Set(scaleX)].sort((a, b) => a - b)
      : buildAutoTicks(Math.min(...allX), Math.max(...allX, 1));

    const xTickMin = xTicks[0];
    const xTickMax = xTicks[xTicks.length - 1];
    const xSpan = (xTickMax - xTickMin) || 1;
    // Matplotlib-style breathing margin so points don't touch the frame
    const xDomainMin = xTickMin - xSpan * 0.045;
    const xDomainMax = xTickMax + xSpan * 0.045;
    toX = val => padL + ((val - xDomainMin) / (xDomainMax - xDomainMin)) * plotW;
  }

  // ---- Y ticks and scaling ----
  let allY = [0];
  if (isHist) {
    list.forEach(s => allY.push(splitNumbers(s.values).length));
  } else {
    list.forEach(s => {
      const { ys } = pairXY(s.x_values, s.values, isBar);
      allY.push(...ys);
    });
  }

  let yTicks = scaleY.length >= 2
    ? [...new Set(scaleY)].sort((a, b) => a - b)
    : buildAutoTicks(Math.min(...allY), Math.max(...allY, 1));

  const yTickMin = yTicks[0];
  const yTickMax = yTicks[yTicks.length - 1];
  const ySpan = (yTickMax - yTickMin) || 1;
  // Bars sit flush on y=0; line/scatter graphs get a small margin
  const yPadLow = (isBar || isHist) ? 0 : ySpan * 0.045;
  const yPadHigh = ySpan * 0.055;
  const yDomainMin = yTickMin - yPadLow;
  const yDomainMax = yTickMax + yPadHigh;

  const toY = val => padT + plotH - ((val - yDomainMin) / (yDomainMax - yDomainMin)) * plotH;

  // ---- Grid layer ----
  const inPlotY = py => py >= padT - 2 && py <= padT + plotH + 2;

  if (gridStyle === 'paper') {
    // Fine minor lines every fifth of an interval, like graph paper squares
    ctx.strokeStyle = '#e8e4db';
    ctx.lineWidth = Math.max(0.8, 1.1 * k);
    for (let i = 0; i < yTicks.length - 1; i++) {
      const step = (yTicks[i + 1] - yTicks[i]) / 5;
      for (let m = 1; m <= 4; m++) {
        const py = toY(yTicks[i] + m * step);
        if (!inPlotY(py)) continue;
        ctx.beginPath();
        ctx.moveTo(padL, py);
        ctx.lineTo(padL + plotW, py);
        ctx.stroke();
      }
    }
    // Minor verticals: between numeric ticks, or at category boundaries
    if (isBar) {
      for (let i = 0; i <= nCats; i++) {
        const px = padL + stepX * i;
        ctx.beginPath();
        ctx.moveTo(px, padT);
        ctx.lineTo(px, padT + plotH);
        ctx.stroke();
      }
    } else if (xTicks) {
      for (let i = 0; i < xTicks.length - 1; i++) {
        const step = (xTicks[i + 1] - xTicks[i]) / 5;
        for (let m = 1; m <= 4; m++) {
          const px = toX(xTicks[i] + m * step);
          ctx.beginPath();
          ctx.moveTo(px, padT);
          ctx.lineTo(px, padT + plotH);
          ctx.stroke();
        }
      }
    }
    // Major lines on top
    ctx.strokeStyle = '#d5d1c7';
    ctx.lineWidth = Math.max(1, 1.4 * k);
    yTicks.forEach(t => {
      const py = toY(t);
      if (!inPlotY(py)) return;
      ctx.beginPath();
      ctx.moveTo(padL, py);
      ctx.lineTo(padL + plotW, py);
      ctx.stroke();
    });
    const vMajor = isBar
      ? categories.map((c, i) => padL + stepX * (i + 0.5))
      : (xTicks ? xTicks.map(toX) : []);
    vMajor.forEach(px => {
      ctx.beginPath();
      ctx.moveTo(px, padT);
      ctx.lineTo(px, padT + plotH);
      ctx.stroke();
    });
  } else if (gridStyle !== 'none') {
    const dash = gridStyle === 'dashed'
      ? [6 * k, 5 * k]
      : gridStyle === 'dotted' ? [2 * k, 5 * k] : [];
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = Math.max(1, 1.4 * k);
    ctx.setLineDash(dash);
    yTicks.forEach(t => {
      const py = toY(t);
      if (!inPlotY(py)) return;
      ctx.beginPath();
      ctx.moveTo(padL, py);
      ctx.lineTo(padL + plotW, py);
      ctx.stroke();
    });
    const vLines = isBar
      ? categories.map((c, i) => padL + stepX * (i + 0.5))
      : (xTicks ? xTicks.map(toX) : []);
    vLines.forEach(px => {
      ctx.beginPath();
      ctx.moveTo(px, padT);
      ctx.lineTo(px, padT + plotH);
      ctx.stroke();
    });
    ctx.setLineDash([]);
  }

  // ---- Y-axis tick marks and numbers ----
  ctx.font = `${tickFont}px ${fontName}`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  yTicks.forEach(t => {
    const py = toY(t);
    if (!inPlotY(py)) return;

    ctx.strokeStyle = '#1c1b18';
    ctx.lineWidth = 2 * k;
    ctx.beginPath();
    ctx.moveTo(padL - 9 * k, py);
    ctx.lineTo(padL, py);
    ctx.stroke();

    ctx.fillStyle = '#1c1b18';
    ctx.fillText(String(t), padL - 16 * k, py);
  });

  // ---- BAR CHART ----
  if (isBar) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = `${tickFont}px ${fontName}`;

    categories.forEach((cat, idx) => {
      const cx = padL + stepX * (idx + 0.5);
      ctx.strokeStyle = '#1c1b18';
      ctx.lineWidth = 2 * k;
      ctx.beginPath();
      ctx.moveTo(cx, padT + plotH);
      ctx.lineTo(cx, padT + plotH + 9 * k);
      ctx.stroke();

      ctx.fillStyle = '#1c1b18';
      ctx.fillText(cat, cx, padT + plotH + 16 * k);
    });

    const groupW = stepX * Math.min(Math.max(barWidthRatio, 0.15), 0.88);
    const singleW = groupW / Math.max(barParsed.length, 1);
    const basePy = toY(Math.max(0, yTickMin));

    barParsed.forEach((item, gIdx) => {
      const { s, xs, ys, errs } = item;
      xs.forEach((cat, i) => {
        const catIdx = categories.indexOf(cat);
        if (catIdx === -1) return;
        const center = padL + stepX * (catIdx + 0.5);
        const bx = center - groupW / 2 + gIdx * singleW + singleW * 0.04;
        const bw = singleW * 0.92;
        const topPy = toY(ys[i]);
        const bh = basePy - topPy;

        ctx.fillStyle = s.hatch ? createBarPattern(ctx, s.color, s.hatch, k) : s.color;
        ctx.fillRect(bx, topPy, bw, bh);
        ctx.strokeStyle = '#1c1b18';
        ctx.lineWidth = 2.2 * k;
        ctx.strokeRect(bx, topPy, bw, bh);

        // Optional error bar on bar
        const errVal = errs.length === ys.length ? errs[i] : (errs.length === 1 ? errs[0] : 0);
        if (errVal > 0) {
          drawErrorBar(ctx, bx + bw / 2, toY(ys[i] - errVal), toY(ys[i] + errVal), '#1c1b18', k);
        }

        if (showValues) {
          ctx.fillStyle = '#1c1b18';
          ctx.font = `${valueFont}px ${fontName}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(String(ys[i]), bx + bw / 2, topPy - (errVal > 0 ? 14 * k : 7 * k));
          ctx.font = `${tickFont}px ${fontName}`;
          ctx.textBaseline = 'top';
        }
      });
    });

  // ---- HISTOGRAM ----
  } else if (isHist) {
    const vals = splitNumbers(list[0] ? list[0].values : '');
    if (vals.length > 0) {
      const minV = Math.min(...vals);
      const maxV = Math.max(...vals);
      const bins = 6;
      const binW = (maxV - minV || 1) / bins;
      const counts = new Array(bins).fill(0);
      vals.forEach(v => {
        let idx = Math.floor((v - minV) / binW);
        if (idx >= bins) idx = bins - 1;
        counts[idx]++;
      });

      const stepW = (plotW * 0.88) / bins;
      const startX = padL + plotW * 0.06;
      const basePy = toY(0);

      counts.forEach((c, i) => {
        const bx = startX + i * stepW;
        const topPy = toY(c);
        ctx.fillStyle = list[0].color || '#2c4c3e';
        ctx.fillRect(bx, topPy, stepW, basePy - topPy);
        ctx.strokeStyle = '#1c1b18';
        ctx.lineWidth = 2 * k;
        ctx.strokeRect(bx, topPy, stepW, basePy - topPy);

        ctx.fillStyle = '#1c1b18';
        ctx.font = `${valueFont}px ${fontName}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText((minV + i * binW).toFixed(0), bx, padT + plotH + 14 * k);
      });
    }

  // ---- LINE, FILLED LINE, OR SCATTER + BEST FIT ----
  } else {
    // X-axis tick marks and numbers
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = `${tickFont}px ${fontName}`;

    xTicks.forEach(t => {
      const px = toX(t);
      if (px < padL - 2 || px > padL + plotW + 2) return;

      ctx.strokeStyle = '#1c1b18';
      ctx.lineWidth = 2 * k;
      ctx.beginPath();
      ctx.moveTo(px, padT + plotH);
      ctx.lineTo(px, padT + plotH + 9 * k);
      ctx.stroke();

      ctx.fillStyle = '#1c1b18';
      ctx.fillText(String(t), px, padT + plotH + 16 * k);
    });

    list.forEach(s => {
      const { xs, ys } = pairXY(s.x_values, s.values, false);
      if (ys.length === 0) return;
      const errs = splitNumbers(s.errors);

      // Filled area under curve
      if (currentChartType === 'area' && xs.length >= 2) {
        ctx.save();
        ctx.fillStyle = hexToRgba(s.color, 0.18);
        ctx.beginPath();
        ctx.moveTo(toX(xs[0]), toY(Math.max(0, yTickMin)));
        xs.forEach((xv, i) => ctx.lineTo(toX(xv), toY(ys[i])));
        ctx.lineTo(toX(xs[xs.length - 1]), toY(Math.max(0, yTickMin)));
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Line or scatter best-fit line
      if ((currentChartType === 'line' || currentChartType === 'area') && s.linestyle !== 'None') {
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 3.8 * k;
        applyLineDash(ctx, s.linestyle, k);

        ctx.beginPath();
        xs.forEach((xv, i) => {
          const px = toX(xv);
          const py = toY(ys[i]);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (currentChartType === 'scatter_trend' && xs.length >= 2) {
        const n = xs.length;
        const meanX = xs.reduce((a, b) => a + b, 0) / n;
        const meanY = ys.reduce((a, b) => a + b, 0) / n;
        let num = 0, den = 0;
        for (let i = 0; i < n; i++) {
          num += (xs[i] - meanX) * (ys[i] - meanY);
          den += (xs[i] - meanX) ** 2;
        }
        if (den > 0) {
          const m = num / den;
          const b = meanY - m * meanX;
          const x1 = Math.min(...xs);
          const x2 = Math.max(...xs);
          ctx.strokeStyle = s.color;
          ctx.lineWidth = 3.0 * k;
          ctx.setLineDash([10 * k, 7 * k]);
          ctx.beginPath();
          ctx.moveTo(toX(x1), toY(m * x1 + b));
          ctx.lineTo(toX(x2), toY(m * x2 + b));
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // Error bars, markers, and value labels
      xs.forEach((xv, i) => {
        const px = toX(xv);
        const py = toY(ys[i]);
        const errVal = errs.length === ys.length ? errs[i] : (errs.length === 1 ? errs[0] : 0);
        if (errVal > 0) {
          drawErrorBar(ctx, px, toY(ys[i] - errVal), toY(ys[i] + errVal), s.color, k);
        }
        drawMarker(ctx, s.marker, px, py, s.color, k);

        if (showValues) {
          ctx.fillStyle = '#1c1b18';
          ctx.font = `${valueFont}px ${fontName}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(String(ys[i]), px, py - 13 * k);
          ctx.font = `${tickFont}px ${fontName}`;
          ctx.textBaseline = 'top';
        }
      });
    });
  }

  // Optional horizontal reference line
  if (refLineRaw !== '' && !Number.isNaN(Number(refLineRaw))) {
    const ry = toY(Number(refLineRaw));
    if (ry >= padT && ry <= padT + plotH) {
      ctx.strokeStyle = '#555555';
      ctx.lineWidth = 2.2 * k;
      ctx.setLineDash([4 * k, 5 * k]);
      ctx.beginPath();
      ctx.moveTo(padL, ry);
      ctx.lineTo(padL + plotW, ry);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // Main L-shaped axis frame (top and right spines hidden like Matplotlib)
  ctx.strokeStyle = '#1c1b18';
  ctx.lineWidth = 2.4 * k;
  ctx.beginPath();
  ctx.moveTo(padL, padT);
  ctx.lineTo(padL, padT + plotH);
  ctx.lineTo(padL + plotW, padT + plotH);
  ctx.stroke();

  // Title (auto-shrunk and wrapped so it never runs off the page)
  const titleLayout = layoutTitle(ctx, title, fontName, titleFont, W - 70 * k);
  ctx.fillStyle = '#1c1b18';
  ctx.font = `${titleLayout.size}px ${fontName}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  if (titleLayout.lines.length === 1) {
    ctx.fillText(titleLayout.lines[0], padL + plotW / 2, padT - 20 * k);
  } else {
    ctx.fillText(titleLayout.lines[1], padL + plotW / 2, padT - 14 * k);
    ctx.fillText(titleLayout.lines[0], padL + plotW / 2, padT - 14 * k - titleLayout.size * 1.12);
  }

  // Axis labels
  ctx.font = `${labelFont}px ${fontName}`;
  ctx.textBaseline = 'top';
  ctx.fillText(xlabel, padL + plotW / 2, padT + plotH + 60 * k);

  ctx.save();
  ctx.translate(padL * 0.31, padT + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(ylabel, 0, 0);
  ctx.restore();

  // Optional legend box, sized to fit the longest name
  if (showLegend && list.length > 0) {
    ctx.font = `${valueFont}px ${fontName}`;
    let maxTxt = 0;
    list.forEach(s => {
      maxTxt = Math.max(maxTxt, ctx.measureText(s.label).width);
    });

    const rowH = Math.max(30 * k, valueFont * 1.5);
    const boxW = Math.max(150 * k, maxTxt + 76 * k);
    const boxH = list.length * rowH + 16 * k;
    const legX = padL + 26 * k;
    const legY = padT + 18 * k;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
    ctx.fillRect(legX, legY, boxW, boxH);
    ctx.strokeStyle = '#1c1b18';
    ctx.lineWidth = 1.6 * k;
    ctx.strokeRect(legX, legY, boxW, boxH);

    list.forEach((s, idx) => {
      const cy = legY + 8 * k + rowH * (idx + 0.5);
      ctx.fillStyle = s.color;
      ctx.fillRect(legX + 14 * k, cy - 7 * k, 24 * k, 14 * k);
      ctx.fillStyle = '#1c1b18';
      ctx.font = `${valueFont}px ${fontName}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.label, legX + 48 * k, cy);
    });
  }

  updatePythonCode(title, xlabel, ylabel, scaleX, scaleY, showLegend, list);
}

function applyLineDash(ctx, style, k) {
  if (style === '--') ctx.setLineDash([13 * k, 8 * k]);
  else if (style === ':') ctx.setLineDash([4 * k, 6 * k]);
  else if (style === '-.') ctx.setLineDash([12 * k, 6 * k, 3 * k, 6 * k]);
  else ctx.setLineDash([]);
}

function drawErrorBar(ctx, x, yLow, yHigh, color, k) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.2 * k;
  ctx.beginPath();
  ctx.moveTo(x, yLow);
  ctx.lineTo(x, yHigh);
  ctx.moveTo(x - 7 * k, yLow);
  ctx.lineTo(x + 7 * k, yLow);
  ctx.moveTo(x - 7 * k, yHigh);
  ctx.lineTo(x + 7 * k, yHigh);
  ctx.stroke();
}

function drawMarker(ctx, type, x, y, color, k) {
  if (type === 'None') return;
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  const r = 7 * k;

  if (type === 's') {
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  } else if (type === '^') {
    ctx.beginPath();
    ctx.moveTo(x, y - r - 2 * k);
    ctx.lineTo(x - r - 1 * k, y + r);
    ctx.lineTo(x + r + 1 * k, y + r);
    ctx.closePath();
    ctx.fill();
  } else if (type === 'D') {
    ctx.beginPath();
    ctx.moveTo(x, y - r - 2 * k);
    ctx.lineTo(x + r + 2 * k, y);
    ctx.lineTo(x, y + r + 2 * k);
    ctx.lineTo(x - r - 2 * k, y);
    ctx.closePath();
    ctx.fill();
  } else if (type === 'x') {
    ctx.lineWidth = 3 * k;
    ctx.beginPath();
    ctx.moveTo(x - r, y - r);
    ctx.lineTo(x + r, y + r);
    ctx.moveTo(x + r, y - r);
    ctx.lineTo(x - r, y + r);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function hexToRgba(hex, alpha) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Generate neat, human-written Python code matching the current settings
function updatePythonCode(title, xlabel, ylabel, scaleX, scaleY, showLegend, list) {
  const W = clampInt('res_w', 1400, 400, 6000);
  const H = clampInt('res_h', 900, 400, 6000);
  const fontKey = document.getElementById('font_family').value;
  const ML_FONTS = {
    georgia: 'Georgia',
    times: 'Times New Roman',
    mono: 'Courier New',
    verdana: 'Verdana',
    trebuchet: 'Trebuchet MS'
  };
  const titleFs = Math.round(clampInt('title_font', 28, 8, 200) * 0.4);
  const labelFs = Math.round(clampInt('label_font', 24, 8, 200) * 0.4);
  const tickFs = Math.round(clampInt('tick_font', 23, 8, 200) * 0.4);
  const gridStyle = document.getElementById('grid_style').value;

  const fw = +(W / 200).toFixed(2);
  const fh = +(H / 200).toFixed(2);

  const lines = [
    "import matplotlib.pyplot as plt",
    ""
  ];
  if (ML_FONTS[fontKey]) {
    lines.push(`plt.rcParams['font.family'] = '${ML_FONTS[fontKey]}'`, "");
  }
  lines.push(`fig, ax = plt.subplots(figsize=(${fw}, ${fh}), dpi=200)`, "");

  if (currentChartType === 'bar') {
    lines.push("# categories and bar heights");
    list.forEach((s, i) => {
      const { xs, ys } = pairXY(s.x_values, s.values, true);
      if (ys.length === 0) return;
      const cats = JSON.stringify(xs).replace(/"/g, "'");
      const heights = JSON.stringify(ys).replace(/,/g, ", ");
      if (list.length === 1) {
        lines.push(`categories = ${cats}`);
        lines.push(`heights = ${heights}`);
        lines.push(`ax.bar(categories, heights, width=0.6, color='${s.color}', edgecolor='black')`);
      } else {
        lines.push(`ax.bar(${cats}, ${heights}, color='${s.color}', edgecolor='black', label='${s.label}')`);
      }
    });
  } else {
    lines.push("# x and y coordinates");
    list.forEach((s, i) => {
      const { xs, ys } = pairXY(s.x_values, s.values, false);
      if (ys.length === 0) return;
      const sfx = list.length === 1 ? "" : String(i + 1);
      lines.push(`x${sfx} = [${xs.join(', ')}]`);
      lines.push(`y${sfx} = [${ys.join(', ')}]`);
      if (currentChartType === 'scatter_trend') {
        lines.push(`ax.scatter(x${sfx}, y${sfx}, color='${s.color}', label='${s.label}')`);
      } else {
        const mk = s.marker === 'None' ? 'None' : `'${s.marker}'`;
        lines.push(`ax.plot(x${sfx}, y${sfx}, color='${s.color}', linestyle='${s.linestyle}', marker=${mk}, label='${s.label}')`);
      }
      if (currentChartType === 'area') {
        lines.push(`ax.fill_between(x${sfx}, y${sfx}, color='${s.color}', alpha=0.18)`);
      }
    });
  }

  lines.push("");
  lines.push("# labels and scale");
  lines.push(`ax.set_title('${title.replace(/'/g, "\\'")}', fontsize=${titleFs})`);
  lines.push(`ax.set_xlabel('${xlabel.replace(/'/g, "\\'")}', fontsize=${labelFs})`);
  lines.push(`ax.set_ylabel('${ylabel.replace(/'/g, "\\'")}', fontsize=${labelFs})`);
  lines.push(`ax.tick_params(labelsize=${tickFs})`);

  if (currentChartType !== 'bar' && scaleX.length >= 2) {
    const sx = [...new Set(scaleX)].sort((a, b) => a - b);
    lines.push(`ax.set_xticks([${sx.join(', ')}])`);
  }
  if (scaleY.length >= 2) {
    const sy = [...new Set(scaleY)].sort((a, b) => a - b);
    lines.push(`ax.set_yticks([${sy.join(', ')}])`);
  }
  if (gridStyle === 'dashed' || gridStyle === 'solid' || gridStyle === 'dotted') {
    const ls = gridStyle === 'dashed' ? '--' : gridStyle === 'dotted' ? ':' : '-';
    lines.push(`ax.grid(True, linestyle='${ls}', color='#cccccc')`);
  } else if (gridStyle === 'paper') {
    lines.push("ax.minorticks_on()");
    lines.push("ax.grid(True, linestyle='--', color='#cccccc', linewidth=0.8)");
    lines.push("ax.grid(which='minor', linestyle=':', color='#dddddd', linewidth=0.5)");
  }
  lines.push("ax.spines['top'].set_visible(False)");
  lines.push("ax.spines['right'].set_visible(False)");
  if (showLegend) {
    lines.push("ax.legend(edgecolor='black')");
  }
  lines.push("plt.tight_layout()");
  lines.push("plt.show()");

  document.getElementById('codeBox').textContent = lines.join("\n");
}

function downloadPNG() {
  const canvas = document.getElementById('graphCanvas');
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = `graph_${canvas.width}x${canvas.height}.png`;
  a.click();
}

function copyCode() {
  navigator.clipboard.writeText(document.getElementById('codeBox').textContent);
}

renderSeriesSection();
draw();
