# タカハシタカユキのポートフォリオ

AstroとTailwind CSSで構築したポートフォリオです。本文は静的HTMLで生成し、表示設定と演出をブラウザー側のTypeScriptで追加しています。

## 変更する内容とファイル

| 変更したい内容 | 主な変更箇所 |
| --- | --- |
| タイトル・description、ロゴの文字、自己紹介、技術、強み、成果物、リンク先 | `src/data/portfolio.ts` |
| コンテンツデータの型 | `src/types/portfolio.ts` |
| ページ全体のセクション構成・並び・一覧のHTML | `src/pages/index.astro` |
| html・head・body、外部フォント、ページ全体の余白 | `src/layouts/BaseLayout.astro` |
| セクションの枠・番号・h2と本文の配置 | `src/components/PageSection.astro` |
| ロゴのHTMLと見た目 | `src/components/SiteHeader.astro` |
| フッターのHTMLと見た目 | `src/components/SiteFooter.astro` |
| ナビゲーション・設定ボタンのHTMLと見た目 | `src/components/FixedNav.astro` |
| 成果物一覧・カードのHTMLと見た目 | `src/components/TextCards.astro` |
| フォント・余白・文字サイズの基準値・フォーカスの色 | `src/styles/tokens.css` |
| 基礎スタイル・ページ内移動・アニメーション停止のCSS | `src/styles/base.css` |
| 共通の文字サイズ・ロゴの組版 | `src/styles/typography.css` |
| 共通フォーカス・リンクやボタンの操作時の表示 | `src/styles/accessibility.css` |
| CSSの読み込み順・Tailwindの導入とdark variant | `src/styles/global.css` |
| テーマ・アニメーションの既定値と保存キー | `src/config/preferences.ts` |
| 成果物カードの色・高さ・間隔・文字倍率 | `src/config/presentation.ts` |
| カードの物理演算の既定値 | `src/config/card-physics.ts` |
| 初回描画前の設定復元 | `src/components/PreferenceInit.astro` |
| 設定の取得・DOMへの反映・保存 | `src/scripts/preferences.ts` |
| ナビの開閉・フォーカス・スクロール時の表示 | `src/scripts/fixed-nav.ts` |
| ページ内リンク・直接アクセス・hashchange時のフォーカス | `src/scripts/page-anchors.ts` |
| ロゴ／セクション見出しの表示演出 | `src/scripts/logo-reveal.ts` / `src/scripts/heading-reveal.ts` |
| カード用カスタム要素の登録・接続と切断 | `src/scripts/cards/text-cards.ts` |
| カードの物理演算・描画・Observerとフレームの停止／再開／破棄 | `src/scripts/cards/physics.ts` |
| カードの調整用Tweakpane UI | `src/scripts/cards/controls.ts` |

単純な配置にはTailwindのutilityを使い、コンポーネント固有のスタイルは各 `.astro` のscopedな `<style>` に置きます。共通の基準や操作時の表示は `src/styles/` が担当します。コンポーネントを分割するときは、scoped CSSが子コンポーネント内部に自動で届かない点を確認してください。

`index.astro` はデータ・表示設定・コンポーネントを組み立てます。各コンポーネントの `<script>` は対応するTypeScriptモジュールを読み込む入口です。`PageSection` を複数使っても、Astroが処理するscriptは1回だけ実行され、ページ内の対象見出しをまとめて初期化します。

`PreferenceInit.astro` はhead内で、外部CSSより先に実行する同期インラインscriptと、読み込み中の背景・color-scheme用CSSを持ちます。既定値と保存キーは `config/preferences.ts` から渡します。操作後の文書状態・保存・別タブのstorageイベント・pageshow時の復元は `scripts/preferences.ts`、変更通知を受けたラベルと選択状態の更新は `scripts/fixed-nav.ts` が担当します。

既存の `#section01`〜`#section04` は維持します。`scripts/page-anchors.ts` は移動先へのフォーカスを補い、URL・スクロール・戻る／進むの履歴更新は通常のリンクとブラウザーが担当します。初回ロードではfragmentの移動を待ってフォーカスし、Ctrl／Command等を伴うリンク操作には介入しません。

## 未使用コンポーネントと依存

`Timeline.astro` は現在のページから参照されていません。既存のタイムライン実装として保持し、振る舞いを `scripts/timeline.ts` に分離しています。利用を再開するときは、配置先に応じた見出し階層と操作・表示の検証を行ってください。

`matter-js` はカードと保持中のタイムラインの物理演算、`tweakpane` は `showControls` を有効にした場合の調整UIに使います。依存は継続利用しています。調整UIのモジュールは分離していますが、ライブラリの動的読み込みや本番用入口からの除外はまだ行っていません。

## 開発

Node.js 22.12.0以上が必要です。依存は `npm ci` でインストールします。

| 操作 | コマンド |
| --- | --- |
| 開発サーバーのバックグラウンド起動 | `npm run dev -- --background` |
| 状態確認 | `npm run astro -- dev status` |
| ログ確認 | `npm run astro -- dev logs` |
| 停止 | `npm run astro -- dev stop` |
| 本番ビルド | `npm run build` |
| テーマ・保存設定・ページ内URLの回帰テスト | `npm run test:regression` |
| 差分の空白チェック | `git diff --check` |

開発サーバーは `AGENTS.md` の指示どおりバックグラウンドで管理します。通常のURLは `http://localhost:4321`、ビルド出力は `dist/` です。

## 変更後の確認

1. `npm run test:regression` と `git diff --check` を実行します。回帰テストにはビルドも含みます。ビルドはTypeScriptの完全な型チェックではありません。
2. 生成HTMLの見出し（h1: 1、h2: 4、h3: 14）、技術6件・強み2件・成果物6件の一覧、重複ID、ページ内リンク先を確認します。件数を変更した場合は変更後のデータに合わせます。
3. 表示設定はライト／ダーク、Animation On／Off、保存後の再読み込み、localStorageが利用できない場合を確認します。
4. キーボードのTab・Shift+Tab・Enter・Space・Escape、目次選択後のフォーカス移動を確認します。
5. 320／768／1280／1536pxの表示、文字拡大、OSの動きを減らす設定、画面外・タブ非表示からの復帰、読み上げを確認します。

回帰テストはNode.js標準のtest runnerと `--experimental-strip-types` で実行し、追加のテスト依存はありません。生成HTMLにおける初期設定scriptの実行順序、実際の同期scriptの保存値復元、設定変更と表示の同期、イベントとDOMの代替実装によるページ内リンク処理を検証します。実ブラウザーの描画フレームやネイティブな履歴移動そのものを測定するテストではありません。

完全な型チェック・整形・HTMLバリデーター・ブラウザー操作の専用スクリプトは未導入です。`astro check` を利用するには `@astrojs/check` と `typescript` の追加が必要です。ブラウザーや支援技術での確認結果は、実施した項目と環境を記録してください。

### 回帰検証の記録（2026-11-03）

`npm run test:regression` はNode.js 26.13.0でビルド・25件のテストが成功しました。保存値の全組み合わせと例外、設定操作と表示同期、既存の4アンカーとイベント処理を検証しています。

実ブラウザーでの低速読み込み時のちらつき、再読み込み、テーマ操作、戻る／進むの確認は未完了です。自動テストの成功と描画実測の完了を分けて扱います。
