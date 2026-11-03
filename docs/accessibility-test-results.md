# アクセシビリティ試験記録

実施日：2026-11-03（JST）。本番ビルドの `/` を対象に、隔離したヘッドレスブラウザーで検証した。

## 環境・実施範囲

| 項目 | 条件 |
| --- | --- |
| 実行環境 | macOS、Node.js 26.13.0、Playwright 1.64.1 |
| ブラウザー | Google Chrome 156.0.8078.80、別プロファイル、ヘッドレス |
| 配信 | `npm run build` の成果物をテスト専用HTTPサーバーで配信（既定 `http://127.0.0.1:4357`） |
| 通信 | 外部フォント・外部画像への要求は遮断。ローカルのHTML・CSS・JS・画像を使用 |
| 表示 | ライト／ダーク、320／768／1280／1536 CSS px幅。通常の高さ900px、低い画面の試験は225px |
| 読み上げ | ユーザー指定により自動検証まで。VoiceOver・NVDAでの実機読み上げは未実施 |

テストは [`tests/browser/accessibility.spec.mjs`](../tests/browser/accessibility.spec.mjs) に保存した。今回追加した26件と既存のテーマ・保存・URLの14件、合計40件が成功し、失敗・スキップ・再試行は0件だった。

## 結果

| 分類 | 方法・確認対象 | 結果 |
| --- | --- | --- |
| キーボード（2件） | 両テーマでTab／Shift+Tab、Enter／Spaceで設定操作、Escapeで閉じてsummaryへ復帰。目次から技術セクションへ移動後、成果物6リンク・フッターへTab移動 | 成功。各操作位置のフォーカス、画面内表示、outlineの存在と他要素に覆われていないことを確認 |
| 固定ナビ（1件） | summaryにフォーカスしたままPageDown | 成功。フォーカス位置は画面内で表示を維持 |
| 読み上げ向け情報（1件） | PlaywrightのARIA snapshotとChrome DevTools Protocolのアクセシビリティツリー | 成功。下記の名前・構造・状態を確認。実際の発話は未確認 |
| リフロー（8件） | 両テーマ×320／768／1280／1536px。目次を開く前後を測定 | 成功。文書の横幅と本文・操作要素のテキスト矩形に画面幅を超える箇所なし |
| 文字拡大（4件） | 両テーマ×320／1280px。rootのfont-sizeを200%に上書きし、本文の計算済み文字サイズが2倍になることを確認。設定・目次の各パネルも開いて測定 | 成功。測定対象の文字・操作に横方向の欠けなし |
| 400%ズーム相当（2件） | 両テーマで320×225 CSS pxに設定（1280×900を400%に拡大した場合に相当）。目次4リンクへTab移動し、ポインターで開いた状態のスクロールも試験 | 発見した問題を修正後に成功。最後の項目まで画面内に表示して操作でき、スクロールで目次が勝手に閉じない |
| 文字間隔（2件） | 両テーマの320px幅で行高1.5、段落後2em、字間0.12em、単語間0.16emを上書き。各パネルも測定 | 成功。測定対象の文字・操作に横方向の欠けなし |
| モーション初期値（4件） | Animation On／Off × OS reduce／no-preference。Web Animations呼び出し、実行中アニメーション、カードの有効状態、scroll-behaviorを記録 | 成功。Onかつno-preferenceのときだけ演出が有効。OffまたはreduceではWeb Animations呼び出し0、実行中0、スクロールauto |
| モーション途中変更（2件） | 表示途中でOS設定をreduceへ変更して戻す。カード落下中にUIでOffを選択 | 成功。reduceで実行中の演出が停止し、戻すとカードの演出が有効。Offでは全6カードのopacityが1、transformがnoneへ復元 |

### 読み上げ向け情報の確認内容

- h1が1件、h2が4件、h3が14件。h1の名前は「タカハシ タカユキ のポートフォリオ」。h2は自己紹介・技術・強み・成果物の順。
- main・contentinfoが各1件。ナビゲーション2件は、それぞれ「表示設定とページ内ナビゲーション」「フッターナビゲーション」の名前を持つ。
- 技術6件・強み2件・「成果物一覧」6件のリスト項目、GitHubリンクの名前を確認。装飾のセクション番号 `[01]` はARIA snapshotに含まれない。
- ネイティブsummaryはChromeのアクセシビリティツリーで `DisclosureTriangle` として公開され、Contentsの名前・focusable・expandedのfalse→true→falseを確認。
- Lightボタンのpressed状態と、Dark選択後のsummary名「Theme: Dark」を確認。

ARIA snapshotはネイティブsummaryの役割と開閉状態を省略するため、その部分はChromeの実際のアクセシビリティツリーから取得した。VoiceOver等への発話内容・順序・操作性は、この結果から合格とは判定していない。

## 発見して修正した問題

320×225 CSS pxでは、固定ナビと展開した目次の高さが画面を超え、2件目以降のリンクへフォーカスしても画面内に表示されなかった。

[`FixedNav.astro`](../src/components/FixedNav.astro) で幅639px以下、または高さ480px以下の場合にナビとパネルを通常フローへ配置し、パネルの高さ制限を解除した。ページを縦にスクロールして全項目に到達できる。また、[`fixed-nav.ts`](../src/scripts/fixed-nav.ts) のスクロール時に隠す処理を固定配置の場合に限り、通常フローの目次がスクロールで閉じることを防いだ。

## 再実行・証跡

```sh
npm run test:browser
npm run test:regression
git diff --check
```

ブラウザー試験40件、Node.js回帰試験40件、ビルド、差分の空白チェックが成功した。完全な型チェック・HTMLバリデーションの合格を示すものではない。

`test-results/browser-results.json` に試験結果と添付のアクセシビリティ情報・レイアウト数値・モーション数値・スクリーンショットを出力する。失敗時は `test-results/browser/` に画面とトレースも保存する。これらは再生成可能なGit管理対象外のファイルで、次回実行時に更新される。この文書が今回の結果の記録となる。

320pxのライト、文字200%相当のダーク、320×225pxの目次最終項目の画面は目視でも確認した。

## 未実施の確認

VoiceOver＋Safari、NVDA＋Firefoxによる実機読み上げ、Safari／Firefoxの表示・操作、ブラウザーUIによる実際のズーム操作、外部Webフォント読み込み後の表示は未実施。今回の200%はroot文字サイズの変更、400%はCSSビューポートによる相当条件である。タブ非表示や画面外での物理演算の停止・再開、色のコントラスト、強制カラーも今回の対象に含めていない。

実機読み上げを追加する際は、環境・日付を追記し、見出し／ランドマーク移動、一覧の項目数、成果物リンクの目的、設定の選択状態、目次の開閉、ページ内移動後の読み始め位置を確認する。本記録は上記の試験範囲の結果であり、WCAG全体の適合判定ではない。

試験条件の参考：[W3C Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)、[W3C Text Spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html)。アクセシビリティ情報の取得方法：[Playwright ARIA snapshots](https://playwright.dev/docs/aria-snapshots)、[Chrome Accessibility domain](https://chromedevtools.github.io/devtools-protocol/tot/Accessibility/)。
