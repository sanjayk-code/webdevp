const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const HISTORY_PATH = path.join(__dirname, 'history.json');

// ensure history file exists
if (!fs.existsSync(HISTORY_PATH)) fs.writeFileSync(HISTORY_PATH, JSON.stringify([]));

// helper: read/write history
function readHistory() {
  try {
    return JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8') || '[]');
  } catch {
    return [];
  }
}
function writeHistory(arr) {
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(arr, null, 2));
}

// very small sanitizer: allow only digits, + - * / . ( ) spaces and percent sign optionally
function isSafeExpression(expr) {
  return /^[0-9+\-*/().\s%]+$/.test(expr);
}

// evaluate expression safely (no variables, functions). Also support % as percentage.
function evaluateExpression(raw) {
  if (typeof raw !== 'string') throw new Error('Invalid expression');
  const expr = raw.replace(/%/g, '/100'); // convert percent to division
  if (!isSafeExpression(expr)) throw new Error('Unsafe characters in expression');

  // disallow sequences like "++", "**" (except unary - handled), or leading operator other than -
  if (/([+\-*/]{2,})/.test(expr.replace(/\s+/g, ''))) {
    // allow negative sign by itself, but block other double operators
    if (!/^-\d/.test(expr.trim())) throw new Error('Invalid operator sequence');
  }

  // Evaluate using Function (still restricted by regex above)
  try {
    // eslint-disable-next-line no-new-func
    const result = Function('"use strict";return (' + expr + ')')();
    if (!isFinite(result)) throw new Error('Result not finite');
    return Number(Math.round((result + Number.EPSILON) * 1e12) / 1e12); // round to 12 decimals
  } catch (e) {
    throw new Error('Evaluation error');
  }
}

// POST /calculate { "expression": "12 + 5 / 2" }
app.post('/calculate', (req, res) => {
  const { expression } = req.body;
  if (!expression && expression !== 0) return res.status(400).json({ ok: false, error: 'expression required' });

  try {
    const value = evaluateExpression(String(expression));
    const entry = { id: Date.now(), expression: String(expression), result: value, ts: new Date().toISOString() };

    // append to history
    const hist = readHistory();
    hist.unshift(entry);
    if (hist.length > 200) hist.pop(); // keep last 200
    writeHistory(hist);

    return res.json({ ok: true, data: entry });
  } catch (err) {
    return res.status(400).json({ ok: false, error: err.message });
  }
});

// GET /history  -> returns array of entries
app.get('/history', (req, res) => {
  const hist = readHistory();
  return res.json({ ok: true, data: hist });
});

// POST /history/clear  -> clears history
app.post('/history/clear', (req, res) => {
  writeHistory([]);
  return res.json({ ok: true, msg: 'history cleared' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Calc API running on http://localhost:${PORT}`));
