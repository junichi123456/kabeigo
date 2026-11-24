import './ui/styles.css';
import type { GameConfig, GameState } from './logic';
import { Controller } from './app/controller';
import { Animator } from './render/animator';
import { BoardView } from './render/boardView';
import { buildCabin } from './render/cabinView';
import { Picker } from './render/picking';
import { createStage, webglAvailable } from './render/scene';
import type { Stage } from './render/scene';
import { installHooks, hooksEnabled } from './testHooks';
import { Hud } from './ui/hud';
import { ResultScreen } from './ui/resultScreen';
import { RulesModal } from './ui/rulesModal';
import { TitleScreen } from './ui/titleScreen';

const gameScreen = document.getElementById('game-screen')!;
const rules = new RulesModal();
const hud = new Hud();
let ctrl: Controller | null = null;
let stage: Stage | null = null;
let lastConfig: GameConfig | null = null;

function ensureRuntime(): boolean {
  if (ctrl) return true;
  if (!webglAvailable()) { document.getElementById('no-webgl')!.hidden = false; return false; }
  const wrap = document.getElementById('canvas-wrap')!;
  stage = createStage(wrap);
  const animator = new Animator();
  const view = new BoardView(animator);
  stage.scene.add(buildCabin());
  stage.scene.add(view.root);
  const picker = new Picker(stage.camera, stage.canvas);
  stage.onFrame((now) => { animator.tick(now); view.tick(now); });
  ctrl = new Controller(view, picker, animator, hud, result, stage.canvas, stage.rig);
  if (hooksEnabled()) installHooks(ctrl, picker, animator, stage.rig, (s) => enterGame(() => ctrl!.loadState(s)));
  return true;
}

function enterGame(start: () => void): void {
  title.show(false);
  gameScreen.hidden = false;
  document.getElementById('menu-popup')!.hidden = true;
  if (!ensureRuntime()) return;
  stage!.resize();
  start();
}

function toTitle(): void {
  ctrl?.stop();
  gameScreen.hidden = true;
  title.show(true);
}

const result = new ResultScreen(
  () => { if (lastConfig) enterGame(() => ctrl!.startGame(lastConfig!)); },
  toTitle,
);
const title = new TitleScreen(
  (cfg) => { lastConfig = cfg; enterGame(() => ctrl!.startGame(cfg)); },
  () => rules.show(true),
);

// メニュー
const menuPopup = document.getElementById('menu-popup')!;
document.getElementById('menu-button')!.addEventListener('click', () => { menuPopup.hidden = !menuPopup.hidden; });
document.querySelector('[data-testid="menu-rules"]')!.addEventListener('click', () => { menuPopup.hidden = true; rules.show(true); });
const quit = document.getElementById('confirm-quit')!;
document.querySelector('[data-testid="menu-title"]')!.addEventListener('click', () => { menuPopup.hidden = true; quit.hidden = false; });
document.querySelector('[data-testid="quit-no"]')!.addEventListener('click', () => { quit.hidden = true; });
document.querySelector('[data-testid="quit-yes"]')!.addEventListener('click', () => { quit.hidden = true; toTitle(); });

// ホットフック用: 型エクスポート(未使用警告回避)
export type { GameState };
