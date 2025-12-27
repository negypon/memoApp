/**
 * メインアプリケーションクラス
 */
class App {
    constructor() {
        this.currentNotebookId = null;
        this.currentLogId = null;
        
        this.initElements();
        this.bindEvents();
        this.render();
        this.initExportFeature();
    }

    /**
     * DOM要素の初期化
     */
    initElements() {
        // 画面
        this.listScreen = document.getElementById('list-screen');
        this.editScreen = document.getElementById('edit-screen');
        this.logScreen = document.getElementById('log-screen');
        
        // メモ帳一覧
        this.notebookList = document.getElementById('notebook-list');
        this.btnAdd = document.getElementById('btn-add');
        
        // 編集画面
        this.btnBack = document.getElementById('btn-back');
        this.btnComplete = document.getElementById('btn-complete');
        this.editTitle = document.getElementById('edit-title');
        this.gutter = document.getElementById('gutter');
        this.editor = document.getElementById('editor');
        
        // 完了ログ
        this.btnLogBack = document.getElementById('btn-log-back');
        this.logList = document.getElementById('log-list');
        
        // モーダル
        this.logModal = document.getElementById('log-modal');
        this.btnModalClose = document.getElementById('btn-modal-close');
        this.logDetailText = document.getElementById('log-detail-text');
        this.logDetailDate = document.getElementById('log-detail-date');
        this.btnRestore = document.getElementById('btn-restore');
        
        // ナビゲーション
        this.navList = document.getElementById('nav-list');
        this.navLog = document.getElementById('nav-log');
    }

    /**
     * イベントバインディング
     */
    bindEvents() {
        // メモ帳一覧
        this.btnAdd.addEventListener('click', () => this.createNotebook());
        
        // 編集画面
        this.btnBack.addEventListener('click', () => this.saveAndBackToList());
        this.btnComplete.addEventListener('click', () => this.completeBlocks());
        this.editor.addEventListener('input', () => this.updateGutter());
        this.editor.addEventListener('scroll', () => this.syncGutterScroll());
        
        // 完了ログ
        this.btnLogBack.addEventListener('click', () => this.showListScreen());
        
        // モーダル
        this.btnModalClose.addEventListener('click', () => this.closeModal());
        this.btnRestore.addEventListener('click', () => this.restoreLog());
        this.logModal.addEventListener('click', (e) => {
            if (e.target === this.logModal) {
                this.closeModal();
            }
        });
        
        // ナビゲーション
        this.navList.addEventListener('click', () => this.showListScreen());
        this.navLog.addEventListener('click', () => this.showLogScreen());
    }

    /**
     * 画面遷移
     */
    showScreen(screen) {
        [this.listScreen, this.editScreen, this.logScreen].forEach(s => {
            s.classList.remove('active');
        });
        screen.classList.add('active');
        
        // ナビゲーション更新
        [this.navList, this.navLog].forEach(nav => {
            nav.classList.remove('active');
        });
        
        if (screen === this.listScreen) {
            this.navList.classList.add('active');
        } else if (screen === this.logScreen) {
            this.navLog.classList.add('active');
        }
    }

    showListScreen() {
        this.showScreen(this.listScreen);
        this.renderNotebookList();
    }

    showEditScreen(notebookId) {
        this.currentNotebookId = notebookId;
        this.showScreen(this.editScreen);
        this.loadNotebook(notebookId);
    }

    showLogScreen() {
        this.showScreen(this.logScreen);
        this.renderLogList();
    }

    /**
     * 初期レンダリング
     */
    render() {
        this.renderNotebookList();
    }

