/**
 * Fill a row by repeating `input + " "` until the row has at least
 * `columnCount` characters, then truncate to exactly that length.
 */
export function fillRow(input: string, columnCount: number): string {
  if (columnCount <= 0 || input.length === 0) return '';
  const unit = input + ' ';
  const repeats = Math.ceil(columnCount / unit.length);
  return unit.repeat(repeats).slice(0, columnCount);
}
