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
| 表示演出の開始条件・有限アニメーションの管理 | `src/scripts/reveal.ts` |
| カード用カスタム要素の登録・接続と切断 | `src/scripts/cards/text-cards.ts` |
| カードの演出モジュール読み込み・失敗時の静的表示 | `src/scripts/cards/enhancement.ts` / `src/scripts/cards/fallback.ts` |
| カードの物理演算・描画・Observerとフレームの停止／再開／破棄 | `src/scripts/cards/physics.ts` |
| カードの調整用Tweakpane UI | `src/scripts/cards/controls.ts` |

単純な配置にはTailwindのutilityを使い、コンポーネント固有のスタイルは各 `.astro` のscopedな `<style>` に置きます。共通の基準や操作時の表示は `src/styles/` が担当します。コンポーネントを分割するときは、scoped CSSが子コンポーネント内部に自動で届かない点を確認してください。

`index.astro` はデータ・表示設定・コンポーネントを組み立てます。各コンポーネントの `<script>` は対応するTypeScriptモジュールを読み込む入口です。`PageSection` を複数使っても、Astroが処理するscriptは1回だけ実行され、ページ内の対象見出しをまとめて初期化します。

`PreferenceInit.astro` はhead内で、外部CSSより先に実行する同期インラインscriptと、読み込み中の背景・color-scheme用CSSを持ちます。既定値と保存キーは `config/preferences.ts` から渡します。操作後の文書状態・保存・別タブのstorageイベント・pageshow時の復元は `scripts/preferences.ts`、変更通知を受けたラベルと選択状態の更新は `scripts/fixed-nav.ts` が担当します。

既存の `#section01`〜`#section04` は維持します。`scripts/page-anchors.ts` は移動先へのフォーカスを補い、URL・スクロール・戻る／進むの履歴更新は通常のリンクとブラウザーが担当します。初回ロードではfragmentの移動を待ってフォーカスし、Ctrl／Command等を伴うリンク操作には介入しません。

本文・見出し・成果物リンクは静的HTMLで利用できます。目次には `details/summary` を使い、JavaScriptが無効でも開閉できます。設定操作は初期化完了後に表示・有効化し、途中の失敗時は通常の目次へ戻します。

ロゴ・見出しは通常表示を基準にし、表示条件を満たしたときだけ有限時間のWeb Animationsを重ねます。モジュールやObserverが使えなくても、待機中の内容をCSSで隠しません。カードは物理演算の読み込み・初期化・フレーム処理に失敗した場合、演出による非表示と変形を解除し、Observer・イベント・フレームを停止します。

## 未使用コンポーネントと依存

`Timeline.astro` は現在のページから参照されていません。既存のタイムライン実装として保持し、振る舞いを `scripts/timeline.ts` に分離しています。利用を再開するときは、配置先に応じた見出し階層と操作・表示の検証を行ってください。

`matter-js` はカードと保持中のタイムラインの物理演算、`tweakpane` は `showControls` を有効にした場合の調整UIに使います。依存は継続利用しています。カードの物理演算モジュールは動的importし、取得に失敗した場合は静的表示を維持します。Tweakpaneの本番用入口からの除外や、`showControls` に応じたライブラリ単独の読み込み分離は未実施です。

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
| 隔離した実ブラウザーでの回帰テスト | `npm run test:browser` |
| 差分の空白チェック | `git diff --check` |

開発サーバーは `AGENTS.md` の指示どおりバックグラウンドで管理します。通常のURLは `http://localhost:4321`、ビルド出力は `dist/` です。

## 変更後の確認

1. `npm run test:regression`、`npm run test:browser`、`git diff --check` を実行します。各テストにはビルドも含みます。ビルドはTypeScriptの完全な型チェックではありません。
2. 生成HTMLの見出し（h1: 1、h2: 4、h3: 14）、技術6件・強み2件・成果物6件の一覧、重複ID、ページ内リンク先を確認します。件数を変更した場合は変更後のデータに合わせます。
3. 表示設定はライト／ダーク、Animation On／Off、保存後の再読み込み、localStorageが利用できない場合を確認します。
4. キーボードのTab・Shift+Tab・Enter・Space・Escape、目次選択後のフォーカス移動を確認します。
5. 320／768／1280／1536pxの表示、文字拡大、OSの動きを減らす設定、画面外・タブ非表示からの復帰、読み上げを確認します。

