export interface Settings { playerCount: 2 | 3; names: string[]; mode: 'pvp' | 'cpu'; }
const KEY = 'hang.settings.v1';
const fresh = (): Settings => ({ playerCount: 2, names: ['', '', ''], mode: 'pvp' });

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const o = JSON.parse(raw) as Partial<Settings>;
    return {
      playerCount: o.playerCount === 3 ? 3 : 2,
      names: [0, 1, 2].map((i) => (typeof o.names?.[i] === 'string' ? o.names[i]!.slice(0, 12) : '')),
      mode: o.mode === 'cpu' ? 'cpu' : 'pvp',
    };
  } catch { return fresh(); }
}
export function saveSettings(s: Settings): void {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* 保存不可でも動作する */ }
}
