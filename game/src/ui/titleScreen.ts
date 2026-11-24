import { PLAYER_COLORS } from '../logic/constants';
import type { GameConfig } from '../logic/types';
import { loadSettings, saveSettings } from '../app/settings';

const $ = <T extends HTMLElement>(id: string) => document.querySelector<T>(`[data-testid="${id}"]`)!;

export class TitleScreen {
  private el = document.getElementById('title-screen')!;
  private settings = loadSettings();
  private inputs: HTMLInputElement[] = [];

  constructor(private onStart: (c: GameConfig) => void, private onRules: () => void) {
    for (const n of [2, 3] as const) $(`player-count-${n}`).addEventListener('click', () => { this.collect(); this.settings.playerCount = n; this.render(); });
    $('start-button').addEventListener('click', () => {
      this.collect();
      saveSettings(this.settings);
      const n = this.settings.playerCount;
      this.onStart({ playerCount: n, playerNames: this.settings.names.slice(0, n).map((s) => s.trim()) });
    });
    $('rules-button').addEventListener('click', onRules);
    this.render();
  }

  private collect(): void { this.inputs.forEach((inp, i) => { this.settings.names[i] = inp.value.slice(0, 12); }); }

  private render(): void {
    const n = this.settings.playerCount;
    for (const k of [2, 3] as const) { const b = $(`player-count-${k}`); b.classList.toggle('on', k === n); b.setAttribute('aria-pressed', String(k === n)); }
    const box = document.getElementById('name-inputs')!;
    box.replaceChildren();
    this.inputs = [];
    for (let p = 0; p < n; p++) {
      const label = document.createElement('label');
      const dot = document.createElement('span'); dot.className = 'dot'; dot.style.background = PLAYER_COLORS[p]!;
      const inp = document.createElement('input');
      inp.type = 'text'; inp.maxLength = 12; inp.placeholder = `プレイヤー${p + 1}`; inp.value = this.settings.names[p] ?? '';
      inp.dataset.testid = `name-input-${p}`;
      label.append(dot, inp); box.append(label); this.inputs.push(inp);
    }
  }

  show(v: boolean): void { this.el.hidden = !v; }
}
