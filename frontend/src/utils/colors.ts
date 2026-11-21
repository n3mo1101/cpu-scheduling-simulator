/** Shared process colours, cycled by input index across the whole interface. */

export const PROCESS_COLORS = [
  "#7C9CFF",
  "#F4A860",
  "#4FD1A5",
  "#E8749A",
  "#B58CFF",
  "#E3C95A",
] as const;

/** Return the stable colour for a process at the given input index. */
export function processColor(index: number): string {
  return PROCESS_COLORS[index % PROCESS_COLORS.length] ?? PROCESS_COLORS[0];
}
