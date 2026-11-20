# クロスサム候補

カックロ（クロスサム）の候補絞り込みツール。マスの数と合計を入れるだけで、重複なしの数字の組み合わせと各マスに入り得る数字が全部表示されます。各マスに確定・候補・除外を指定すると、その場で組み合わせが絞り込まれます。

## 使い方

GitHub Pagesでそのまま開けます: https://takasyo.github.io/cross-sum/

テーマ（システム／ライト／ダーク）と入力値はブラウザのlocalStorageに保存され、次回は前回の状態から始まります。

## ファイル構成

- `index.html` — マークアップ
- `assets/style.css` — スタイル
- `assets/app.ts` — 本体ロジック（TypeScript）

`assets/app.js` はビルド生成物なのでリポジトリには含めていません。pushするとGitHub ActionsがTypeScriptをコンパイルしてGitHub Pagesへデプロイします。手元でビルドする場合は `npm ci` のあと `npm run build` です。
