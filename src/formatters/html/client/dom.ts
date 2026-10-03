/** Required template hooks fail visibly during development rather than hiding broken markup. */
export function element(id: string): HTMLElement {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing report element: ${id}`);
  return node;
}
export function query(selector: string, root: ParentNode = document): HTMLElement {
  const node = root.querySelector<HTMLElement>(selector);
  if (!node) throw new Error(`Missing report element: ${selector}`);
  return node;
}
export function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
export function input(id: string): HTMLInputElement {
  const node = element(id);
  if (!(node instanceof HTMLInputElement)) throw new Error(`Expected report input: ${id}`);
  return node;
}
export function canvas(id: string): HTMLCanvasElement {
  const node = element(id);
  if (!(node instanceof HTMLCanvasElement)) throw new Error(`Expected report canvas: ${id}`);
  return node;
}
