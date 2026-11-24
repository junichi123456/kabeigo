/** スマホ表示かどうか(タッチ主体の端末、または幅 600px 以下)。手番ごとに再評価する。 */
export function isMobileView(): boolean {
  try {
    return window.matchMedia('(pointer: coarse)').matches || window.innerWidth <= 600;
  } catch { return false; }
}
