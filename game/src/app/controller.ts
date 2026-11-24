import { applyMove, applyWall, computeScores, createGame, deserialize, legalMovesForPiece, legalPlacementCells, movablePieceIds, placeSquare, representativeMoves, wallOptions } from '../logic';
import type { ActionResult, Cell, Edge, GameConfig, GameEvent, GameState, Move } from '../logic';
import { edgeEq } from '../logic/board';
import type { Animator } from '../render/animator';
import type { BoardView } from '../render/boardView';
import { emptyOverlay } from '../render/highlightView';
import type { Overlay } from '../render/highlightView';
import type { Picker } from '../render/picking';
import type { Hud } from '../ui/hud';
import type { ResultScreen } from '../ui/resultScreen';
import { TURN_BANNER_MS } from '../render/animMath';

const sameCell = (a: Cell | null, b: Cell | null) => !!a && !!b && a.x === b.x && a.y === b.y;

export interface Selection { pieceId: string | null; target: Cell | null; edge: Edge | null; cell: Cell | null; }

export class Controller {
  state!: GameState;
  config!: GameConfig;
  private sel: Selection = { pieceId: null, target: null, edge: null, cell: null };
  private reps: Move[] = [];
  private playing = false;
  private overlay: Overlay = emptyOverlay();
  private active = false;