    /**
     * メモ帳一覧を描画
     */
    renderNotebookList() {
        const notebooks = storage.getAllNotebooks();
        
        if (notebooks.length === 0) {
            this.notebookList.innerHTML = '<div class="empty-state">メモ帳がありません<br>右上の + ボタンで作成できます</div>';
            return;
        }
        
        this.notebookList.innerHTML = notebooks.map(notebook => {
            const firstLine = this.getFirstLine(notebook.content);
            const displayTitle = firstLine || '（空白のメモ）';
            const isEmptyClass = firstLine ? '' : ' empty';
            const date = this.formatDate(notebook.updated_at);
            
            return `
                <div class="notebook-item" data-id="${notebook.id}">
                    <div class="notebook-title${isEmptyClass}">${this.escapeHtml(displayTitle)}</div>
                    <div class="notebook-date">${date}</div>
                </div>
            `;
        }).join('');
        
        // イベント追加
        this.notebookList.querySelectorAll('.notebook-item').forEach(item => {
            this.setupNotebookItemEvents(item);
        });
    }

    /**
     * メモ帳アイテムのイベント設定（長押しドラッグ + スワイプ削除）
     */
    setupNotebookItemEvents(item) {
        let startX = 0;
        let startY = 0;
        let currentX = 0;
        let currentY = 0;
        let isSwiping = false;
        let isDragging = false;
        let longPressTimer = null;
        let draggedElement = null;
        let placeholder = null;

        const handleTouchStart = (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            currentX = startX;
            currentY = startY;
            isSwiping = false;
            isDragging = false;
            
            // 長押し検出（500ms）
            longPressTimer = setTimeout(() => {
                isDragging = true;
                startDrag(item, e.touches[0]);
            }, 500);
        };

        const handleTouchMove = (e) => {
            currentX = e.touches[0].clientX;
            currentY = e.touches[0].clientY;
            const diffX = startX - currentX;
            const diffY = Math.abs(startY - currentY);
            
            // ドラッグ中
            if (isDragging && draggedElement) {
                e.preventDefault();
                moveDragElement(e.touches[0]);
                updatePlaceholderPosition(e.touches[0]);
                return;
            }
            
            // 長押しタイマーキャンセル（動き始めたら）
            if (diffY > 10 || Math.abs(diffX) > 10) {
                clearTimeout(longPressTimer);
            }
            
            // 横スワイプ判定（縦移動が少ない場合のみ）
            if (!isDragging && diffY < 30) {
                isSwiping = true;
                if (diffX > 80) {
                    item.classList.add('deleting');
                } else {
                    item.classList.remove('deleting');
                }
            }
        };

        const handleTouchEnd = (e) => {
            clearTimeout(longPressTimer);
            
            // ドラッグ終了
            if (isDragging) {
                endDrag();
                return;
            }
            
            // スワイプ削除
            if (isSwiping) {
                const diffX = startX - currentX;
                if (diffX > 80) {
                    if (confirm('このメモ帳を削除しますか？')) {
                        const id = item.dataset.id;
                        storage.deleteNotebook(id);
                        this.renderNotebookList();
                    } else {
                        item.classList.remove('deleting');
                    }
                } else {
                    item.classList.remove('deleting');
                }
                return;
            }
            
            // 通常のタップ（移動量が少ない場合のみ）
            const moveDistance = Math.sqrt(Math.pow(currentX - startX, 2) + Math.pow(currentY - startY, 2));
            if (moveDistance < 10) {
                const id = item.dataset.id;
                this.showEditScreen(id);
            }
        };

        const startDrag = (element, touch) => {
            // ドラッグ用の複製要素を作成
            draggedElement = element.cloneNode(true);
            draggedElement.classList.add('dragging');
            draggedElement.style.position = 'fixed';
            draggedElement.style.width = element.offsetWidth + 'px';
            draggedElement.style.zIndex = '1000';
            draggedElement.style.opacity = '0.8';
            draggedElement.style.pointerEvents = 'none';
            document.body.appendChild(draggedElement);
            
            // プレースホルダー作成
            placeholder = document.createElement('div');
            placeholder.className = 'notebook-item placeholder';
            placeholder.style.height = element.offsetHeight + 'px';
            element.parentNode.insertBefore(placeholder, element);
            element.style.opacity = '0';
            
            moveDragElement(touch);
        };

        const moveDragElement = (touch) => {
            if (!draggedElement) return;
            
            const rect = draggedElement.getBoundingClientRect();
            draggedElement.style.left = (touch.clientX - rect.width / 2) + 'px';
            draggedElement.style.top = (touch.clientY - rect.height / 2) + 'px';
        };

        const updatePlaceholderPosition = (touch) => {
            const items = Array.from(this.notebookList.querySelectorAll('.notebook-item:not(.dragging)'));
            const y = touch.clientY;
            
            let targetItem = null;
            let minDistance = Infinity;
            
            items.forEach(item => {
                if (item === placeholder || item.style.opacity === '0') return;
                
                const rect = item.getBoundingClientRect();
                const centerY = rect.top + rect.height / 2;
                const distance = Math.abs(y - centerY);
                
                if (distance < minDistance) {
                    minDistance = distance;
                    targetItem = item;
                }
            });
            
            if (targetItem && placeholder) {
                const rect = targetItem.getBoundingClientRect();
                if (y < rect.top + rect.height / 2) {
                    targetItem.parentNode.insertBefore(placeholder, targetItem);
                } else {
                    targetItem.parentNode.insertBefore(placeholder, targetItem.nextSibling);
                }
            }
        };

        const endDrag = () => {
            if (draggedElement) {
                draggedElement.remove();
                draggedElement = null;
            }
            
            if (placeholder) {
                const items = Array.from(this.notebookList.querySelectorAll('.notebook-item:not(.placeholder)'));
                const newOrder = items.map(el => el.dataset.id);
                
                // 並び順を保存
                storage.reorderNotebooks(newOrder);
                
                placeholder.remove();
                placeholder = null;
            }
            
            item.style.opacity = '';
            isDragging = false;
            
            // 再描画
            this.renderNotebookList();
        };

        item.addEventListener('touchstart', handleTouchStart);
        item.addEventListener('touchmove', handleTouchMove);
        item.addEventListener('touchend', handleTouchEnd);
        
        // マウスクリック対応（Windows/デスクトップ用）
        item.addEventListener('click', (e) => {
            const id = item.dataset.id;
            this.showEditScreen(id);
        });
        
    }

