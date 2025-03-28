# labelmake から pdfme へのテンプレート変換ツール

このツールは [labelmake.jp](https://labelmake.jp/) から [pdfme](https://app.pdfme.com/) へのテンプレート移行を支援するウェブアプリケーションです。

## 機能

- labelmake APIを使用してテンプレート一覧を取得
- labelmakeのテンプレート形式をpdfme形式に変換
- pdfme APIを使用してテンプレートを登録
- テンプレートのスキーマ編集
- APIキーの保存（セッションストレージ）

## 使い方

### オンラインデモ

このツールは GitHub Pages で公開されています：
[https://[ユーザー名].github.io/[リポジトリ名]/](https://[ユーザー名].github.io/[リポジトリ名]/)

### 基本的な使い方

1. **APIキーの設定**
   - labelmake APIキーを入力して、テンプレート一覧を取得できます
   - pdfme APIキーを入力して、変換したテンプレートを登録できます

2. **テンプレートの選択と変換**
   - 「labelmakeのテンプレート一覧を読み込む」ボタンをクリックして、既存のテンプレートを表示
   - 一覧から変換したいテンプレートを選択

3. **テンプレート情報の編集**
   - テンプレート名、説明、タグを編集
   - 必要に応じてスキーマを修正

4. **pdfmeへの登録**
   - 「pdfmeにテンプレートを登録する」ボタンをクリックして変換したテンプレートを登録

## 技術仕様

- 純粋なHTML/CSS/JavaScriptで実装
- 外部ライブラリやフレームワークに依存しない
- ブラウザのセッションストレージを使用してAPIキーを一時保存
- labelmakeとpdfmeのAPIと連携

## セキュリティ

- APIキーはブラウザのセッションストレージにのみ保存され、サーバーには送信されません
- すべての処理はクライアントサイドで行われます

## 開発者向け情報

### ファイル構成

- `index.html` - メインのHTMLファイル
- `style.css` - スタイルシート
- `script.js` - アプリケーションロジック

### テンプレート変換ロジック

このツールは以下の変換を行います：

1. labelmakeのフィールド形式をpdfmeのフィールド形式に変換
2. フィールドタイプのマッピング（text, image, qrcode等）
3. ポジション、サイズ、フォント設定などの属性変換
4. ベースPDFの変換とbase64エンコード

## GitHub Pagesへのデプロイ方法

このリポジトリをフォークまたはクローンした後、以下の手順でGitHub Pagesにデプロイできます：

1. リポジトリの「Settings」タブを開く
2. 左側のメニューから「Pages」を選択
3. 「Source」セクションで「Deploy from a branch」を選択
4. ブランチを「main」（または「master」）に設定し、フォルダを「/ (root)」に設定
5. 「Save」ボタンをクリック

数分後に、あなたのサイトが `https://[ユーザー名].github.io/[リポジトリ名]/` で公開されます。

## ライセンス

MITライセンス
