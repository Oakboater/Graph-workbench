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

function activeList() {
  return currentChartType === 'bar' ? barSeries : lineSeries;
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

// Create a canvas pattern for hatched bars (diagonal, dots, crosshatch)
function createBarPattern(ctx, color, hatch) {
  const pCanvas = document.createElement('canvas');
  pCanvas.width = 16;
  pCanvas.height = 16;
  const pCtx = pCanvas.getContext('2d');

  pCtx.fillStyle = color;
  pCtx.fillRect(0, 0, 16, 16);

  pCtx.strokeStyle = 'rgba(255,255,255,0.65)';
  pCtx.fillStyle = 'rgba(255,255,255,0.65)';
  pCtx.lineWidth = 2;

  if (hatch === '///') {
    pCtx.beginPath();
    pCtx.moveTo(-4, 16); pCtx.lineTo(16, -4);
    pCtx.moveTo(4, 20);  pCtx.lineTo(20, 4);
    pCtx.stroke();
  } else if (hatch === '...') {
    pCtx.beginPath();
    pCtx.arc(4, 4, 2, 0, Math.PI * 2);
    pCtx.arc(12, 12, 2, 0, Math.PI * 2);
    pCtx.fill();
  } else if (hatch === 'xxx') {
    pCtx.beginPath();
    pCtx.moveTo(0, 16); pCtx.lineTo(16, 0);
    pCtx.moveTo(0, 0);  pCtx.lineTo(16, 16);
    pCtx.stroke();
  }
  return ctx.createPattern(pCanvas, 'repeat');
}

// Draw the graph onto the canvas with Matplotlib-matching proportions and margins
function draw() {
  const canvas = document.getElementById('graphCanvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  const title = document.getElementById('title').value;
  const xlabel = document.getElementById('xlabel').value;
  const ylabel = document.getElementById('ylabel').value;
  const scaleX = splitNumbers(document.getElementById('scale_x').value);
  const scaleY = splitNumbers(document.getElementById('scale_y').value);
  const showGrid = document.getElementById('show_grid').checked;
  const showValues = document.getElementById('show_values').checked;
  const showLegend = document.getElementById('show_legend').checked;
  const barWidthRatio = parseFloat(document.getElementById('bar_width').value || 0.6);
  const refLineRaw = document.getElementById('ref_line_y').value.trim();
  const list = activeList();

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // Plot frame geometry
  const padL = 135;
  const padR = 55;
  const padT = 90;
  const padB = 120;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const fontName = '"DejaVu Sans", Arial, Helvetica, sans-serif';

  // Gather Y values to compute Y ticks and Matplotlib-style 5% breathing margin
  let allY = [0];
  if (currentChartType === 'histogram') {
    list.forEach(s => {
      const vals = splitNumbers(s.values);
      allY.push(vals.length);
    });
  } else {
    list.forEach(s => {
      const { ys } = pairXY(s.x_values, s.values, currentChartType === 'bar');
      allY.push(...ys);
    });
  }

  let yTicks = scaleY.length >= 2
    ? [...new Set(scaleY)].sort((a, b) => a - b)
    : buildAutoTicks(Math.min(...allY), Math.max(...allY, 1));

  const yTickMin = yTicks[0];
  const yTickMax = yTicks[yTicks.length - 1];
  const ySpan = (yTickMax - yTickMin) || 1;
  // Bar charts sit flush on y=0; line/scatter graphs get a 4.5% Matplotlib margin so points don't touch the axis spine
  const yPadLow = (currentChartType === 'bar' || currentChartType === 'histogram') ? 0 : ySpan * 0.045;
  const yPadHigh = ySpan * 0.055;
  const yDomainMin = yTickMin - yPadLow;
  const yDomainMax = yTickMax + yPadHigh;

  const toY = val => padT + plotH - ((val - yDomainMin) / (yDomainMax - yDomainMin)) * plotH;

  // Draw horizontal grid lines and Y-axis ticks
  ctx.font = `23px ${fontName}`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  yTicks.forEach(t => {
    const py = toY(t);
    if (py < padT - 2 || py > padT + plotH + 2) return;

    if (showGrid) {
      ctx.strokeStyle = '#cccccc';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(padL, py);
      ctx.lineTo(padL + plotW, py);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.strokeStyle = '#1c1b18';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padL - 9, py);
    ctx.lineTo(padL, py);
    ctx.stroke();

    ctx.fillStyle = '#1c1b18';
    ctx.fillText(String(t), padL - 16, py);
  });

  // BAR CHART
  if (currentChartType === 'bar') {
    const categories = [];
    const parsed = [];

    list.forEach(s => {
      const { xs, ys } = pairXY(s.x_values, s.values, true);
      if (ys.length === 0) return;
      xs.forEach(c => {
        if (!categories.includes(c)) categories.push(c);
      });
      const errs = splitNumbers(s.errors);
      parsed.push({ s, xs, ys, errs });
    });

    const nCats = Math.max(categories.length, 1);
    const stepX = plotW / nCats;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = `23px ${fontName}`;

    categories.forEach((cat, idx) => {
      const cx = padL + stepX * (idx + 0.5);
      ctx.strokeStyle = '#1c1b18';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, padT + plotH);
      ctx.lineTo(cx, padT + plotH + 9);
      ctx.stroke();

      ctx.fillStyle = '#1c1b18';
      ctx.fillText(cat, cx, padT + plotH + 16);
    });

    const groupW = stepX * Math.min(Math.max(barWidthRatio, 0.15), 0.88);
    const singleW = groupW / Math.max(parsed.length, 1);
    const basePy = toY(Math.max(0, yTickMin));

    parsed.forEach((item, gIdx) => {
      const { s, xs, ys, errs } = item;
      xs.forEach((cat, i) => {
        const catIdx = categories.indexOf(cat);
        if (catIdx === -1) return;
        const center = padL + stepX * (catIdx + 0.5);
        const bx = center - groupW / 2 + gIdx * singleW + singleW * 0.04;
        const bw = singleW * 0.92;
        const topPy = toY(ys[i]);
        const bh = basePy - topPy;

        ctx.fillStyle = s.hatch ? createBarPattern(ctx, s.color, s.hatch) : s.color;
        ctx.fillRect(bx, topPy, bw, bh);
        ctx.strokeStyle = '#1c1b18';
        ctx.lineWidth = 2.2;
        ctx.strokeRect(bx, topPy, bw, bh);

        // Optional error bar on bar
        const errVal = errs.length === ys.length ? errs[i] : (errs.length === 1 ? errs[0] : 0);
        if (errVal > 0) {
          drawErrorBar(ctx, bx + bw / 2, toY(ys[i] - errVal), toY(ys[i] + errVal));
        }

        if (showValues) {
          ctx.fillStyle = '#1c1b18';
          ctx.font = `21px ${fontName}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(String(ys[i]), bx + bw / 2, topPy - (errVal > 0 ? 14 : 7));
        }
      });
    });

  // HISTOGRAM
  } else if (currentChartType === 'histogram') {
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
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, topPy, stepW, basePy - topPy);

        ctx.fillStyle = '#1c1b18';
        ctx.font = `21px ${fontName}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText((minV + i * binW).toFixed(0), bx, padT + plotH + 14);
      });
    }

  // LINE, FILLED LINE, OR SCATTER + BEST FIT
  } else {
    let allX = [0];
    list.forEach(s => {
      const { xs } = pairXY(s.x_values, s.values, false);
      allX.push(...xs);
    });

    let xTicks = scaleX.length >= 2
      ? [...new Set(scaleX)].sort((a, b) => a - b)
      : buildAutoTicks(Math.min(...allX), Math.max(...allX, 1));

    const xTickMin = xTicks[0];
    const xTickMax = xTicks[xTicks.length - 1];
    const xSpan = (xTickMax - xTickMin) || 1;
    // Matplotlib 4.5% horizontal breathing margin so points at x=0 and x=50 aren't stuck on the frame border
    const xDomainMin = xTickMin - xSpan * 0.045;
    const xDomainMax = xTickMax + xSpan * 0.045;

    const toX = val => padL + ((val - xDomainMin) / (xDomainMax - xDomainMin)) * plotW;

    // Vertical grid lines and X-axis ticks
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = `23px ${fontName}`;

    xTicks.forEach(t => {
      const px = toX(t);
      if (px < padL - 2 || px > padL + plotW + 2) return;

      if (showGrid) {
        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 1.4;
        ctx.setLineDash([6, 5]);
        ctx.beginPath();
        ctx.moveTo(px, padT);
        ctx.lineTo(px, padT + plotH);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.strokeStyle = '#1c1b18';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, padT + plotH);
      ctx.lineTo(px, padT + plotH + 9);
      ctx.stroke();

      ctx.fillStyle = '#1c1b18';
      ctx.fillText(String(t), px, padT + plotH + 16);
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
        ctx.lineWidth = 3.8;
        applyLineDash(ctx, s.linestyle);

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
          ctx.lineWidth = 3.0;
          ctx.setLineDash([10, 7]);
          ctx.beginPath();
          ctx.moveTo(toX(x1), toY(m * x1 + b));
          ctx.lineTo(toX(x2), toY(m * x2 + b));
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // Error bars and markers
      xs.forEach((xv, i) => {
        const px = toX(xv);
        const py = toY(ys[i]);
        const errVal = errs.length === ys.length ? errs[i] : (errs.length === 1 ? errs[0] : 0);
        if (errVal > 0) {
          drawErrorBar(ctx, px, toY(ys[i] - errVal), toY(ys[i] + errVal), s.color);
        }
        drawMarker(ctx, s.marker, px, py, s.color);

        if (showValues) {
          ctx.fillStyle = '#1c1b18';
          ctx.font = `20px ${fontName}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(String(ys[i]), px, py - 13);
        }
      });
    });
  }

  // Optional horizontal reference line
  if (refLineRaw !== '' && !Number.isNaN(Number(refLineRaw))) {
    const ry = toY(Number(refLineRaw));
    if (ry >= padT && ry <= padT + plotH) {
      ctx.strokeStyle = '#555555';
      ctx.lineWidth = 2.2;
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.moveTo(padL, ry);
      ctx.lineTo(padL + plotW, ry);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // Main L-shaped axis frame (top and right spines hidden like Matplotlib)
  ctx.strokeStyle = '#1c1b18';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(padL, padT);
  ctx.lineTo(padL, padT + plotH);
  ctx.lineTo(padL + plotW, padT + plotH);
  ctx.stroke();

  // Title, X label, and Y label
  ctx.fillStyle = '#1c1b18';
  ctx.font = `28px ${fontName}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(title, padL + plotW / 2, padT - 24);

  ctx.font = `24px ${fontName}`;
  ctx.textBaseline = 'top';
  ctx.fillText(xlabel, padL + plotW / 2, padT + plotH + 60);

  ctx.save();
  ctx.translate(42, padT + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(ylabel, 0, 0);
  ctx.restore();

  // Optional legend box
  if (showLegend && list.length > 0) {
    const legX = padL + 26;
    const legY = padT + 18;
    const rowH = 34;
    const boxW = 230;
    const boxH = list.length * rowH + 16;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
    ctx.fillRect(legX, legY, boxW, boxH);
    ctx.strokeStyle = '#1c1b18';
    ctx.lineWidth = 1.6;
    ctx.strokeRect(legX, legY, boxW, boxH);

    list.forEach((s, idx) => {
      const cy = legY + 24 + idx * rowH;
      ctx.fillStyle = s.color;
      ctx.fillRect(legX + 14, cy - 7, 24, 14);
      ctx.fillStyle = '#1c1b18';
      ctx.font = `20px ${fontName}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.label, legX + 48, cy);
    });
  }

  updatePythonCode(title, xlabel, ylabel, scaleX, scaleY, showGrid, showLegend, list);
}

function applyLineDash(ctx, style) {
  if (style === '--') ctx.setLineDash([13, 8]);
  else if (style === ':') ctx.setLineDash([4, 6]);
  else if (style === '-.') ctx.setLineDash([12, 6, 3, 6]);
  else ctx.setLineDash([]);
}

function drawErrorBar(ctx, x, yLow, yHigh, color = '#1c1b18') {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(x, yLow);
  ctx.lineTo(x, yHigh);
  ctx.moveTo(x - 7, yLow);
  ctx.lineTo(x + 7, yLow);
  ctx.moveTo(x - 7, yHigh);
  ctx.lineTo(x + 7, yHigh);
  ctx.stroke();
}

function drawMarker(ctx, type, x, y, color) {
  if (type === 'None') return;
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  const r = 7;

  if (type === 's') {
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  } else if (type === '^') {
    ctx.beginPath();
    ctx.moveTo(x, y - r - 2);
    ctx.lineTo(x - r - 1, y + r);
    ctx.lineTo(x + r + 1, y + r);
    ctx.closePath();
    ctx.fill();
  } else if (type === 'D') {
    ctx.beginPath();
    ctx.moveTo(x, y - r - 2);
    ctx.lineTo(x + r + 2, y);
    ctx.lineTo(x, y + r + 2);
    ctx.lineTo(x - r - 2, y);
    ctx.closePath();
    ctx.fill();
  } else if (type === 'x') {
    ctx.lineWidth = 3;
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

// Generate neat, human-written Python code
function updatePythonCode(title, xlabel, ylabel, scaleX, scaleY, showGrid, showLegend, list) {
  const lines = [
    "import matplotlib.pyplot as plt",
    "",
    "fig, ax = plt.subplots(figsize=(7.0, 4.5), dpi=300)",
    ""
  ];

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
  lines.push(`ax.set_title('${title.replace(/'/g, "\\'")}')`);
  lines.push(`ax.set_xlabel('${xlabel.replace(/'/g, "\\'")}')`);
  lines.push(`ax.set_ylabel('${ylabel.replace(/'/g, "\\'")}')`);

  if (currentChartType !== 'bar' && scaleX.length >= 2) {
    const sx = [...new Set(scaleX)].sort((a, b) => a - b);
    lines.push(`ax.set_xticks([${sx.join(', ')}])`);
  }
  if (scaleY.length >= 2) {
    const sy = [...new Set(scaleY)].sort((a, b) => a - b);
    lines.push(`ax.set_yticks([${sy.join(', ')}])`);
  }
  if (showGrid) {
    lines.push("ax.grid(True, linestyle='--', color='#cccccc')");
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
  a.download = 'graph_300dpi.png';
  a.click();
}

function copyCode() {
  navigator.clipboard.writeText(document.getElementById('codeBox').textContent);
}

renderSeriesSection();
draw();
