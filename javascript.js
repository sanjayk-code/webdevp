const exprEl = document.getElementById("expression");
const resEl = document.getElementById("result");
const keys = document.getElementById("keys");

let expression = "";
let lastPressed = "";

function updateDisplay() {
  exprEl.textContent = expression || "0";
  resEl.textContent = computePreview(expression) ?? "0";
}

function computePreview(exp) {
  if (!exp) return null;
  const safe = exp.replace(/×/g, "*").replace(/÷/g, "/");
  if (!/^[0-9+\-*/.() ]+$/.test(safe)) return null;
  try {
    const val = Function('"use strict";return (' + safe + ")")();
    if (isNaN(val) || !isFinite(val)) return null;
    return parseFloat(val.toFixed(6)).toString();
  } catch {
    return null;
  }
}

function appendValue(val) {
  if (lastPressed === "=" && /[0-9.]/.test(val)) expression = "";

  if (/^[+\-*/]$/.test(val)) {
    if (expression === "") return val === "-" ? (expression = "-") : null;
    if (/[+\-*/]$/.test(expression)) expression = expression.slice(0, -1);
  }
  expression += val;
  lastPressed = val;
  updateDisplay();
}

function clearAll() {
  expression = "";
  lastPressed = "";
  updateDisplay();
}

function deleteLast() {
  expression = expression.slice(0, -1);
  updateDisplay();
}

function calculate() {
  const safe = expression.replace(/×/g, "*").replace(/÷/g, "/");
  if (!/^[0-9+\-*/.() ]+$/.test(safe)) {
    resEl.textContent = "Error";
    return;
  }
  try {
    const val = Function('"use strict";return (' + safe + ")")();
    if (!isFinite(val)) throw Error;
    expression = parseFloat(val.toFixed(6)).toString();
  } catch {
    resEl.textContent = "Error";
  }
  lastPressed = "=";
  updateDisplay();
}

keys.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  const action = btn.dataset.action;
  const val = btn.dataset.value;

  if (action === "clear") return clearAll();
  if (action === "delete") return deleteLast();
  if (action === "equals") return calculate();
  appendValue(val);
});

window.addEventListener("keydown", (e) => {
  const k = e.key;
  if (/^[0-9]$/.test(k)) appendValue(k);
  else if (k === "Enter" || k === "=") calculate();
  else if (k === "Backspace") deleteLast();
  else if (k === "Escape") clearAll();
  else if ("+-*/.".includes(k)) appendValue(k);
});

updateDisplay();
