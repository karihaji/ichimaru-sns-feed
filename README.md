# 市丸グループ公式SNSフィード

SharePointの埋め込みWebパーツから表示する、GitHub Pages向けの軽量な公式SNSフィードです。Instagram、X、YouTubeを単一表示面のタブで切り替えます。Instagramは公開プロフィールの投稿データをGitHub Actionsで定期取得し、成功時だけ静的JSONを更新します。

## ローカル起動

Node.js 20以上を用意し、プロジェクト直下で実行します。GitHub ActionsではNode.js 24を使用します。外部パッケージのインストールは不要です。

```bash
npm start
```

ブラウザで `http://127.0.0.1:4173/` を開きます。埋め込み表示は `http://127.0.0.1:4173/?embed=1`、初期タブ指定は `?embed=1&tab=x` の形式です。

ビルド工程はありません。HTML、CSS、JavaScript、JSONをそのままGitHub Pagesへ配置します。

## 検証

```bash
npm run validate
npm test
```

`validate` はJSON構造、重複ID、Instagram画像パス、公開URL形式を確認します。

## 構成

- `index.html`: ページ本体
- `src/config.js`: 初期タブ、表示件数、XリストURL、YouTube設定
- `src/`: タブと各SNS表示のJavaScript、スタイル
- `public/data/accounts.json`: 全公式アカウント
- `public/data/instagram.json`: 手動管理するInstagram投稿
- `public/data/youtube.json`: 自動更新するYouTube動画
- `public/assets/instagram/`: Instagram画像の配置先
- `scripts/`: データ追加、取得、検証、ローカル配信
- `.github/workflows/`: Pages公開とYouTube定期更新

## Xの設定

12アカウントを含む公開XリストをX上で作成し、`src/config.js` の `x.listUrl` にリストURLを設定します。

このプロジェクトでは有料のX API、APIキー、Bearer Token、外部の有料ウィジェットを使用しません。X側が匿名のリスト埋め込みを制限しているため、ログイン済みの公開リストHOME画面を確認して撮影した静的カードを表示します。カードをクリックすると実際の公開Xリストを開きます。

```js
x: {
  listUrl: "https://x.com/CfcFerryYaKu2/lists/2065375791920406964",
  fallbackProfileUrl: "https://x.com/Cosmo_Ichimaru",
  snapshotImage: "./public/assets/x/x-list-home-20260612.png",
  snapshotUpdatedAt: "2026年6月12日",
  height: 480
}
```

画像を更新する場合は、公開リストが12メンバーであることと画像内に非公開情報がないことを確認し、`public/assets/x/` の画像を新しいファイル名で追加して設定を変更します。自動更新ではありません。

## Instagram投稿の追加

`Update Instagram feed` は実験的な手動ワークフローです。Instagramの公開Webエンドポイントはログインなしのアクセスを制限しているため、定期実行は無効化しています。実投稿を安定表示するにはInstagram APIのアクセストークンを用意するか、投稿URLと画像を手動登録します。取得できない場合は6件の公式プロフィールカードを表示します。

以下の手動投稿データは、公式埋め込みが利用できない場合の予備運用や独自カード表示へ戻す場合に使用できます。

1. 公開済み投稿の画像をWebP等で用意します。
2. `npm run add:instagram` を実行して対話入力します。
3. 表示された配置先へ画像を置きます。
4. `npm run validate` で確認します。

画像は `public/assets/instagram/` に置きます。正方形または横長を推奨し、公開済みSNS投稿の画像だけを使用してください。画像の自動ダウンロードは行いません。

投稿を一時的に非表示にする場合は `public/data/instagram.json` の対象項目を `"enabled": false` にします。投稿は `publishedAt` の降順で表示されます。同日の順序はJSONの並び順です。

初期データには、空画面を避けるため6件の公式プロフィールカードを登録しています。実投稿を追加すると、実投稿が新しい順で先に表示され、プロフィールカードはその後に表示されます。

プロフィールカード画像は、各公開Instagram HOME画面のプロフィール情報と投稿グリッドを同じ比率で切り出したものです。公開画面が更新された場合は、管理者が内容を確認したうえで画像を差し替えます。

アカウントを追加・削除する場合は `public/data/accounts.json` を編集します。正式表示名が判明したら `displayName` だけを変更できます。

## YouTube更新

手動更新:

```bash
npm run update:youtube
npm run validate
```

公開Atomフィードから最大8件を取得し、正常なデータが1件以上ある場合だけ `public/data/youtube.json` を置換します。失敗時は既存JSONを保持します。

GitHub Actionsの `Update YouTube feed` は6時間ごとの17分に実行されます。JSONに差分がある場合だけコミットし、そのpushによってPagesが再公開されます。更新ワークフロー自身はpushをトリガーにしないため、コミットの無限ループは発生しません。

GitHubは活動のないリポジトリの定期ワークフローを停止する場合があります。停止時はリポジトリの `Actions` で `Update YouTube feed` を開き、ワークフローを再有効化して `Run workflow` を実行してください。実行ログと `public/data/youtube.json` の最終コミット日時で更新を確認します。

## GitHub Pagesへの公開

公開URL: <https://karihaji.github.io/ichimaru-sns-feed/>

1. このディレクトリの内容をGitHubリポジトリの `main` ブランチへpushします。
2. `Settings > Pages > Build and deployment > Source` で `GitHub Actions` を選択します。
3. `Actions > Deploy GitHub Pages` の成功後、表示されたURLを確認します。

ワークフローはデータ検証とテストに成功した場合だけ公開します。

## 障害時の確認

- ページ全体: `Deploy GitHub Pages` のログとブラウザの開発者コンソール
- Instagram: JSON構文、`enabled`、画像パス、投稿URL
- X: `snapshotImage` の画像パス、公開リストの12メンバー、撮影日の表記
- YouTube: `Update YouTube feed` のログ、チャンネルフィード、JSONの最終更新日時
- SharePoint: GitHub Pagesドメインの許可、HTTPS、iframe高さ、組織ポリシー

## セキュリティ

公開SNS情報だけを置きます。アクセストークン、APIキー、SNSログイン情報、SharePoint内部URL、社内限定画像をコミットしないでください。
