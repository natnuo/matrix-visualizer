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
  const statusEl = document.getElementById("status");

  if (!matrixEl || !matrixWrap || !rowsInput || !colsInput || !applyBtn || !statusEl) {
    return;
  }

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
    const next = [];
    for (let r = 0; r < newRows; r++) {
      next[r] = [];
      for (let c = 0; c < newCols; c++) {
        const old = values[r] && values[r][c];
        next[r][c] = old !== undefined ? clamp01(old) : 0;
      }
    }
    values = next;
    rowsInput.value = String(newRows);
    colsInput.value = String(newCols);
  }

  function syncCellStyle(input, v) {
    const val = clamp01(v);
    const cell = input.closest(".cell");
    cell.style.backgroundColor = grayRgb(val);
    input.style.color = textColorForValue(val);
    const shown = formatValue(val);
    if (document.activeElement !== input) {
      input.value = shown;
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
        input.inputMode = "decimal";
        input.autocomplete = "off";
        input.spellcheck = false;
        input.setAttribute("aria-label", `Row ${r + 1}, column ${c + 1}`);
        input.dataset.row = String(r);
        input.dataset.col = String(c);

        cell.appendChild(input);

        const v = values[r][c];
        input.value = formatValue(v);
        syncCellStyle(input, v);

        input.addEventListener("focus", () => {
          input.value = "";
        });

        input.addEventListener("blur", () => {
          const raw = String(input.value).trim();
          if (raw === "") {
            input.value = formatValue(values[r][c]);
            syncCellStyle(input, values[r][c]);
            return;
          }
          const parsed = parseInput(input.value);
          values[r][c] = parsed;
          input.value = formatValue(parsed);
          syncCellStyle(input, parsed);
        });

        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            input.blur();
          }
        });

        input.addEventListener("input", () => {
          const t = String(input.value).trim().replace(",", ".");
          if (t === "" || t === "-" || t === "." || t === "-.") {
            syncCellStyle(input, values[r][c]);
            return;
          }
          const n = parseFloat(t);
          if (!Number.isFinite(n)) {
            syncCellStyle(input, values[r][c]);
            return;
          }
          values[r][c] = clamp01(n);
          syncCellStyle(input, values[r][c]);
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

  function downloadPng() {
    const cellPx = 48;
    const canvas = renderGrayscaleCanvas(cellPx);
    const link = document.createElement("a");
    const { rows, cols } = getDims();
    link.download = `matrix-${rows}x${cols}-grayscale.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    setStatus("PNG downloaded (grayscale, no labels).");
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
    const canvas = renderGrayscaleCanvas(cellPx);

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
      setStatus("Grayscale image copied to clipboard.");
    } catch (err) {
      setStatus(
        "Could not copy image (permission or browser restriction). Try Download PNG.",
        true
      );
    }
  }

  applyBtn.addEventListener("click", applySize);
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
  buildGrid();
})();
