export function shouldZoomTreeOnWheel(input: {
  ctrlKey?: boolean;
  metaKey?: boolean;
}): boolean {
  return Boolean(input.ctrlKey || input.metaKey);
}
