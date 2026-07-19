export function makePassageKey(date: string, displayText: string): string {
  return `${date}::${displayText}`;
}

export function makeManualPassageKey(displayText: string): string {
  return `manual::${displayText}`;
}
