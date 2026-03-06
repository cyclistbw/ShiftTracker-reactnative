// 🚩 FLAG: Web version uses window.matchMedia / window.innerWidth to detect mobile.
// RN replacement: on a phone, isMobile is always true. Use Dimensions if breakpoint
// logic is ever needed for tablet layouts.

export function useIsMobile(): boolean {
  return true;
}