    /**
     * メモ帳を作成
     */
    createNotebook() {
        const notebook = storage.createNotebook();
        this.showEditScreen(notebook.id);
    }

    /**
     * メモ帳を読み込んで編集画面に表示
     */
    loadNotebook(id) {
        const notebook = storage.getNotebook(id);
        if (!notebook) return;
        
        this.editor.value = notebook.content;
        
        // タイトル更新
        const firstLine = this.getFirstLine(notebook.content);
        this.editTitle.textContent = firstLine || '（空白のメモ）';
        
        this.updateGutter();
    }

    /**
     * 保存して一覧に戻る
     */
    saveAndBackToList() {
        if (this.currentNotebookId) {
            storage.updateNotebook(this.currentNotebookId, this.editor.value);
        }
        this.showListScreen();
    }

    /**
     * ガターを更新
     */
    updateGutter() {
        const text = this.editor.value;
        const lines = text.split('\n');
        const blocks = blockManager.parseBlocks(text);
        
        // タイトルも更新
        const firstLine = this.getFirstLine(text);
        this.editTitle.textContent = firstLine || '（空白のメモ）';
        
        // ガターの行数を合わせる
        this.gutter.innerHTML = lines.map((line, index) => {
            const block = blocks.find(b => index >= b.startLine && index <= b.endLine);
            const isBlockStart = block && block.startLine === index;
            const isExcluded = blockManager.isExcludedLine(line);
            
            let symbol = '';
            let stateClass = 'state-none';
            
            if (isBlockStart && block) {
                symbol = blockManager.getGutterSymbol(block.state, isExcluded);
                if (isExcluded) {
                    stateClass = 'state-excluded';
                } else if (block.state === blockManager.STATE_NORMAL) {
                    stateClass = 'state-normal';
                } else if (block.state === blockManager.STATE_COMPLETE) {
                    stateClass = 'state-complete';
                }
            } else if (isExcluded) {
                stateClass = 'state-excluded';
            }
            
            return `<div class="gutter-line ${stateClass}" data-line="${index}">${symbol}</div>`;
        }).join('');
        
        // ガタークリックイベント
        this.gutter.querySelectorAll('.gutter-line').forEach(line => {
            line.addEventListener('click', () => {
                const lineNumber = parseInt(line.dataset.line);
                this.toggleBlockState(lineNumber);
            });
        });
    }