  constructor(
    private view: BoardView, private picker: Picker, private animator: Animator, private hud: Hud,
    private result: ResultScreen, canvas: HTMLCanvasElement,
  ) {
    let down: { x: number; y: number; id: number } | null = null;
    canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, id: e.pointerId }; });
    canvas.addEventListener('pointerup', (e) => {
      if (!down || down.id !== e.pointerId) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      down = null;
      if (moved <= 10) this.onTap(e.clientX, e.clientY);
    });
    canvas.addEventListener('pointercancel', () => { down = null; });
    document.getElementById('confirm-button')!.addEventListener('click', () => this.onConfirm());
    document.getElementById('cancel-button')!.addEventListener('click', () => this.onCancel());
  }

  isBusy(): boolean { return this.playing || this.animator.isBusy(); }
  getSelection(): Selection { return { ...this.sel }; }
  getOverlay(): Overlay { return this.overlay; }

  /* ---------- ゲーム開始・読込 ---------- */
  startGame(config: GameConfig): void {
    this.config = config;
    this.load(createGame(config), true);
  }

  loadState(input: string | GameState): void {
    const s = typeof input === 'string' ? deserialize(input) : (structuredClone(input) as GameState);
    this.config = s.config;
    this.load(s, false);
  }

  private load(s: GameState, banner: boolean): void {
    this.state = s;
    this.playing = false;
    this.active = true;
    this.clearSel();
    this.result.hide();
    this.view.sync(s);
    this.view.updateTerritory(s, s.phase === 'finished');
    this.refresh();
    if (s.phase === 'finished') this.result.show(s);
    else if (banner) this.showTurnBanner(s.currentPlayer);
  }

  stop(): void { this.active = false; this.playing = false; this.result.hide(); }

  /* ---------- 入力 ---------- */
  private onTap(cx: number, cy: number): void {
    if (!this.active || this.isBusy()) return;
    const s = this.state;
    if (s.phase === 'placement') {
      const cell = this.picker.cellAt(cx, cy);
      if (!cell || !legalPlacementCells(s).some((c) => sameCell(c, cell))) return;
      if (sameCell(this.sel.cell, cell)) { void this.onConfirm(); return; }
      this.sel.cell = cell; this.refresh();
    } else if (s.phase === 'move') {
      const cell = this.picker.cellAt(cx, cy);
      if (!cell) { this.clearSel(); this.refresh(); return; }
      if (this.sel.pieceId) {
        const rep = this.reps.find((m) => sameCell(m.path[m.path.length - 1]!, cell));
        if (rep) {
          if (sameCell(this.sel.target, cell)) { void this.onConfirm(); return; }
          this.sel.target = cell; this.refresh(); return;
        }
      }
      const own = s.pieces.find((p) => p.owner === s.currentPlayer && sameCell(p.pos, cell) && movablePieceIds(s).includes(p.id));
      if (own) {
        this.sel = { pieceId: own.id, target: null, edge: null, cell: null };
        this.reps = representativeMoves(legalMovesForPiece(s, own.id));
        this.refresh(); return;
      }
      this.clearSel(); this.refresh();
    } else if (s.phase === 'wall' && s.pendingWall) {
      const opts = wallOptions(s, s.pendingWall.cell);
      const e = this.picker.nearestEdge(cx, cy, opts);
      if (!e) return;
      if (edgeEq(e, this.sel.edge)) { void this.onConfirm(); return; }
      this.sel.edge = e; this.refresh();
    }
  }

  private onCancel(): void {
    if (!this.active || this.isBusy() || this.state.phase !== 'move') return;
    this.clearSel(); this.refresh();
  }

  async onConfirm(): Promise<void> {
    if (!this.active || this.isBusy()) return;
    const s = this.state;
    let r: ActionResult | null = null;
    if (s.phase === 'placement' && this.sel.cell) r = placeSquare(s, this.sel.cell);
    else if (s.phase === 'move' && this.sel.pieceId && this.sel.target) {
      const mv = this.reps.find((m) => sameCell(m.path[m.path.length - 1]!, this.sel.target));
      if (mv) r = applyMove(s, mv);
    } else if (s.phase === 'wall' && this.sel.edge) r = applyWall(s, this.sel.edge);
    if (!r || !r.ok) return;
    await this.commit(r.state, r.events);
  }

  private async commit(next: GameState, events: GameEvent[]): Promise<void> {
    this.state = next;
    this.playing = true;
    this.clearSel();
    this.refresh();
    await this.view.playEvents(events, next);
    if (!this.active) return;
    this.view.sync(next);
    this.view.updateTerritory(next, next.phase === 'finished');
    this.playing = false;
    this.refresh();
    for (const e of events) {
      if (e.type === 'playerSkipped') this.hud.toast(`${next.config.playerNames[e.player]}はスキップ(確定済み)`);
      if (e.type === 'turnPassed') this.hud.toast(`${next.config.playerNames[e.player]}は動けないためパス`);
    }
    const turns = events.filter((e): e is Extract<GameEvent, { type: 'turnStarted' }> => e.type === 'turnStarted');
    if (turns.length && next.phase !== 'finished') this.showTurnBanner(turns[turns.length - 1]!.player);
    if (next.phase === 'finished') this.result.show(next);
  }

  private showTurnBanner(player: number): void {
    this.hud.showBanner(`${this.state.config.playerNames[player]}のターン`, player);
    void TURN_BANNER_MS;
  }

  private clearSel(): void { this.sel = { pieceId: null, target: null, edge: null, cell: null }; this.reps = []; }

  /* ---------- 表示更新 ---------- */
  private refresh(): void {
    const s = this.state;
    const o = emptyOverlay();
    o.ghostPlayer = s.currentPlayer;
    let phaseText = '';
    let confirmEnabled = false;
    let confirmLabel = '確定';
    let showCancel = false;
    const busy = this.playing;
    if (!busy) {
      if (s.phase === 'placement') {
        o.placeCells = legalPlacementCells(s);
        o.selCell = this.sel.cell;
        o.ghostPlayer = s.placementQueue[0] ?? s.currentPlayer;
        phaseText = `□を置くマスを選んでください(残り${s.placementQueue.length})`;
        confirmEnabled = !!this.sel.cell;
      } else if (s.phase === 'move') {
        const movable = movablePieceIds(s);
        o.movable = s.pieces.filter((p) => movable.includes(p.id)).map((p) => ({ cell: p.pos, owner: p.owner }));
        showCancel = !!this.sel.pieceId;
        if (this.sel.pieceId) {
          o.targets = this.reps.filter((m) => !m.breakEdge).map((m) => m.path[m.path.length - 1]!);
          o.breakTargets = this.reps.filter((m) => m.breakEdge).map((m) => m.path[m.path.length - 1]!);
          o.selTarget = this.sel.target;
          const mv = this.reps.find((m) => sameCell(m.path[m.path.length - 1]!, this.sel.target));
          if (mv) {
            const pc = s.pieces.find((p) => p.id === this.sel.pieceId)!;
            o.previewPath = [pc.pos, ...mv.path];
            o.previewBreak = mv.breakEdge;
            confirmEnabled = true;
            if (mv.breakEdge) confirmLabel = '壁破りして移動';
            phaseText = mv.breakEdge ? '壁破りを使用します(ゲーム中1回)' : '確定を押すと移動します';
          } else phaseText = '移動先を選んでください';
        } else phaseText = '動かす駒を選んでください';
      } else if (s.phase === 'wall' && s.pendingWall) {
        o.ghostEdges = wallOptions(s, s.pendingWall.cell);
        o.selEdge = this.sel.edge;
        phaseText = '壁を建てる辺を選んでください';
        confirmEnabled = !!this.sel.edge;
      } else if (s.phase === 'finished') phaseText = 'ゲーム終了';
    }
    this.overlay = o;
    this.view.setOverlay(o, this.sel.pieceId);
    this.hud.update({ state: s, scores: computeScores(s), phaseText, confirmEnabled, confirmLabel, showCancel, busy });
  }
}
