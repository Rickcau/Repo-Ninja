let counter = 0;

export function nanoid(): string {
  counter += 1;
  return `mock-id-${counter}`;
}

// Allow tests to reset the counter if needed
export function __resetCounter(): void {
  counter = 0;
}
