function normalizeNewlines(input) {
  return String(input || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function parseCsv(text) {
  const src = normalizeNewlines(text);
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];

    if (inQuotes) {
      if (ch === '"') {
        const next = src[i + 1];
        if (next === '"') {
          field += '"';
          i++;
          continue;
        }
        inQuotes = false;
        continue;
      }
      field += ch;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === ',') {
      row.push(field);
      field = '';
      continue;
    }

    if (ch === '\n') {
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
      continue;
    }

    field += ch;
  }

  // Flush last field/row (even if empty line at end).
  row.push(field);
  rows.push(row);

  // Drop fully empty trailing rows.
  while (rows.length && rows[rows.length - 1].every((cell) => String(cell || '').trim() === '')) {
    rows.pop();
  }

  return rows;
}

function escapeCsvCell(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function toCsv(rows) {
  return rows.map((r) => r.map(escapeCsvCell).join(',')).join('\n') + '\n';
}

function rowsToObjects(rows, { header = true } = {}) {
  if (!rows || !rows.length) return [];
  if (!header) {
    return rows.map((r) => ({ values: r }));
  }
  const headers = rows[0].map((h) => String(h || '').trim().replace(/^\uFEFF/, ''));
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i] || [];
    const obj = {};
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c];
      if (!key) continue;
      obj[key] = r[c] === undefined ? '' : r[c];
    }
    out.push(obj);
  }
  return out;
}

module.exports = { parseCsv, toCsv, rowsToObjects };