`test:regression` はNode.js標準のtest runnerと `--experimental-strip-types` で実行し、このテスト自体に追加依存はありません。生成HTMLにおける初期設定scriptの実行順序、実際の同期scriptの保存値復元、設定変更と表示の同期、イベントとDOMの代替実装によるページ内リンク処理を検証します。

`test:browser` は開発依存の `@playwright/test` を使い、本番ビルドを一時的なローカルHTTPサーバーで配信して検証します。既定ではインストール済みGoogle Chromeを、普段のブラウザーと別プロファイルのヘッドレスモードで起動します。Chromeを使わない環境では `npx playwright install chromium` の後、`PLAYWRIGHT_CHANNEL=chromium npm run test:browser` を実行してください。ポートは4357が既定で、`PORTFOLIO_TEST_PORT` で変更できます。

結果と描画サンプル・スクリーンショットの添付は `test-results/browser-results.json` に出力します。失敗時は `test-results/browser/` にスクリーンショットとトレースも保存します。生成物は `.gitignore` の対象です。外部フォント・外部画像へのアクセスは遮断し、外部サービスの状態に左右されない条件で確認します。

キーボード・支援技術向け情報・文字拡大・リフロー・モーション設定の試験も `test:browser` に含みます。実施条件と結果、拡大時に見つかった目次の修正は [アクセシビリティ試験記録](docs/accessibility-test-results.md) を参照してください。読み上げはアクセシビリティ情報の自動検証まで実施し、VoiceOver等での実機確認は未実施です。

完全な型チェック・整形・HTMLバリデーターの専用スクリプトは未導入です。`astro check` を利用するには `@astrojs/check` と `typescript` の追加が必要です。ブラウザーや支援技術での確認結果は、実施した項目と環境を記録してください。

### 回帰検証の記録（2026-11-03）

`npm run test:regression` はNode.js 26.13.0でビルド・25件のテストが成功しました。保存値の全組み合わせと例外、設定操作と表示同期、既存の4アンカーとイベント処理を検証しています。

この時点の検証はDOMの代替実装が対象です。実ブラウザーでの確認結果は、後述のPlaywright検証に記録しています。

### 初期化失敗時の検証（2026-11-03）

回帰テストを40件に拡張しました。JSなしの生成HTML、目次の初期化失敗、Observer・アニメーションAPIの失敗、物理演算モジュールの取得失敗、DOM変更後の失敗、切断中の読み込み完了、実際のMatter.jsのフレーム処理で発生する例外を検証しています。失敗後に内容の表示状態を復元し、不要な処理を解除することを確認します。

これらは生成物とDOM・イベントの代替実装による検証です。ブラウザーでJavaScriptを禁止した場合や、ネットワーク要求を遮断した場合の実機確認は別途行います。

### テーマ・保存設定・既存URLの実ブラウザー検証（2026-11-03）

Playwright 1.64.1、Google Chrome 156.0.8078.80のヘッドレスモード、1280×900の画面で14件すべて成功しました。通常のブラウザーのタブ・保存情報は使用していません。

- ライト／ダーク × Animation On／Offの4条件でCSSを1.2秒遅延。requestAnimationFrameで初回コンテンツ描画前後のテーマ属性・darkクラス・color-scheme・背景色を記録し、反対のテーマを検出しませんでした。ライトとダークのスクリーンショットも確認しました。
- UIで設定を変更し、再読み込み後の保存値・表示・選択状態を確認。不正値、ストレージ拒否、別タブからの設定変更と削除も確認しました。
- `#section01`〜`#section04` の直接アクセス、目次・フッター・同じhashの再選択、実際の戻る／進むで、URL・表示位置・フォーカスが対応し、query文字列も維持されました。

既存の `test:regression` 40件と `git diff --check` も成功しています。この結果は上記Chromeと通信条件での回帰確認です。Safari等の別エンジン、実ネットワーク上の外部フォント、読み上げの適合試験は含みません。
