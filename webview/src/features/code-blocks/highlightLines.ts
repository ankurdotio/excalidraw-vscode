export function parseHighlightLines(value: string, lineCount: number) {
  if (!value.trim()) {
    return [];
  }
  if (!Number.isInteger(lineCount) || lineCount < 1) {
    throw new RangeError("Line count must be a positive integer.");
  }

  const highlighted = new Set<number>();
  for (const part of value.split(",")) {
    const match = /^\s*(\d+)(?:\s*-\s*(\d+))?\s*$/.exec(part);
    if (!match) {
      throw new Error(`Invalid highlighted line range: "${part.trim()}".`);
    }
    const first = Number(match[1]);
    const last = Number(match[2] ?? match[1]);
    if (first < 1 || last < first || last > lineCount) {
      throw new RangeError(
        `Highlighted lines must be between 1 and ${lineCount}.`
      );
    }
    for (let line = first; line <= last; line++) {
      highlighted.add(line);
    }
  }
  return [...highlighted].sort((left, right) => left - right);
}
