# SharePoint埋め込み手順

## GitHub Pages URL

公開URL:

```text
https://karihaji.github.io/ichimaru-sns-feed/?embed=1
```

初期タブを指定する場合は `&tab=x`、`&tab=instagram`、`&tab=youtube` を追加します。

## iframeコード

```html
<iframe
  src="https://karihaji.github.io/ichimaru-sns-feed/?embed=1"
  width="100%"
  height="620"
  style="border:0;display:block;overflow:hidden;"
  loading="lazy"
  title="市丸グループ公式SNSフィード"
  referrerpolicy="strict-origin-when-cross-origin">
</iframe>
```

## 設置

1. SharePointページを編集します。
2. 「公式SNS・最新発信」の直下に「埋め込み」Webパーツを追加します。
3. GitHub Pages URLまたは上記iframeを設定します。
4. PCとスマートフォンのプレビューを確認して公開します。

## 確認項目

- GitHub Pages URLがHTTPSで直接表示できる
- 組織のHTMLフィールドセキュリティで `ACCOUNT.github.io` が許可されている
- タブがマウス、タッチ、Tabキー、左右矢印キーで操作できる
- 320px相当の幅で横スクロールしない
- Instagramが横スワイプできる
- Xタブで公開リストのHOME画面カードが表示され、クリックでXを開ける
- 高さ620pxで下部の「公式アカウント一覧」まで表示される

ドメイン許可エラー時はSharePoint管理者へGitHub Pagesドメインの許可を依頼します。組織ポリシーで外部iframeが禁止されている場合、ページ側のコードだけでは解除できません。

## 二重スクロールの調整

推奨高さは620pxです。SharePointテーマやWebパーツ余白で下端が切れる場合は、iframeの `height` を20px単位で増やします。余白が大きい場合は減らします。Xタイムライン内部のスクロールは仕様であり、外側ページの不要なスクロールとは区別してください。

## カスタムドメイン

将来 `social.ichimaru-grp.jp` 等へ変更する場合は、GitHub Pagesの `Settings > Pages > Custom domain` とDNSを設定し、HTTPS発行後にiframeの `src` とSharePointの許可ドメインを変更します。
