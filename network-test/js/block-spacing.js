export function normalizeBlockSpacing(value) {
  if (value == null || value === '' || !['number', 'string'].includes(typeof value) || !Number.isFinite(Number(value))) return undefined;
  return Math.round(Math.max(0, Math.min(400, Number(value))));
}

// Follow the existing two-column grid. Images sharing a row also share its gap.
export function blockRowSpacing(blocks) {
  const rows = [];
  let row = [], columns = 0;
  const flush = () => { if (row.length) rows.push(row); row = []; columns = 0; };
  blocks.forEach((block, index) => {
    const span = block.span === 1 ? 1 : 2;
    if (columns + span > 2) flush();
    row.push(index); columns += span;
    if (columns === 2) flush();
  });
  flush();
  const result = [];
  rows.forEach((indices, rowIndex) => {
    const custom = indices.map(index => normalizeBlockSpacing(blocks[index].spacingAfter)).filter(value => value !== undefined);
    const gap = rowIndex === rows.length - 1 ? 0 : custom.length ? Math.max(...custom) : undefined;
    indices.forEach(index => { result[index] = { gap, custom: custom.length > 0 }; });
  });
  return result;
}
