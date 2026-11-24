import { PLAYER_COLORS } from '../logic/constants';
import type { GameState, PlayerScore } from '../logic/types';
import { MAX_TURNS } from '../logic/constants';
import { TURN_BANNER_MS } from '../render/animMath';

const q = (id: string) => document.querySelector<HTMLElement>(`[data-testid="${id}"]`)!;

export interface HudModel {
  state: GameState;
  scores: PlayerScore[];
  phaseText: string;
  confirmEnabled: boolean;
  confirmLabel: string;
  showCancel: boolean;
  busy: boolean;
}

export class Hud {
  private chip = document.getElementById('hud-chip')!;
  private cur = q('hud-current-player');
  private phase = q('hud-phase');
  private scoresBox = document.getElementById('hud-scores')!;
  private turn = q('hud-turn');
  private confirm = document.getElementById('confirm-button') as HTMLButtonElement;
  private cancel = document.getElementById('cancel-button') as HTMLButtonElement;
  private banner = document.getElementById('turn-banner')!;
  private toastEl = document.getElementById('toast')!;
  private rowCount = 0;
  private bannerTimer = 0;
  private toastTimer = 0;

  update(m: HudModel): void {
    const s = m.state, n = s.config.playerCount;
    if (this.rowCount !== n) this.buildRows(n);
    const finished = s.phase === 'finished';
    const name = s.config.playerNames[s.currentPlayer]!;
    this.chip.style.background = PLAYER_COLORS[s.currentPlayer]!;
    this.cur.textContent = finished ? 'ゲーム終了' : name;
    this.phase.textContent = m.phaseText;
    for (let p = 0; p < n; p++) {
      const row = this.scoresBox.children[p] as HTMLElement;
      row.classList.toggle('cur', !finished && p === s.currentPlayer);
      (row.querySelector('.nm') as HTMLElement).textContent = s.config.playerNames[p]!;
      q(`hud-score-${p}`).textContent = String(m.scores[p]?.territory ?? 0);
      const br = q(`hud-break-${p}`);
      const used = s.wallBreakUsed[p];
      br.textContent = `壁破り ${used ? 0 : 1}`;
      br.classList.toggle('used', !!used);
    }
    this.turn.textContent = `手数 ${s.turnCount} / ${MAX_TURNS}`;
    this.confirm.textContent = m.confirmLabel;
    this.confirm.disabled = m.busy || !m.confirmEnabled;
    this.cancel.style.visibility = m.showCancel ? "visible" : "hidden";
    this.cancel.disabled = m.busy;
  }

  private buildRows(n: number): void {
    this.scoresBox.replaceChildren();
    for (let p = 0; p < n; p++) {
      const row = document.createElement('div');
      row.className = 'score-row';
      row.innerHTML = `<span class="chip" style="background:${PLAYER_COLORS[p]};width:14px;height:14px"></span><span class="nm"></span><span class="sc" data-testid="hud-score-${p}">0</span><span class="br" data-testid="hud-break-${p}"></span>`;
      this.scoresBox.append(row);
    }
    this.rowCount = n;
  }

  showBanner(text: string, player: number): void {
    window.clearTimeout(this.bannerTimer);
    this.banner.replaceChildren();
    const b = document.createElement('div');
    b.className = 'b';
    b.textContent = text;
    b.style.background = PLAYER_COLORS[player]!;
    b.style.color = player === 2 ? '#2a1a05' : '#fff';
    this.banner.append(b);
    this.bannerTimer = window.setTimeout(() => this.banner.replaceChildren(), TURN_BANNER_MS + 50);
  }

  toast(text: string): void {
    window.clearTimeout(this.toastTimer);
    this.toastEl.innerHTML = '';
    const s = document.createElement('span'); s.textContent = text; this.toastEl.append(s);
    this.toastTimer = window.setTimeout(() => this.toastEl.replaceChildren(), 1800);
  }
}
