# カベガコイ(仮称)— 壁囲碁アレンジ

9×9 の盤で 2〜3 人がホットシート対戦するボードゲーム。TypeScript(strict)+ Three.js + Vite。
1 コードベースで PWA / Windows(Electron)/ iOS・Android(Capacitor)に届く構成です。
仕様は `docs/SPEC.md`(決定事項 D-01〜D-12)。

## 前提

- Node.js 20 以上(開発は Node 22 で確認)
- ブラウザ E2E は Playwright(コンテナにインストール済みの Chromium を使う。`playwright install` は不要)

## コマンド(すべて `game/` で実行)

| コマンド | 内容 |
|---|---|
| `npm install` | 依存導入 |
| `npm run dev` | 開発サーバ(`0.0.0.0:5173`) |
| `npm run build` | `tsc --noEmit && vite build`(出力 `dist/`) |
| `npm run preview` | ビルド成果物の配信(`0.0.0.0:4173`) |
| `npm test` | 単体テスト(Vitest。ロジック全ケース+ランダム自己対戦) |
| `npm run typecheck` | 型検査のみ |
| `npm run test:e2e` | Playwright E2E(desktop / mobile-portrait / mobile-landscape)。webServer が `build` → `preview` を起動 |
| `npm run electron:dev` | Electron で `dist/` を開く |
| `npm run electron:build` | Windows(NSIS)インストーラ作成(Windows 機または CI で実行) |
| `npm run cap:sync` | `vite build` → `npx cap sync` |

`?test=1` を URL に付けると `window.__HANG__`(E2E 用テストフック。仕様 10.3)が有効になります(`npm run dev` では常時有効)。

### E2E について

- コンテナの描画はソフトウェア GL(SwiftShader)で 10 fps 前後になります。そのため個別テストのタイムアウトは 120 秒、
  アニメ時間の許容は ±40ms にフレーム 1 枚分(150ms)を足しています。**実機の性能を示す値ではありません。**
- スクリーンショットは `test-results/screens/` に保存されます(目視確認用)。成果物・トレースは `test-results/artifacts/`。
- フィクスチャ JSON の再生成: `npx vite-node tests/e2e/fixtures/make.ts`
- 画面の確認用に `node scripts/shot.mjs <name> <w> <h>`(要 `npm run preview`)でスクリーンショットを撮れます。

## ディレクトリ

```
src/logic/    純粋ロジック(three / DOM / window / Math.random / Date.now / localStorage を参照しない。purity.test.ts で検証)
src/render/   Three.js 描画(盤・駒・壁・ハイライト・海賊船の卓上背景・アニメ)。animMath.ts は純粋関数
src/ui/       DOM + CSS の画面(タイトル・HUD・結果・ルール)。確定ボタンは public/assets/confirm-button.png(ドライブのアセット「かくていボタン.png」)
src/app/      コントローラ(入力 → ロジック → 描画の調停)、設定(localStorage)
src/testHooks.ts  window.__HANG__
tests/unit/   Vitest      tests/e2e/  Playwright
electron/     Electron メイン(dist/index.html を開くだけ)
```

## パッケージング

### PWA
`npm run build` で `dist/` に manifest と Service Worker(オフライン動作)が生成されます。任意の静的ホスティングに置くだけです。
ホームに追加すると `standalone` で動作します。

### Windows(Electron)
Windows 機または CI で:
```bash
npm install
npm run electron:build   # release/ 以下に NSIS インストーラ
```
動作確認だけなら `npm run electron:dev`。(Linux コンテナでは実行していません)

### Android / iOS(Capacitor 6)
初回のみプラットフォームを追加します(各 OS の環境が必要):
```bash
npx cap add android     # Android SDK / JDK が必要
npx cap add ios         # macOS + Xcode が必要
npm run cap:sync        # dist をネイティブプロジェクトへ反映
npx cap open android    # Android Studio で APK をビルド
npx cap open ios        # Xcode で IPA をビルド
```
`capacitor.config.ts`: `appId: com.example.kabegakoi`、`webDir: dist`。`android/`・`ios/` は生成物のためコミットしていません。

## 未実施・スコープ外(正直な一覧)

- 実機ビルド(exe / APK / IPA)と実機での動作確認(タップ精度・回転・セーフエリア・フレームレート)は未実施。
- オンライン対戦・サウンド・多言語・途中保存・Undo・CPU 対戦(M9/M10 オプション)は未実装(仕様 D-12)。
