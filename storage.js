/**
 * LocalStorage管理クラス
 * データの保存・読み込み・更新を担当
 */
class Storage {
    constructor() {
        this.STORAGE_KEY = 'thoughtMemo';
        this.VERSION = 1;
    }

    /**
     * 初期データ構造（デフォルトメモ帳付き）
     */
    getInitialData() {
        const now = new Date().toISOString();
        
        // デフォルトの使い方メモ帳
        const welcomeNotebook = {
            id: this.generateId(),
            content: `メモ帳へようこそ！

-- iPhone でアプリとして使う
Safari で開いて、共有ボタン → ホーム画面に追加
アプリのようにオフラインでも使えます！

-- 基本的な使い方
メモを自由に書いてください
タスクにしたい行の左側（ガター）をタップすると ▶ マークが付きます
もう一度タップすると ✓ マーク（完了）になります
右上の ✓ ボタンで完了タスクをログに移動できます

-- カテゴリ機能（任意）
カテゴリ タスクの内容
→ 完了ログには「カテゴリ - タスクの内容」と記録されます

-- ブロックの分割
空行を入れると別のタスクとして分かれます

タスク1の内容
詳細説明

タスク2の内容

-- 管理対象外
「--」で始まる行は管理対象外です
区切りやメモとして使えます

-- 削除方法
【iPhone】左にスワイプで削除
【PC】右側の×ボタンで削除
完了ログも同じ方法で削除できます

-- このメモについて
このメモ帳は削除してOKです`,
            created_at: now,
            updated_at: now,
            order: 0
        };
        
        return {
            version: this.VERSION,
            notebooks: [welcomeNotebook],
            logs: []
        };
    }

    /**
     * データ全体を取得
     */
    load() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            if (!data) {
                // 初回起動時は初期データを保存してから返す
                const initialData = this.getInitialData();
                this.save(initialData);
                return initialData;
            }
            const parsed = JSON.parse(data);
            // バージョンチェック（将来のマイグレーション用）
            if (parsed.version !== this.VERSION) {
                console.warn('Data version mismatch. Migration may be needed.');
            }
            return parsed;
        } catch (error) {
            console.error('Failed to load data:', error);
            return this.getInitialData();
        }
    }

    /**
     * データ全体を保存
     */
    save(data) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Failed to save data:', error);
            return false;
        }
    }

    /**
     * 新しいメモ帳を作成
     */
    createNotebook() {
        const data = this.load();
        const now = new Date().toISOString();
        const maxOrder = data.notebooks.length > 0 
            ? Math.max(...data.notebooks.map(n => n.order))
            : -1;
        
        const notebook = {
            id: this.generateId(),
            content: '',
            created_at: now,
            updated_at: now,
            order: maxOrder + 1
        };
        
        data.notebooks.unshift(notebook); // 先頭に追加
        // order を再計算
        data.notebooks.forEach((n, index) => {
            n.order = index;
        });
        
        this.save(data);
        return notebook;
    }

    /**
     * メモ帳を更新
     */
    updateNotebook(id, content) {
        const data = this.load();
        const notebook = data.notebooks.find(n => n.id === id);
        if (notebook) {
            notebook.content = content;
            notebook.updated_at = new Date().toISOString();
            this.save(data);
            return true;
        }
        return false;
    }

    /**
     * メモ帳を削除
     */
    deleteNotebook(id) {
        const data = this.load();
        const index = data.notebooks.findIndex(n => n.id === id);
        if (index !== -1) {
            data.notebooks.splice(index, 1);
            // order を再計算
            data.notebooks.forEach((n, idx) => {
                n.order = idx;
            });
            this.save(data);
            return true;
        }
        return false;
    }

    /**
     * メモ帳の並び順を更新
     */
    reorderNotebooks(notebookIds) {
        const data = this.load();
        const notebookMap = new Map(data.notebooks.map(n => [n.id, n]));
        
        data.notebooks = notebookIds
            .map(id => notebookMap.get(id))
            .filter(n => n !== undefined);
        
        data.notebooks.forEach((n, index) => {
            n.order = index;
        });
        
        this.save(data);
    }

    /**
     * メモ帳を取得（ID指定）
     */
    getNotebook(id) {
        const data = this.load();
        return data.notebooks.find(n => n.id === id);
    }

    /**
     * 全メモ帳を取得（order順）
     */
    getAllNotebooks() {
        const data = this.load();
        return data.notebooks.sort((a, b) => a.order - b.order);
    }

    /**
     * 完了ログを追加
     */
    addLog(notebookId, text, category = null) {
        const data = this.load();
        
        // カテゴリがある場合は整形
        let logText = text;
        if (category) {
            logText = `${category} - ${text}`;
        }
        
        const log = {
            id: this.generateId(),
            notebook_id: notebookId,
            text: logText,
            completed_at: new Date().toISOString()
        };
        
        data.logs.unshift(log); // 新しい順
        this.save(data);
        return log;
    }

    /**
     * 完了ログを削除
     */
    deleteLog(id) {
        const data = this.load();
        const index = data.logs.findIndex(l => l.id === id);
        if (index !== -1) {
            const log = data.logs[index];
            data.logs.splice(index, 1);
            this.save(data);
            return log;
        }
        return null;
    }

    /**
     * 全完了ログを取得（新しい順）
     */
    getAllLogs() {
        const data = this.load();
        return data.logs;
    }

    /**
     * UUID生成（簡易版）
     */
    generateId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}

// グローバルインスタンス
const storage = new Storage();
