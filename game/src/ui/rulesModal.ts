const circleSvg = `<svg viewBox="0 0 150 150" width="150" height="150" aria-label="〇の移動">
<g stroke="#8a6a45">${[0, 1, 2, 3, 4].map((i) => `<line x1="${i * 30 + 0}" y1="0" x2="${i * 30}" y2="150"/><line x1="0" y1="${i * 30}" x2="150" y2="${i * 30}"/>`).join('')}</g>
<rect x="60" y="60" width="30" height="30" fill="none"/><circle cx="75" cy="75" r="11" fill="#E53935"/>
<g fill="#7CFC0088"><rect x="62" y="32" width="26" height="26"/><rect x="92" y="62" width="26" height="26"/><rect x="62" y="92" width="26" height="26"/><rect x="32" y="62" width="26" height="26"/>
<rect x="32" y="32" width="26" height="26"/><rect x="92" y="32" width="26" height="26"/><rect x="92" y="92" width="26" height="26"/><rect x="32" y="92" width="26" height="26"/></g>
<text x="75" y="145" fill="#fff" font-size="11" text-anchor="middle">〇: 1歩 または 曲がって2歩</text></svg>`;
const squareSvg = `<svg viewBox="0 0 150 150" width="150" height="150" aria-label="□の移動">
<g stroke="#8a6a45">${[0, 1, 2, 3, 4].map((i) => `<line x1="${i * 30}" y1="0" x2="${i * 30}" y2="150"/><line x1="0" y1="${i * 30}" x2="150" y2="${i * 30}"/>`).join('')}</g>
<rect x="64" y="64" width="22" height="22" fill="#1E88E5"/>
<g fill="#7CFC0088"><rect x="62" y="32" width="26" height="26"/><rect x="62" y="2" width="26" height="26"/><rect x="92" y="62" width="26" height="26"/><rect x="122" y="62" width="26" height="26"/>
<rect x="62" y="92" width="26" height="26"/><rect x="62" y="122" width="26" height="26"/><rect x="32" y="62" width="26" height="26"/><rect x="2" y="62" width="26" height="26"/></g>
<text x="75" y="145" fill="#fff" font-size="11" text-anchor="middle">□: 直進1〜2マス</text></svg>`;

const RULES = [
  '9×9の盤で2〜3人が交代で遊ぶ。親はプレイヤー1。',
  '各自「〇」(固定位置)と「□」(最初に自由配置・2個)を持つ。',
  '手番では駒を1つ動かし、移動先マスの辺に壁を1枚建てる(必須)。',
  '〇は1マス、または1マス進んで90度曲がり計2マス。□は同じ向きに1〜2マス直進。',
  '駒や壁は越えられない。移動は必ず1マス以上。',
  '壁破り:ゲーム中1回だけ、移動中の1歩で壁1枚を取り除いて進める(外周は不可)。',
  '壁で囲まれた領域に自分の駒だけがいれば、その領域のマスが支配マス。',
  '複数人が共存する領域・誰もいない領域は得点にならない。',
  '全員の駒が壁で分断されたら終了(手数200・全員が動けない場合も終了)。',
  '支配マスが多い人の勝ち。同数なら「1コマあたり支配マス」の多い人が勝ち。',
  '自分の駒が全て自分だけの領域に入った人は、手番が自動でスキップされる。',
  '確定ボタンで決定。同じ場所をもう一度タップしても確定できる。',
];

export class RulesModal {
  private el = document.getElementById('rules-modal')!;
  constructor() {
    document.getElementById('rules-body')!.innerHTML = `<ul>${RULES.map((r) => `<li>${r}</li>`).join('')}</ul><div>${circleSvg}${squareSvg}</div>`;
    this.el.querySelector('[data-testid="rules-close"]')!.addEventListener('click', () => this.show(false));
  }
  show(v: boolean): void { this.el.hidden = !v; }
}
