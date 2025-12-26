# エクスポート機能の追加手順

## 📤 追加する機能
完了ログを生成AIに渡しやすい形式でエクスポートできます。

## 🔧 追加が必要なファイル

### 1. `index.html` - すでに更新済み ✅
- エクスポートボタン（📤）を追加
- エクスポートモーダルを追加

### 2. `styles.css` - 以下を末尾に追加

```css
/* エクスポート関連 */
.export-info {
    font-size: 14px;
    color: #666;
    margin-bottom: 16px;
    line-height: 1.5;
}

.export-options {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.btn-secondary {
    width: 100%;
    padding: 12px;
    background-color: #fff;
    color: #007AFF;
    border: 2px solid #007AFF;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
}

.btn-secondary:active {
    background-color: #f0f0f0;
}

.export-preview {
    margin-top: 16px;
}
```

### 3. `app.js` - 以下を追加

**追加場所1: constructor の最後（`this.render();` の後）に追加:**
```javascript
        this.initExportFeature();
```

**追加場所2: ファイルの末尾（`// アプリ起動` の直前）に追加:**

完全なコードは `F:\claude\06_MEMO\export-addon.js` として保存しました。

## 📋 手動での追加手順

1. `styles.css` を開く
2. 末尾に上記CSSを追加
3. `app.js` を開く
4. constructor の `this.render();` の後に `this.initExportFeature();` を追加
5. ファイル末尾に `export-addon.js` の内容をコピー

## 🚀 使い方

1. 完了ログ画面で右上の「📤」ボタンをタップ
2. 4つの選択肢から選ぶ:
   - **テキスト形式でコピー** - クリップボードにコピー（生成AIに貼り付け可能）
   - **JSON形式でコピー** - JSON形式でコピー
   - **テキストファイルをダウンロード** - .txtファイルとして保存
   - **JSONファイルをダウンロード** - .jsonファイルとして保存

## 📝 エクスポート形式（テキスト）

```
# 完了ログ

エクスポート日時: 2025/12/26 13:45:00
完了タスク数: 10件

---

## 1. ea - ブレイク型_XXXの改善

完了日時: 2025-12-26 10:30

---

## 2. 買い物
牛乳
卵

完了日時: 2025-12-26 09:15

---
```

このフォーマットで生成AIに貼り付けて分析依頼できます！
