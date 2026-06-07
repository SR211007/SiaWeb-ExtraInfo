(() => {
  const ADDED_CLASS = "itm-ext-added";
  const HEADER_BG = "#002F6B";
  const DATA_BG = "#FAFAFA";

  function normalizeText(text) {
    return (text || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function parseIntSafe(text) {
    const clean = (text || "").replace(/[^\d-]/g, "");
    if (!clean) return null;
    const n = parseInt(clean, 10);
    return Number.isFinite(n) ? n : null;
  }

  function parseScaled(text, decimals = 3) {
    let clean = (text || "")
      .replace(/\s+/g, "")
      .replace(/[^\d,.-]/g, "");

    if (!clean) return null;

    if (clean.includes(",") && clean.includes(".")) {
      if (clean.lastIndexOf(",") > clean.lastIndexOf(".")) {
        clean = clean.replace(/\./g, "").replace(",", ".");
      } else {
        clean = clean.replace(/,/g, "");
      }
    } else if (clean.includes(",")) {
      clean = clean.replace(",", ".");
    }

    if (!/^-?\d+(\.\d+)?$/.test(clean)) return null;

    const negative = clean.startsWith("-");
    if (negative) clean = clean.slice(1);

    const [intPart, fracPartRaw = ""] = clean.split(".");
    const fracPart = (fracPartRaw + "0".repeat(decimals)).slice(0, decimals);
    const scaled = BigInt(intPart || "0") * (10n ** BigInt(decimals)) + BigInt(fracPart || "0");

    return negative ? -scaled : scaled;
  }

  function formatScaledNumber(value, scale = 3, maxDecimals = 3) {
    const negative = value < 0n;
    value = negative ? -value : value;

    const divisor = 10n ** BigInt(scale);
    const integerPart = value / divisor;
    let fraction = (value % divisor).toString().padStart(scale, "0");

    if (maxDecimals < scale) {
      fraction = fraction.slice(0, maxDecimals);
    }

    fraction = fraction.replace(/0+$/, "");

    return `${negative ? "-" : ""}${integerPart.toString()}${fraction ? "." + fraction : ""}`;
  }

  function ceilDiv(a, b) {
    if (b <= 0n) throw new Error("Divisor inválido");
    if (a <= 0n) return 0n;
    return (a + b - 1n) / b;
  }

  function makeHeaderCell(text) {
    const td = document.createElement("td");
    td.className = ADDED_CLASS;
    td.setAttribute("bgcolor", HEADER_BG);
    td.style.whiteSpace = "nowrap";
    td.style.textAlign = "center";
    td.innerHTML =
      `<font color="WHITE"><b><font face="Arial" size="2">${text}</font></b></font>`;
    return td;
  }

  function makeDataCell(text, title = "") {
    const td = document.createElement("td");
    td.className = ADDED_CLASS;
    td.setAttribute("bgcolor", DATA_BG);
    td.style.textAlign = "center";
    td.style.whiteSpace = "nowrap";
    td.style.fontFamily = "Arial, sans-serif";
    td.style.fontSize = "12px";
    td.textContent = text;
    if (title) td.title = title;
    return td;
  }

  function findTargetTable() {
    const tables = Array.from(document.querySelectorAll("table"));

    for (const table of tables) {
      const rows = Array.from(table.rows || []);
      for (const row of rows) {
        const headers = Array.from(row.cells || []).map(cell => normalizeText(cell.textContent));
        const hasAsignatura = headers.includes("asignatura");
        const hasGrupo = headers.includes("grupo");
        const hasCreditos = headers.includes("creditos");
        const hasResultado = headers.includes("resultado");
        const hasNota = headers.includes("nota");

        if (hasAsignatura && hasGrupo && hasCreditos && hasResultado && hasNota) {
          return { table, headerRow: row };
        }
      }
    }

    return null;
  }

  function clearInjected(table) {
    table.querySelectorAll("." + ADDED_CLASS).forEach(el => el.remove());
  }

  function processTable() {
    const found = findTargetTable();
    if (!found) return;

    const { table, headerRow } = found;
    clearInjected(table);

    const headerTexts = Array.from(headerRow.cells).map(cell => normalizeText(cell.textContent));
    const creditosIndex = headerTexts.findIndex(t => t === "creditos");
    const defIndex = headerTexts.findIndex(t => t.startsWith("def"));
    const resultadoIndex = headerTexts.findIndex(t => t === "resultado");

    if (creditosIndex === -1 || defIndex === -1 || resultadoIndex === -1) return;

    const evalStart = creditosIndex + 1;
    const evalEnd = defIndex;

    if (evalEnd <= evalStart) return;

    headerRow.appendChild(makeHeaderCell("Def. exacta"));
    headerRow.appendChild(makeHeaderCell("% evaluado"));
    headerRow.appendChild(makeHeaderCell("% faltante"));
    headerRow.appendChild(makeHeaderCell("Nota faltante para 3"));

    const rows = Array.from(table.rows);
    const startIndex = rows.indexOf(headerRow) + 1;

    for (let r = startIndex; r < rows.length; r++) {
      const row = rows[r];
      const cells = Array.from(row.cells || []);
      if (cells.length <= resultadoIndex) continue;

      const firstText = normalizeText(cells[0]?.textContent || "");
      if (!firstText || firstText.includes("evaluaciones incompletas")) continue;

      const creditos = parseIntSafe(cells[creditosIndex]?.textContent || "");
      if (creditos === null) continue;

      let porcentajeEvaluado = 0;
      let weightedScaled = 0n;

      for (let i = evalStart; i < evalEnd; i += 2) {
        const pctCell = cells[i];
        const gradeCell = cells[i + 1];
        if (!pctCell || !gradeCell) break;

        const porcentaje = parseIntSafe(pctCell.textContent);
        const notaScaled = parseScaled(gradeCell.textContent, 3);

        if (porcentaje === null || notaScaled === null) continue;
        if (porcentaje <= 0) continue;

        porcentajeEvaluado += porcentaje;
        weightedScaled += notaScaled * BigInt(porcentaje);
      }

      const porcentajeFaltante = Math.max(0, 100 - porcentajeEvaluado);
      const defExactaScaled = weightedScaled / 100n;
      const defExacta = formatScaledNumber(defExactaScaled, 3, 3);

      let notaFaltante = "—";
      let notaFaltanteTitle = "No aplica";

      if (porcentajeFaltante === 0) {
        if (defExactaScaled >= 3000n) {
          notaFaltante = "0";
          notaFaltanteTitle = "Ya alcanzas 3.0 o más con el 100% evaluado";
        } else {
          notaFaltante = "No alcanza";
          notaFaltanteTitle = "Ya no queda porcentaje pendiente para subir a 3.0";
        }
      } else {
        const requiredScaled = ceilDiv(300000n - weightedScaled, BigInt(porcentajeFaltante));

        if (requiredScaled <= 0n) {
          notaFaltante = "0";
          notaFaltanteTitle = "Ya alcanzas 3.0; no necesitas nota adicional en lo faltante";
        } else if (requiredScaled > 5000n) {
          notaFaltante = ">5.0";
          notaFaltanteTitle = "Ni sacando 5.0 en lo faltante llegas a 3.0";
        } else {
          notaFaltante = formatScaledNumber(requiredScaled, 3, 3);
          notaFaltanteTitle = "Nota mínima necesaria en el porcentaje faltante para cerrar en 3.0";
        }
      }

      row.appendChild(
        makeDataCell(
          porcentajeEvaluado > 0 ? defExacta : "0",
          "Suma exacta de nota × porcentaje / 100, sin aproximación visual"
        )
      );

      row.appendChild(
        makeDataCell(
          `${porcentajeEvaluado}%`,
          "Suma de los porcentajes que ya tienen nota"
        )
      );

      row.appendChild(
        makeDataCell(
          `${porcentajeFaltante}%`,
          "Porcentaje pendiente para completar el 100%"
        )
      );

      row.appendChild(
        makeDataCell(
          notaFaltante,
          notaFaltanteTitle
        )
      );
    }
  }

  let scheduled = false;
  function scheduleProcess() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      processTable();
    });
  }

  scheduleProcess();

  const observer = new MutationObserver(() => {
    scheduleProcess();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();