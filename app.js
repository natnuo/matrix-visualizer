(function () {
  "use strict";

  const MIN_DIM = 1;
  const MAX_DIM = 10;
  const DEFAULT_ROWS = 5;
  const DEFAULT_COLS = 5;

  /** Must match `.matrix-wrap` border width in styles.css */
  const MATRIX_WRAP_BORDER_PX = 2;

  const matrixEl = document.getElementById("matrix");
  const matrixWrap = document.getElementById("matrix-wrap");
  const rowsInput = document.getElementById("rows");
  const colsInput = document.getElementById("cols");
  const applyBtn = document.getElementById("apply-size");
  const exportPngBtn = document.getElementById("export-png");
  const exportClipboardBtn = document.getElementById("export-clipboard");
  const toggleModeInput = document.getElementById("toggle-mode");
  const modeGrayscaleLabel = document.getElementById("mode-grayscale-label");
  const modeColorLabel = document.getElementById("mode-color-label");
  const subtitleEl = document.getElementById("subtitle");
  const statusEl = document.getElementById("status");

  if (!matrixEl || !matrixWrap || !rowsInput || !colsInput || !applyBtn || !statusEl) {
    return;
  }

  /** @type {'grayscale' | 'color'} */
  let inputMode = "grayscale";

  let fitDebounceTimer = 0;

  function viewportHeight() {
    return window.visualViewport
      ? window.visualViewport.height
      : window.innerHeight;
  }

  function fitMatrixToViewport() {
    const { rows, cols } = getDims();
    if (rows < 1 || cols < 1) return;

    const viewport = matrixWrap.closest(".matrix-viewport");
    if (!viewport) return;

    const maxW = viewport.clientWidth - 2 * MATRIX_WRAP_BORDER_PX;
    const top = matrixWrap.getBoundingClientRect().top;
    const bottomReserve = 6;
    const availH = Math.max(
      32,
      viewportHeight() - top - bottomReserve - 2 * MATRIX_WRAP_BORDER_PX
    );

    let cell = Math.floor(Math.min(maxW / cols, availH / rows));
    if (!Number.isFinite(cell) || cell < 1) cell = 1;

    const innerW = cols * cell;
    const innerH = rows * cell;

    matrixWrap.style.width = `${innerW}px`;
    matrixWrap.style.height = `${innerH}px`;
  }

  function scheduleFitMatrix() {
    if (fitDebounceTimer) window.clearTimeout(fitDebounceTimer);
    fitDebounceTimer = window.setTimeout(() => {
      fitDebounceTimer = 0;
      fitMatrixToViewport();
    }, 48);
  }

  /** @type {number[][]} */
  let values = [];
  /** @type {string[][]} */
  let colors = [];

  function clampDim(n) {
    const x = Math.round(Number(n));
    if (Number.isNaN(x)) return DEFAULT_ROWS;
    return Math.min(MAX_DIM, Math.max(MIN_DIM, x));
  }

  function clamp01(v) {
    const x = Number(v);
    if (!Number.isFinite(x)) return 0;
    return Math.min(1, Math.max(0, x));
  }

  function formatValue(v) {
    const c = clamp01(v);
    if (c === 0 || c === 1) return c.toFixed(1);
    const s = c.toFixed(3).replace(/\.?0+$/, "");
    return s === "" ? "0" : s;
  }

  function parseInput(str) {
    const t = String(str).trim().replace(",", ".");
    if (t === "") return 0;
    return clamp01(parseFloat(t));
  }

  /** 0–1 background → text color for contrast */
  function textColorForValue(v) {
    const g = clamp01(v) * 255;
    return g > 140 ? "#0a0a0a" : "#f5f5f5";
  }

  function grayRgb(v) {
    const g = Math.round(clamp01(v) * 255);
    return `rgb(${g},${g},${g})`;
  }

  function normalizeHex(str) {
    let t = String(str).trim().toUpperCase();
    if (t.startsWith("#")) t = t.slice(1);
    if (!/^[0-9A-F]{3}$|^[0-9A-F]{6}$/.test(t)) return null;
    if (t.length === 3) {
      t = t[0] + t[0] + t[1] + t[1] + t[2] + t[2];
    }
    return "#" + t;
  }

  function formatHex(hex) {
    return normalizeHex(hex) || "#000000";
  }

  function textColorForHex(hex) {
    const h = formatHex(hex).slice(1);
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return 0.299 * r + 0.587 * g + 0.114 * b > 140 ? "#0a0a0a" : "#f5f5f5";
  }

  function setStatus(msg, isError) {
    statusEl.textContent = msg || "";
    statusEl.style.color = isError ? "#f0a8a8" : "";
  }

  function getDims() {
    return {
      rows: clampDim(rowsInput.value),
      cols: clampDim(colsInput.value),
    };
  }

  function resizeGrid(newRows, newCols) {
    const nextValues = [];
    const nextColors = [];
    for (let r = 0; r < newRows; r++) {
      nextValues[r] = [];
      nextColors[r] = [];
      for (let c = 0; c < newCols; c++) {
        const oldV = values[r] && values[r][c];
        const oldC = colors[r] && colors[r][c];
        nextValues[r][c] = oldV !== undefined ? clamp01(oldV) : 0;
        nextColors[r][c] = oldC !== undefined ? formatHex(oldC) : "#000000";
      }
    }
    values = nextValues;
    colors = nextColors;
    rowsInput.value = String(newRows);
    colsInput.value = String(newCols);
  }

  function syncCellStyleGrayscale(input, v) {
    const val = clamp01(v);
    const cell = input.closest(".cell");
    cell.style.backgroundColor = grayRgb(val);
    input.style.color = textColorForValue(val);
    if (document.activeElement !== input) {
      input.value = formatValue(val);
    }
  }

  function syncCellStyleColor(input, hex) {
    const color = formatHex(hex);
    const cell = input.closest(".cell");
    cell.style.backgroundColor = color;
    input.style.color = textColorForHex(color);
    if (document.activeElement !== input) {
      input.value = color;
    }
  }

  function updateModeUI() {
    const isColor = inputMode === "color";
    if (toggleModeInput) {
      toggleModeInput.checked = isColor;
    }
    if (modeGrayscaleLabel) {
      modeGrayscaleLabel.classList.toggle("is-active", !isColor);
    }
    if (modeColorLabel) {
      modeColorLabel.classList.toggle("is-active", isColor);
    }
    document.body.classList.toggle("input-mode-color", isColor);
    if (subtitleEl) {
      subtitleEl.textContent =
        inputMode === "grayscale"
          ? "Edit values from 0.0 (black) to 1.0 (white). Grid size up to 10×10."
          : "Edit hex colors (#RGB or #RRGGBB). Grid size up to 10×10.";
    }
  }

  function buildGrid() {
    const { rows, cols } = getDims();
    matrixEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    matrixEl.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    matrixEl.innerHTML = "";

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = document.createElement("div");
        cell.className = "cell";

        const input = document.createElement("input");
        input.type = "text";
        input.inputMode = inputMode === "grayscale" ? "decimal" : "text";
        input.autocomplete = "off";
        input.spellcheck = false;
        input.setAttribute("aria-label", `Row ${r + 1}, column ${c + 1}`);
        input.dataset.row = String(r);
        input.dataset.col = String(c);

        cell.appendChild(input);

        if (inputMode === "grayscale") {
          input.value = formatValue(values[r][c]);
          syncCellStyleGrayscale(input, values[r][c]);
        } else {
          input.value = formatHex(colors[r][c]);
          syncCellStyleColor(input, colors[r][c]);
        }

        input.addEventListener("focus", () => {
          input.value = inputMode === "grayscale" ? "" : "#";
        });

        input.addEventListener("blur", () => {
          const raw = String(input.value).trim();
          if (inputMode === "grayscale") {
            if (raw === "") {
              syncCellStyleGrayscale(input, values[r][c]);
              return;
            }
            const parsed = parseInput(input.value);
            values[r][c] = parsed;
            syncCellStyleGrayscale(input, parsed);
            return;
          }
          if (raw === "" || raw === "#") {
            syncCellStyleColor(input, colors[r][c]);
            return;
          }
          const parsed = normalizeHex(raw);
          if (!parsed) {
            syncCellStyleColor(input, colors[r][c]);
            return;
          }
          colors[r][c] = parsed;
          syncCellStyleColor(input, parsed);
        });

        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            input.blur();
          }
        });

        input.addEventListener("input", () => {
          if (inputMode === "grayscale") {
            const t = String(input.value).trim().replace(",", ".");
            if (t === "" || t === "-" || t === "." || t === "-.") {
              syncCellStyleGrayscale(input, values[r][c]);
              return;
            }
            const n = parseFloat(t);
            if (!Number.isFinite(n)) {
              syncCellStyleGrayscale(input, values[r][c]);
              return;
            }
            values[r][c] = clamp01(n);
            syncCellStyleGrayscale(input, values[r][c]);
            return;
          }
          const t = String(input.value).trim();
          if (t === "" || t === "#") {
            syncCellStyleColor(input, colors[r][c]);
            return;
          }
          const parsed = normalizeHex(t);
          if (!parsed) {
            syncCellStyleColor(input, colors[r][c]);
            return;
          }
          colors[r][c] = parsed;
          syncCellStyleColor(input, parsed);
        });

        matrixEl.appendChild(cell);
      }
    }

    requestAnimationFrame(() => {
      fitMatrixToViewport();
      requestAnimationFrame(fitMatrixToViewport);
    });
  }

  function applySize() {
    const { rows, cols } = getDims();
    resizeGrid(rows, cols);
    buildGrid();
    setStatus("");
  }

  /**
   * @param {number} cellPx
   * @returns {HTMLCanvasElement}
   */
  function renderGrayscaleCanvas(cellPx) {
    const { rows, cols } = getDims();
    const w = cols * cellPx;
    const h = rows * cellPx;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const v = clamp01(values[r][c]);
        const g = Math.round(v * 255);
        ctx.fillStyle = `rgb(${g},${g},${g})`;
        ctx.fillRect(c * cellPx, r * cellPx, cellPx, cellPx);
      }
    }
    return canvas;
  }

  function renderColorCanvas(cellPx) {
    const { rows, cols } = getDims();
    const w = cols * cellPx;
    const h = rows * cellPx;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.fillStyle = formatHex(colors[r][c]);
        ctx.fillRect(c * cellPx, r * cellPx, cellPx, cellPx);
      }
    }
    return canvas;
  }

  function renderCanvas(cellPx) {
    return inputMode === "grayscale"
      ? renderGrayscaleCanvas(cellPx)
      : renderColorCanvas(cellPx);
  }

  function downloadPng() {
    const cellPx = 48;
    const canvas = renderCanvas(cellPx);
    const link = document.createElement("a");
    const { rows, cols } = getDims();
    const kind = inputMode === "grayscale" ? "grayscale" : "color";
    link.download = `matrix-${rows}x${cols}-${kind}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    setStatus(`PNG downloaded (${kind}, no labels).`);
  }

  async function copyImageToClipboard() {
    if (
      !navigator.clipboard ||
      typeof ClipboardItem === "undefined"
    ) {
      setStatus(
        "Clipboard image copy is not supported in this browser. Try Download PNG.",
        true
      );
      return;
    }

    const cellPx = 48;
    const canvas = renderCanvas(cellPx);

    try {
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error("toBlob failed"));
        }, "image/png");
      });

      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      const kind = inputMode === "grayscale" ? "Grayscale" : "Color";
      setStatus(`${kind} image copied to clipboard.`);
    } catch (err) {
      setStatus(
        "Could not copy image (permission or browser restriction). Try Download PNG.",
        true
      );
    }
  }

  applyBtn.addEventListener("click", applySize);
  if (toggleModeInput) {
    toggleModeInput.addEventListener("change", () => {
      inputMode = toggleModeInput.checked ? "color" : "grayscale";
      updateModeUI();
      buildGrid();
      setStatus("");
    });
  }
  if (exportPngBtn) exportPngBtn.addEventListener("click", downloadPng);
  if (exportClipboardBtn) {
    exportClipboardBtn.addEventListener("click", () => {
      void copyImageToClipboard();
    });
  }

  rowsInput.addEventListener("change", () => {
    rowsInput.value = String(clampDim(rowsInput.value));
  });
  colsInput.addEventListener("change", () => {
    colsInput.value = String(clampDim(colsInput.value));
  });

  window.addEventListener("resize", scheduleFitMatrix);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", scheduleFitMatrix);
  }

  resizeGrid(DEFAULT_ROWS, DEFAULT_COLS);
  updateModeUI();
  buildGrid();
})();