    /**
     * ガターのスクロール同期
     */
    syncGutterScroll() {
        this.gutter.scrollTop = this.editor.scrollTop;
    }

    /**
     * ブロック状態を切り替え
     */
    toggleBlockState(lineNumber) {
        const newText = blockManager.toggleBlockState(this.editor.value, lineNumber);
        this.editor.value = newText;
        this.updateGutter();
    }

    /**
     * 完了処理
     */
    completeBlocks() {
        const text = this.editor.value;
        const completedBlocks = blockManager.extractCompletedBlocks(text);
        
        if (completedBlocks.length === 0) {
            // 何もしない（メモ帳なので）
            this.saveAndBackToList();
            return;
        }
        
        // 完了ログに追加
        completedBlocks.forEach(block => {
            storage.addLog(this.currentNotebookId, block.text, block.category);
        });
        
        // 完了ブロックを削除
        const newText = blockManager.removeCompletedBlocks(text);
        this.editor.value = newText;
        
        // 保存
        storage.updateNotebook(this.currentNotebookId, newText);
        
        // 一覧に戻る
        this.showListScreen();
    }

    /**
     * 完了ログ一覧を描画
     */
    renderLogList() {
        const logs = storage.getAllLogs();
        
        if (logs.length === 0) {
            this.logList.innerHTML = '<div class="empty-state">完了ログがありません</div>';
            return;
        }
        
        this.logList.innerHTML = logs.map(log => {
            const date = this.formatDateTime(log.completed_at);
            
            return `
                <div class="log-item" data-id="${log.id}">
                    <div class="log-text">${this.escapeHtml(log.text)}</div>
                    <div class="log-date">${date}</div>
                </div>
            `;
        }).join('');
        
        // クリックイベント
        this.logList.querySelectorAll('.log-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = item.dataset.id;
                this.showLogDetail(id);
            });
        });
    }

    /**
     * ログ詳細モーダルを表示
     */
    showLogDetail(logId) {
        this.currentLogId = logId;
        const logs = storage.getAllLogs();
        const log = logs.find(l => l.id === logId);
        
        if (!log) return;
        
        this.logDetailText.textContent = log.text;
        this.logDetailDate.textContent = this.formatDateTime(log.completed_at);
        this.logModal.classList.add('active');
    }

    /**
     * モーダルを閉じる
     */
    closeModal() {
        this.logModal.classList.remove('active');
        this.currentLogId = null;
    }

    /**
     * ログを復帰
     */
    restoreLog() {
        if (!this.currentLogId) return;
        
        const log = storage.deleteLog(this.currentLogId);
        if (!log) return;
        
        // 元のメモ帳を取得
        const notebook = storage.getNotebook(log.notebook_id);
        if (!notebook) {
            alert('元のメモ帳が見つかりません');
            this.closeModal();
            return;
        }
        
        // メモ帳の末尾に追記
        let newContent = notebook.content;
        if (newContent.trim()) {
            newContent += '\n\n';
        }
        newContent += log.text;
        
        storage.updateNotebook(log.notebook_id, newContent);
        
        // モーダルを閉じてログ一覧を更新
        this.closeModal();
        this.renderLogList();
    }

    /**
     * ユーティリティ: 1行目を取得
     */
    getFirstLine(text) {
        if (!text) return '';
        const lines = text.split('\n');
        const firstLine = lines[0].trim();
        // 不可視トークンを除去
        return blockManager.removeMarker(firstLine);
    }

    /**
     * ユーティリティ: 日付フォーマット
     */
    formatDate(isoString) {
        const date = new Date(isoString);
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (days === 0) {
            return '今日';
        } else if (days === 1) {
            return '昨日';
        } else if (days < 7) {
            return `${days}日前`;
        } else {
            return `${date.getMonth() + 1}/${date.getDate()}`;
        }
    }

    /**
     * ユーティリティ: 日時フォーマット（絶対時間）
     */
    formatDateTime(isoString) {
        const date = new Date(isoString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        return `${year}-${month}-${day} ${hours}:${minutes}`;
    }

    /**
     * ユーティリティ: HTMLエスケープ
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// エクスポート機能を追加
App.prototype.initExportFeature = function() {
    const btnExport = document.getElementById('btn-export');
    const exportModal = document.getElementById('export-modal');
    const btnExportClose = document.getElementById('btn-export-close');
    const btnExportText = document.getElementById('btn-export-text');
    const btnExportJson = document.getElementById('btn-export-json');
    const btnDownloadText = document.getElementById('btn-download-text');
    const btnDownloadJson = document.getElementById('btn-download-json');
    const exportPreview = document.getElementById('export-preview');
    
    const self = this; // thisを保存
    
    btnExport.addEventListener('click', () => {
        exportModal.classList.add('active');
        updatePreview();
    });
    
    btnExportClose.addEventListener('click', () => {
        exportModal.classList.remove('active');
    });
    
    exportModal.addEventListener('click', (e) => {
        if (e.target === exportModal) {
            exportModal.classList.remove('active');
        }
    });
    
    const updatePreview = () => {
        const logs = storage.getAllLogs();
        if (logs.length === 0) {
            exportPreview.innerHTML = '<div class="empty-state">エクスポートするログがありません</div>';
            return;
        }
        
        const text = generateText(logs);
        exportPreview.innerHTML = `
            <div style="margin-top: 16px;">
                <strong>プレビュー（テキスト形式）:</strong>
                <pre style="background: #f0f0f0; padding: 12px; border-radius: 4px; max-height: 200px; overflow-y: auto; font-size: 12px; white-space: pre-wrap;">${self.escapeHtml(text.substring(0, 500))}${text.length > 500 ? '\n...' : ''}</pre>
            </div>
        `;
    };
    
    const generateText = (logs) => {
        let text = '# 完了ログ\n\n';
        text += `エクスポート日時: ${new Date().toLocaleString('ja-JP')}\n`;
        text += `完了タスク数: ${logs.length}件\n\n---\n\n`;
        
        logs.forEach((log, index) => {
            text += `## ${index + 1}. ${log.text.split('\n')[0]}\n\n`;
            if (log.text.split('\n').length > 1) {
                text += log.text.split('\n').slice(1).join('\n') + '\n\n';
            }
            text += `完了日時: ${self.formatDateTime(log.completed_at)}\n\n---\n\n`;
        });
        
        return text;
    };
    
    const generateJSON = (logs) => {
        return JSON.stringify({
            exported_at: new Date().toISOString(),
            total_count: logs.length,
            logs: logs.map(log => ({
                text: log.text,
                completed_at: log.completed_at
            }))
        }, null, 2);
    };
    
    btnExportText.addEventListener('click', async () => {
        const logs = storage.getAllLogs();
        const text = generateText(logs);
        try {
            await navigator.clipboard.writeText(text);
            alert('テキスト形式でクリップボードにコピーしました！');
            exportModal.classList.remove('active');
        } catch (error) {
            alert('コピーに失敗しました。ブラウザの設定を確認してください。');
        }
    });
    
    btnExportJson.addEventListener('click', async () => {
        const logs = storage.getAllLogs();
        const json = generateJSON(logs);
        try {
            await navigator.clipboard.writeText(json);
            alert('JSON形式でクリップボードにコピーしました！');
            exportModal.classList.remove('active');
        } catch (error) {
            alert('コピーに失敗しました。ブラウザの設定を確認してください。');
        }
    });
    
    btnDownloadText.addEventListener('click', () => {
        const logs = storage.getAllLogs();
        const text = generateText(logs);
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `completed-logs-${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        exportModal.classList.remove('active');
    });
    
    btnDownloadJson.addEventListener('click', () => {
        const logs = storage.getAllLogs();
        const json = generateJSON(logs);
        const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `completed-logs-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        exportModal.classList.remove('active');
    });
};

// アプリ起動
document.addEventListener('DOMContentLoaded', () => {
    new App();
});
