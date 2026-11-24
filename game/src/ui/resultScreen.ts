import type { GameState } from '../logic/types';

export class ResultScreen {
  private el = document.getElementById('result-screen')!;
  private toggle = document.getElementById('result-toggle')!;
  constructor(onRestart: () => void, onTitle: () => void) {
    this.el.querySelector('[data-testid="restart-button"]')!.addEventListener('click', onRestart);
    this.el.querySelector('[data-testid="to-title-button"]')!.addEventListener('click', onTitle);
    this.toggle.addEventListener('click', () => {
      const peek = this.el.classList.toggle('peek');
      this.toggle.textContent = peek ? '結果を見る' : '盤面を見る';
    });
  }

  show(s: GameState): void {
    const r = s.result;
    if (!r) return;
    const names = s.config.playerNames;
    this.el.classList.remove('peek');
    this.toggle.textContent = '盤面を見る';
    const win = document.getElementById('result-winner')!;
    win.textContent = r.winners.length === 1 ? `${names[r.winners[0]!]}の勝利!` : `引き分け(${r.winners.map((w) => names[w]).join('・')})`;
    const notes: string[] = [];
    if (r.decidedBy === 'efficiency') notes.push('支配マス同数のため、1コマあたり支配マス数で決着');
    if (r.reason === 'turnLimit') notes.push('手数上限に達して終了');
    if (r.reason === 'allPassed') notes.push('全員が動けなくなって終了');
    document.getElementById('result-note')!.textContent = notes.join(' / ');
    const tb = document.querySelector('#result-table tbody')!;
    tb.replaceChildren();
    for (const e of r.ranking) {
      const tr = document.createElement('tr');
      tr.dataset.testid = `result-row-${e.player}`;
      const sc = e.score;
      const eff = sc.bestRegionCells > 0 ? `${(sc.bestRegionCells / sc.bestRegionPieces).toFixed(1)}(${sc.bestRegionCells}/${sc.bestRegionPieces})` : '0';
      for (const t of [`${e.rank}位`, names[e.player]!, String(sc.territory), eff]) {
        const td = document.createElement('td'); td.textContent = t; tr.append(td);
      }
      tb.append(tr);
    }
    this.el.hidden = false;
  }
  hide(): void { this.el.hidden = true; this.el.classList.remove('peek'); }
}
