import { PLAYER_COLORS } from '../logic/constants';
import type { GameConfig } from '../logic/types';
import { loadSettings, saveSettings } from '../app/settings';

const $ = <T extends HTMLElement>(id: string) => document.querySelector<T>(`[data-testid="${id}"]`)!;

export interface GameSetup { config: GameConfig; cpu: boolean[]; }

/** CPU 対戦: プレイヤー1(親)が人間、残りが CPU */
export function cpuName(index: number, playerCount: number): string { return playerCount === 2 ? 'CPU' : `CPU${index}`; }

export class TitleScreen {
  private el = document.getElementById('title-screen')!;
  private settings = loadSettings();
  private inputs: HTMLInputElement[] = [];

  constructor(private onStart: (s: GameSetup) => void, private onRules: () => void) {
    for (const n of [2, 3] as const) $(`player-count-${n}`).addEventListener('click', () => { this.collect(); this.settings.playerCount = n; this.render(); });
    for (const m of ['pvp', 'cpu'] as const) $(`mode-${m}`).addEventListener('click', () => { this.collect(); this.settings.mode = m; this.render(); });
    $('start-button').addEventListener('click', () => {
      this.collect();
      saveSettings(this.settings);
      const n = this.settings.playerCount;
      const cpuMode = this.settings.mode === 'cpu';
      const names = this.settings.names.slice(0, n).map((s) => s.trim());
      if (cpuMode) for (let p = 1; p < n; p++) names[p] = cpuName(p, n);
      this.onStart({ config: { playerCount: n, playerNames: names }, cpu: Array.from({ length: n }, (_, p) => cpuMode && p > 0) });
    });
    $('rules-button').addEventListener('click', onRules);
    this.render();
  }

  private collect(): void { this.inputs.forEach((inp, i) => { this.settings.names[i] = inp.value.slice(0, 12); }); }

  private render(): void {
    const n = this.settings.playerCount;
    const cpuMode = this.settings.mode === 'cpu';
    for (const k of [2, 3] as const) { const b = $(`player-count-${k}`); b.classList.toggle('on', k === n); b.setAttribute('aria-pressed', String(k === n)); }
    for (const m of ['pvp', 'cpu'] as const) { const b = $(`mode-${m}`); const on = m === this.settings.mode; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); }
    const box = document.getElementById('name-inputs')!;
    box.replaceChildren();
    this.inputs = [];
    const humans = cpuMode ? 1 : n;
    for (let p = 0; p < humans; p++) {
      const label = document.createElement('label');
      const dot = document.createElement('span'); dot.className = 'dot'; dot.style.background = PLAYER_COLORS[p]!;
      const inp = document.createElement('input');
      inp.type = 'text'; inp.maxLength = 12; inp.placeholder = `プレイヤー${p + 1}`; inp.value = this.settings.names[p] ?? '';
      inp.dataset.testid = `name-input-${p}`;
      label.append(dot, inp); box.append(label); this.inputs.push(inp);
    }
    if (cpuMode) {
      const hint = document.createElement('p');
      hint.className = 'hint';
      hint.dataset.testid = 'cpu-hint';
      hint.textContent = `あなたが先手(プレイヤー1)。相手: ${Array.from({ length: n - 1 }, (_, i) => cpuName(i + 1, n)).join('・')}(コンピュータ)`;
      box.append(hint);
    }
  }

  show(v: boolean): void { this.el.hidden = !v; }
}
