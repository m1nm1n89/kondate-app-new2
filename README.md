# 献立提案アプリ

冷蔵庫にある食材を入力すると、献立案を提案する Next.js アプリです。  
現在は API キー未設定でも確認できるよう、サーバー側でダミーの3パターン献立からランダム返却する実装になっています。

## 技術スタック

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- API Route Handler (`app/api/suggest/route.ts`)

## 必要なもの

- Node.js 18 以上
- npm

## インストール手順

```bash
npm install
```

## `.env.local` の作り方

プロジェクト直下に `.env.local` を作成して、以下を設定してください。

```env
ANTHROPIC_API_KEY=ここにAnthropicのAPIキーを貼り付ける
```

> `.env.local` は `.gitignore` に含まれており、Git 管理されません。

## 開発サーバー起動

```bash
npm run dev
```

ブラウザで `http://localhost:3000` を開きます。

## ビルド確認

```bash
npm run build
```

## Vercel へのデプロイ

1. GitHub などにリポジトリを push
2. Vercel ダッシュボードで `New Project` から対象リポジトリを選択
3. `Environment Variables` に以下を追加
   - `ANTHROPIC_API_KEY` = Anthropic の API キー
4. Deploy 実行

### 環境変数設定の補足

- Preview / Production どちらにも `ANTHROPIC_API_KEY` を設定してください。
- API キーはサーバー側 Route Handler でのみ利用し、ブラウザには渡しません。

## セキュリティ方針

- API キーは `.env.local` のみで管理
- 入力はクライアントとサーバーの両方で検証（空文字・500文字超を拒否）
- サーバーにユーザー入力を保存しないステートレス実装
- エラーメッセージは固定文言のみ返却

