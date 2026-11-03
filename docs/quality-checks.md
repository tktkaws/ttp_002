# 品質確認の構成と記録

## 実行方法

```sh
npm ci
npm run verify
```

Node.jsの対応範囲は `^22.22.0 || >=24.8.0`。HTML Validateを含む開発依存の要件に合わせ、`package.json` とlockfileに反映した。ブラウザー試験は既定でインストール済みGoogle Chromeを隔離プロファイルで使う。Chromiumを使う場合やポート変更は [README](../README.md) を参照。

`verify` は以下を順に実行し、失敗時は後続を実行しない。ビルドは1回だけ行い、HTML検証と各テストは同じ成果物を対象にする。

| 項目       | ツール・対象                                                                                        |
| ---------- | --------------------------------------------------------------------------------------------------- |
| 型確認     | `astro check --minimumFailingSeverity warning`。AstroとTypeScriptを既存のstrict設定で確認           |
| 整形確認   | Prettierと公式 `prettier-plugin-astro`。修正は `npm run format`                                     |
| ビルド     | `astro build`                                                                                       |
| HTML検証   | `html-validate --max-warnings 0 "dist/**/*.html"`。生成したすべてのHTMLをオフライン検証             |
| Node回帰   | Node.js標準test runner。初期設定・保存・ページ内URL・初期化失敗時の復元を確認                       |
| 操作・表示 | Playwright。テーマ・保存・URL、キーボード、アクセシビリティ情報、拡大相当条件、モーション設定を確認 |
| 差分       | `git diff --check`                                                                                  |

単独実行用に `check`、`format:check`、`validate:html`、`test:regression`、`test:browser` も用意した。HTML検証と2つのテストスクリプトはそれぞれビルドを含む。

## 検証対象と設定理由

型確認は本プロジェクトの `src/` と設定を対象とし、未使用だが保持中のTimelineも含める。`_timeline/` はGit管理対象外の別プロジェクトで、ビルドにも含まれないため除外する。ローカル資料・生成物も除外する。JavaScript製テスト自体の静的型検証は行わず、実行結果を確認する。

整形対象はソース・テスト・設定・README・`docs/`。`.prettierignore` では画像等のアセット、生成物、lockfile、Git管理対象外のローカル資料、エージェント向け指示ファイル、IDE設定を除外する。

HTML Validateは `html-validate:recommended` を基準とし、次を明示する。

- `falling-text-cards` はflow contentを持つカスタム要素として定義し、内部も検証する。
- `aria-label-misuse.allowAnyNamable: true` は、ARIAで命名が許される要素へのラベルを認める。文字ごとの演出要素を読み上げから隠し、h1に連続した日本語の名前を与える既存の構造を維持する。命名が禁止される要素への誤用は引き続き検証する。
- `no-redundant-role` は `list` のみ除外する。リストマーカーを消してもSafari等で一覧の意味を維持するための既存の `ul role="list"` を残す。他の冗長なroleは検証する。

HTMLの入れ子・必須属性・重複ID等の検証は有効のまま。Nu Html Checkerは使用していない。

## 今回の修正

- Astro Check、TypeScript、PrettierとAstroプラグイン、HTML Validate、Matter.js／Tweakpaneの型依存を開発依存に追加した。
- カードと保持中Timelineの骨格描画では、Matter.jsの制約にbodyA／bodyBが存在する場合だけ線を生成するようにした。nullになり得る型への未確認アクセスを解消した。
- ソース・テスト・設定・文書をPrettierで整形した。整形と上記以外の振る舞いの変更は加えていない。

## 実行記録（2026-11-03）

環境：macOS、Node.js 26.13.0、Astro 7.0.6、Astro Check 0.9.12、TypeScript 6.0.3、Prettier 3.9.10、Astroプラグイン1.1.2、HTML Validate 11.18.0。ブラウザーはPlaywright 1.64.1＋Google Chrome 156.0.8078.80のヘッドレスモード。

| 項目                 | 結果                                 |
| -------------------- | ------------------------------------ |
| 型確認               | 37ファイル、error・warning・hint各0  |
| 整形確認             | 対象ファイルすべて成功               |
| ビルド               | 成功、静的ページ1件を生成            |
| HTML検証             | `dist/index.html`、error・warning各0 |
| Node回帰             | 40件成功                             |
| ブラウザー操作・表示 | 40件成功                             |
| 差分の空白           | 問題なし                             |

`npm run verify` は終了コード0で完了した。HTML検証の設定に対し、不正なリスト子要素・重複ID・画像のalt欠落・命名禁止要素へのaria-labelの4種類の不正なHTMLを与え、それぞれ対応するルールで検出することも確認した。

整形前のHEADを同じPrettier設定で正規化して比較し、ソースとテストの整形以外の変更は骨格描画2箇所と未使用引数名だけであることを確認した。

ブラウザー試験の詳細・VoiceOver実機確認などの未実施範囲は [アクセシビリティ試験記録](accessibility-test-results.md) を参照。今回の合格はこの構成の検証対象に対するものであり、未実施の手動試験やWCAG全体の適合を示すものではない。

設定の参照先：[Astro TypeScript](https://docs.astro.build/en/guides/typescript/)、[公式Prettier Astroプラグイン](https://github.com/withastro/prettier-plugin-astro)、[Tweakpaneの型依存](https://tweakpane.github.io/docs/getting-started/)、[HTML Validateの命名ルール](https://html-validate.org/rules/aria-label-misuse.html)、[冗長roleの設定](https://html-validate.org/rules/no-redundant-role.html)。
