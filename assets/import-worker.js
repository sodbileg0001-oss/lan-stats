'use strict';
importScripts('../vendor/xlsx.full.min.js', 'core.js', 'workbook.js');
self.onmessage = event => {
  try {
    if (event.data.action === 'template') {
      const names = event.data.names, output = XLSX.utils.book_new();
      const database = XLSX.utils.aoa_to_sheet([LANWorkbook.templateHeaders]);
      database['!cols'] = LANWorkbook.templateHeaders.map(name => ({ wch: Math.max(14, Math.min(32, name.length + 3)) }));
      for (let r = 1; r <= 200; r++) database[XLSX.utils.encode_cell({ r, c: 1 })] = { t: 's', v: '', z: '@' };
      database['!ref'] = 'A1:AG201';
      const duels = XLSX.utils.aoa_to_sheet([['A/B', ...names], ...names.map(name => [name, ...names.map(() => null)])]);
      duels['!cols'] = [{ wch: 24 }, ...names.map(() => ({ wch: 20 }))];
      for (let r = 1; r <= names.length; r++) for (let c = 1; c <= names.length; c++) duels[XLSX.utils.encode_cell({ r, c })] = { t: 's', v: '', z: '@' };
      XLSX.utils.book_append_sheet(output, database, 'Database');
      XLSX.utils.book_append_sheet(output, duels, 'Duel sheet');
      const buffer = XLSX.write(output, { type: 'array', bookType: 'xlsx', compression: true });
      self.postMessage({ buffer }, [buffer]);
      return;
    }
    const wb = XLSX.read(event.data.buffer, { type: 'array', sheets: ['Database', 'Duel sheet'], cellDates: true, cellFormula: false });
    self.postMessage({ data: LANWorkbook.read(wb, { X: XLSX, filename: event.data.filename }) });
  } catch (error) { self.postMessage({ error: error.message || 'This Excel file could not be read.' }); }
};
