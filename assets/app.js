// assets/app.ts
var DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
var STORAGE_KEY = "cross-sum-tool:v1";
function newCell() {
  return { type: "none", digits: [] };
}
function emptyCells() {
  const cells = [];
  for (let i = 0;i < 9; i++)
    cells.push(newCell());
  return cells;
}
var state = {
  n: 3,
  sum: 15,
  cells: emptyCells(),
  selected: 0
};
var theme = "system";
var PRESETS = [
  { n: 3, sum: 15, cells: { 0: { type: "fixed", digits: [5] } } },
  { n: 4, sum: 10, cells: {} },
  { n: 2, sum: 17, cells: {} }
];
function isCellType(v) {
  return v === "none" || v === "fixed" || v === "cand" || v === "excl";
}
function sanitizeCell(v) {
  if (typeof v !== "object" || v === null)
    return newCell();
  const c = v;
  if (!isCellType(c.type) || !Array.isArray(c.digits))
    return newCell();
  const digits = c.digits.filter((d) => typeof d === "number" && d >= 1 && d <= 9).sort((a, b) => a - b);
  if (c.type === "fixed" && digits.length > 1)
    digits.length = 1;
  return { type: c.type, digits };
}
function loadSaved() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw)
      return;
    const data = JSON.parse(raw);
    if (typeof data.n === "number" && data.n >= 2 && data.n <= 9)
      state.n = Math.floor(data.n);
    if (typeof data.sum === "number" && data.sum >= 3 && data.sum <= 45)
      state.sum = Math.floor(data.sum);
    if (Array.isArray(data.cells)) {
      for (let i = 0;i < 9; i++)
        state.cells[i] = sanitizeCell(data.cells[i]);
    }
    if (typeof data.selected === "number") {
      state.selected = Math.min(state.n - 1, Math.max(0, Math.floor(data.selected)));
    }
    if (data.theme === "light" || data.theme === "dark" || data.theme === "system") {
      theme = data.theme;
    }
  } catch {}
}
function save() {
  try {
    const data = {
      n: state.n,
      sum: state.sum,
      selected: state.selected,
      cells: state.cells,
      theme
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}
function applyTheme() {
  document.documentElement.setAttribute("data-theme", theme);
  document.querySelectorAll(".theme-btn").forEach((b) => {
    b.setAttribute("aria-pressed", b.dataset.themeValue === theme ? "true" : "false");
  });
}
function minSum(n) {
  let s = 0;
  for (let k = 1;k <= n; k++)
    s += k;
  return s;
}
function maxSum(n) {
  let s = 0;
  for (let k = 0;k < n; k++)
    s += 9 - k;
  return s;
}
function allowedSet(cell) {
  const s = new Set;
  if (cell.type === "fixed" && cell.digits.length === 1) {
    s.add(cell.digits[0]);
  } else if (cell.type === "cand" && cell.digits.length > 0) {
    cell.digits.forEach((d) => s.add(d));
  } else if (cell.type === "excl" && cell.digits.length > 0) {
    DIGITS.forEach((d) => {
      if (cell.digits.indexOf(d) === -1)
        s.add(d);
    });
  } else {
    DIGITS.forEach((d) => s.add(d));
  }
  return s;
}
function enumerateCombos(n, sum) {
  const out = [];
  function rec(start, left, rest, cur) {
    if (left === 0) {
      if (rest === 0)
        out.push(cur.slice());
      return;
    }
    for (let d = start;d <= 9; d++) {
      if (d > rest)
        break;
      cur.push(d);
      rec(d + 1, left - 1, rest - d, cur);
      cur.pop();
    }
  }
  rec(1, n, sum, []);
  return out;
}
function solve() {
  const n = state.n;
  const allowed = [];
  for (let i = 0;i < n; i++)
    allowed.push(allowedSet(state.cells[i]));
  const combos = enumerateCombos(n, state.sum);
  const perCell = [];
  for (let i = 0;i < n; i++)
    perCell.push(new Set);
  const feasibleCombos = [];
  combos.forEach((combo) => {
    const comboSet = new Set(combo);
    const domains = allowed.map((a) => {
      const d = [];
      a.forEach((v) => {
        if (comboSet.has(v))
          d.push(v);
      });
      return d;
    });
    const ok = domains.every((d) => d.length > 0);
    if (!ok)
      return;
    const order = domains.map((_, idx) => idx).sort((a, b) => domains[a].length - domains[b].length);
    const used = new Set;
    const assign = new Array(n);
    let found = false;
    function bt(pos) {
      if (pos === n) {
        found = true;
        for (let j = 0;j < n; j++)
          perCell[j].add(assign[j]);
        return;
      }
      const cellIdx = order[pos];
      const dom = domains[cellIdx];
      for (let t = 0;t < dom.length; t++) {
        const v = dom[t];
        if (used.has(v))
          continue;
        used.add(v);
        assign[cellIdx] = v;
        bt(pos + 1);
        used.delete(v);
      }
    }
    bt(0);
    if (found)
      feasibleCombos.push(combo);
  });
  return { perCell, feasibleCombos, allCombos: combos };
}
function buildHints(result) {
  const hints = [];
  const n = state.n;
  if (state.sum < minSum(n) || state.sum > maxSum(n)) {
    hints.push("合計は " + minSum(n) + "〜" + maxSum(n) + " の範囲でないと作れません。");
  }
  const fixedSeen = {};
  for (let i = 0;i < n; i++) {
    const c = state.cells[i];
    if (c.type === "fixed" && c.digits.length === 1) {
      if (fixedSeen[c.digits[0]]) {
        hints.push("数字 " + c.digits[0] + " が2つのマスで確定しています（同じカギの中では数字は重複しません）。");
      }
      fixedSeen[c.digits[0]] = true;
    }
    if (allowedSet(c).size === 0) {
      hints.push(i + 1 + "マス目は入れる数字が残っていません。");
    }
  }
  if (result.allCombos.length > 0 && result.feasibleCombos.length === 0 && hints.length === 0) {
    hints.push("数字の組み合わせ自体はありますが、各マスの条件と両立する並べ方がありません。条件を少し緩めてみてください。");
  }
  if (result.allCombos.length === 0 && hints.length === 0) {
    hints.push("このマス数と合計では、重複なしの組み合わせが作れません。");
  }
  return hints;
}
function el(id) {
  return document.getElementById(id);
}
var nGrid = el("nGrid");
var tilesEl = el("tiles");
var padEl = el("pad");
var sumInput = el("sumInput");
var sumRange = el("sumRange");
[2, 3, 4, 5, 6, 7, 8, 9].forEach((n) => {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "n-btn";
  b.textContent = String(n);
  b.setAttribute("aria-label", n + "マス");
  b.addEventListener("click", () => {
    state.n = n;
    if (state.selected >= n)
      state.selected = n - 1;
    const lo = minSum(n);
    const hi = maxSum(n);
    if (state.sum < lo)
      state.sum = lo;
    if (state.sum > hi)
      state.sum = hi;
    render();
  });
  b.dataset.n = String(n);
  nGrid.appendChild(b);
});
DIGITS.forEach((d) => {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "pad-btn";
  b.textContent = String(d);
  b.dataset.digit = String(d);
  b.addEventListener("click", () => tapDigit(d));
  padEl.appendChild(b);
});
function setCellMode(mode) {
  const cell = state.cells[state.selected];
  if (mode === "none") {
    cell.type = "none";
    cell.digits = [];
  } else if (mode === "fixed") {
    cell.type = "fixed";
    if (cell.digits.length > 1)
      cell.digits = [cell.digits[0]];
  } else {
    cell.type = mode;
  }
  render();
}
function tapDigit(d) {
  const cell = state.cells[state.selected];
  if (cell.type === "none") {
    cell.type = "fixed";
    cell.digits = [d];
  } else if (cell.type === "fixed") {
    if (cell.digits.length === 1 && cell.digits[0] === d) {
      cell.type = "none";
      cell.digits = [];
    } else {
      cell.digits = [d];
    }
  } else {
    const idx = cell.digits.indexOf(d);
    if (idx === -1)
      cell.digits.push(d);
    else
      cell.digits.splice(idx, 1);
    cell.digits.sort((a, b) => a - b);
  }
  render();
}
document.querySelectorAll(".mode-btn").forEach((b) => {
  b.addEventListener("click", () => setCellMode(b.dataset.mode));
});
el("clearCell").addEventListener("click", () => setCellMode("none"));
el("clearAllCells").addEventListener("click", () => {
  state.cells = emptyCells();
  render();
});
el("resetAll").addEventListener("click", () => {
  state.n = 3;
  state.sum = 15;
  state.selected = 0;
  state.cells = emptyCells();
  render();
});
document.querySelectorAll(".preset-btn").forEach((b) => {
  b.addEventListener("click", () => {
    const p = PRESETS[Number(b.dataset.preset)];
    state.n = p.n;
    state.sum = p.sum;
    state.selected = 0;
    state.cells = emptyCells();
    Object.keys(p.cells).forEach((k) => {
      const src = p.cells[Number(k)];
      state.cells[Number(k)] = { type: src.type, digits: src.digits.slice() };
    });
    render();
  });
});
document.querySelectorAll(".theme-btn").forEach((b) => {
  b.addEventListener("click", () => {
    theme = b.dataset.themeValue;
    applyTheme();
    save();
  });
});
el("sumMinus").addEventListener("click", () => bumpSum(-1));
el("sumPlus").addEventListener("click", () => bumpSum(1));
function bumpSum(delta) {
  let v = state.sum + delta;
  if (v < minSum(state.n))
    v = minSum(state.n);
  if (v > maxSum(state.n))
    v = maxSum(state.n);
  state.sum = v;
  render();
}
sumInput.addEventListener("change", () => {
  const v = parseInt(sumInput.value, 10);
  if (isNaN(v)) {
    render();
    return;
  }
  let clamped = v;
  if (clamped < 3)
    clamped = 3;
  if (clamped > 45)
    clamped = 45;
  state.sum = clamped;
  render();
});
sumRange.addEventListener("input", () => {
  state.sum = Number(sumRange.value);
  render();
});
document.addEventListener("keydown", (e) => {
  const tag = e.target?.tagName ?? "";
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT")
    return;
  if (e.key >= "1" && e.key <= "9") {
    tapDigit(Number(e.key));
  } else if (e.key === "ArrowRight") {
    state.selected = Math.min(state.n - 1, state.selected + 1);
    render();
  } else if (e.key === "ArrowLeft") {
    state.selected = Math.max(0, state.selected - 1);
    render();
  } else if (e.key === "Delete" || e.key === "Backspace") {
    setCellMode("none");
  }
});
var MODE_DESC = {
  none: "このマスには制限がありません。数字をタップすると「確定」になります。",
  fixed: "このマスに入る数字は1つに決まっています。もう一度タップすると解除されます。",
  cand: "このマスに入り得る数字をすべて選んでください（複数選択）。",
  excl: "このマスには絶対に入らない数字を選んでください（複数選択）。"
};
function tileContent(cell) {
  if (cell.type === "fixed" && cell.digits.length === 1) {
    return '<span class="tile-big">' + cell.digits[0] + '</span><span class="tile-fixed-mark">確定</span>';
  }
  if (cell.type === "cand" && cell.digits.length > 0) {
    return '<span class="tile-small">' + cell.digits.join(" ") + "</span>";
  }
  if (cell.type === "excl" && cell.digits.length > 0) {
    return '<span class="tile-small excl">≠' + cell.digits.join(",") + "</span>";
  }
  return '<span class="tile-none">–</span>';
}
function render() {
  nGrid.querySelectorAll(".n-btn").forEach((b) => {
    b.setAttribute("aria-pressed", Number(b.dataset.n) === state.n ? "true" : "false");
  });
  sumInput.value = String(state.sum);
  sumRange.min = String(minSum(state.n));
  sumRange.max = String(maxSum(state.n));
  sumRange.value = String(state.sum);
  el("rangeNote").innerHTML = state.n + "マス・重複なしだと合計は <strong>" + minSum(state.n) + "〜" + maxSum(state.n) + "</strong> の範囲になります。";
  tilesEl.innerHTML = "";
  for (let i = 0;i < state.n; i++) {
    const idx = i;
    const cell = state.cells[idx];
    const b = document.createElement("button");
    b.type = "button";
    b.className = "tile";
    b.dataset.selected = idx === state.selected ? "true" : "false";
    b.setAttribute("aria-label", idx + 1 + "マス目" + (idx === state.selected ? "（編集中）" : ""));
    b.innerHTML = '<span class="tile-num">' + (idx + 1) + "</span>" + tileContent(cell);
    b.addEventListener("click", () => {
      state.selected = idx;
      render();
    });
    tilesEl.appendChild(b);
  }
  const cell = state.cells[state.selected];
  el("editorTitle").innerHTML = '<span class="accent">' + (state.selected + 1) + "マス目</span> の条件";
  document.querySelectorAll(".mode-btn").forEach((b) => {
    b.setAttribute("aria-pressed", b.dataset.mode === cell.type ? "true" : "false");
  });
  el("modeDesc").textContent = MODE_DESC[cell.type];
  padEl.querySelectorAll(".pad-btn").forEach((b) => {
    const d = Number(b.dataset.digit);
    const on = cell.digits.indexOf(d) !== -1 && cell.type !== "none";
    b.setAttribute("aria-pressed", on ? "true" : "false");
    b.classList.toggle("excl-on", on && cell.type === "excl");
    b.disabled = false;
  });
  renderResult();
  save();
}
function renderResult() {
  const result = solve();
  const statusEl = el("resultStatus");
  const warnBox = el("warnBox");
  const cellResults = el("cellResults");
  const comboHead = el("comboHead");
  const combosEl = el("combos");
  warnBox.innerHTML = "";
  cellResults.innerHTML = "";
  combosEl.innerHTML = "";
  if (result.feasibleCombos.length === 0) {
    statusEl.textContent = "条件を満たす組み合わせがありません。";
    const hints = buildHints(result);
    if (hints.length) {
      const div = document.createElement("div");
      div.className = "warn";
      div.innerHTML = "確認ポイント<ul>" + hints.map((h) => "<li>" + h + "</li>").join("") + "</ul>";
      warnBox.appendChild(div);
    }
    comboHead.textContent = "";
    return;
  }
  statusEl.innerHTML = '数字の組み合わせは <span class="count">' + result.feasibleCombos.length + "</span> 通りです。";
  for (let i = 0;i < state.n; i++) {
    const idx = i;
    const set = result.perCell[idx];
    const row = document.createElement("div");
    row.className = "cell-row" + (set.size === 1 ? " decided" : "");
    const label = document.createElement("div");
    label.className = "cell-row-label";
    label.innerHTML = idx + 1 + "マス目" + (set.size === 1 ? '<br /><span class="decided-badge">確定</span>' : "");
    const strip = document.createElement("div");
    strip.className = "strip";
    strip.setAttribute("aria-label", idx + 1 + "マス目の候補：" + DIGITS.filter((d) => set.has(d)).join("、"));
    DIGITS.forEach((d) => {
      const s = document.createElement("span");
      s.textContent = String(d);
      if (!set.has(d))
        s.className = "off";
      const c = state.cells[idx];
      if (c.type === "fixed" && c.digits[0] === d)
        s.classList.add("fixed-in");
      strip.appendChild(s);
    });
    row.appendChild(label);
    row.appendChild(strip);
    cellResults.appendChild(row);
  }
  comboHead.textContent = "数字の組み合わせ一覧（色付きは、どの組み合わせにも必ず入る数字）";
  result.feasibleCombos.forEach((combo) => {
    const span = document.createElement("span");
    span.className = "combo";
    combo.forEach((d) => {
      const it = document.createElement("i");
      it.textContent = String(d);
      const inAll = result.feasibleCombos.every((c) => c.indexOf(d) !== -1);
      if (inAll)
        it.className = "common";
      span.appendChild(it);
    });
    combosEl.appendChild(span);
  });
}
loadSaved();
applyTheme();
render();
