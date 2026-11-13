/* Parse large Excel files off the UI thread. Original buffers stay in this worker. */
importScripts('../vendor/xlsx.full.min.js');
let buffer = null, sheets = [];
self.onmessage = event => {
  try {
    if (event.data.buffer) { buffer = event.data.buffer; sheets = XLSX.read(buffer, { type: 'array', bookSheets: true }).SheetNames; }
    const sheet = event.data.sheet || sheets.find(n => n.toLowerCase() === 'database') || sheets[0];
    if (!sheets.includes(sheet)) throw new Error('Sheet not found.');
    const wb = XLSX.read(buffer, { type: 'array', sheets: [sheet], cellFormula: false, cellNF: true });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { header: 1, defval: null, blankrows: false });
    self.postMessage({ sheets, sheet, rows });
  } catch (e) { self.postMessage({ error: e.message || 'Could not parse this workbook.' }); }
};
