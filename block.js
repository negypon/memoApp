/**
 * ブロック管理クラス
 * 不可視トークンを使ってブロックの位置を追従
 */
class BlockManager {
    constructor() {
        // 不可視トークンのマーカー（短縮版）
        this.TOKEN_START = '\u200B'; // ゼロ幅スペース
        this.TOKEN_END = '\u200B';
        
        // ブロック状態（短縮）
        this.STATE_NONE = 'n';        // 未指定
        this.STATE_NORMAL = 'r';      // 通常（▶）regular
        this.STATE_COMPLETE = 'c';    // 完了（✓）complete
        this.STATE_EXCLUDED = 'x';    // 管理対象外（--始まり）excluded
    }

    /**
     * テキストを解析してブロック情報を抽出
     * 空行でブロックを分割
     */
    parseBlocks(text) {
        const lines = text.split('\n');
        const blocks = [];
        let currentBlock = null;

        lines.forEach((line, index) => {
            const isEmpty = line.trim() === '';
            const marker = this.extractMarker(line);
            
            // 空行が出たら現在のブロックを終了
            if (isEmpty && currentBlock) {
                blocks.push(currentBlock);
                currentBlock = null;
                return;
            }
            
            // 空行はスキップ
            if (isEmpty) {
                return;
            }
            
            // マーカーがあるか、最初の行なら新しいブロック開始
            if (marker || currentBlock === null) {
                if (currentBlock) {
                    blocks.push(currentBlock);
                }
                
                currentBlock = {
                    startLine: index,
                    endLine: index,
                    state: marker ? marker.state : this.STATE_NONE,
                    id: marker ? marker.id : null,
                    lines: [line],
                    isExcluded: this.isExcludedLine(line)
                };
            } else if (currentBlock) {
                // 既存のブロックに追加
                currentBlock.endLine = index;
                currentBlock.lines.push(line);
            }
        });

        if (currentBlock) {
            blocks.push(currentBlock);
        }

        return blocks;
    }

    /**
     * 行が管理対象外か判定（-- で始まる）
     */
    isExcludedLine(line) {
        return line.trim().startsWith('--');
    }

    /**
     * 不可視マーカーを抽出
     */
    extractMarker(line) {
        const regex = new RegExp(`${this.TOKEN_START}\\[([^\\]]+)\\]${this.TOKEN_END}`, 'g');
        const match = regex.exec(line);
        
        if (match) {
            const parts = match[1].split(':');
            return {
                id: parts[0],
                state: parts[1] || this.STATE_NORMAL
            };
        }
        
        return null;
    }

    /**
     * 行にマーカーを埋め込む（短縮版）
     */
    embedMarker(line, id, state) {
        // 既存のマーカーを削除
        const cleaned = this.removeMarker(line);
        // 新しいマーカーを行末に追加（短縮形式: [id:s]）
        return `${cleaned}${this.TOKEN_START}[${id}:${state}]${this.TOKEN_END}`;
    }

    /**
     * 行からマーカーを削除
     */
    removeMarker(line) {
        const regex = new RegExp(`${this.TOKEN_START}\\[[^\\]]+\\]${this.TOKEN_END}`, 'g');
        return line.replace(regex, '');
    }

    /**
     * ブロックの状態を切り替え
     */
    toggleBlockState(text, lineNumber) {
        const lines = text.split('\n');
        if (lineNumber >= lines.length) return text;

        const line = lines[lineNumber];
        
        // 管理対象外の行は切り替えない
        if (this.isExcludedLine(line)) {
            return text;
        }

        const marker = this.extractMarker(line);
        let newState;
        let id;

        if (!marker) {
            // 未指定 → 通常
            newState = this.STATE_NORMAL;
            id = this.generateBlockId();
        } else {
            id = marker.id;
            // 状態を循環
            if (marker.state === this.STATE_NORMAL || marker.state === 'normal') {
                newState = this.STATE_COMPLETE;
            } else if (marker.state === this.STATE_COMPLETE || marker.state === 'complete') {
                // 完了 → 未指定（マーカー削除）
                lines[lineNumber] = this.removeMarker(line);
                return lines.join('\n');
            } else {
                newState = this.STATE_NORMAL;
            }
        }

        lines[lineNumber] = this.embedMarker(line, id, newState);
        return lines.join('\n');
    }

    /**
     * 完了ブロックを抽出
     */
    extractCompletedBlocks(text) {
        const blocks = this.parseBlocks(text);
        const completed = [];

        blocks.forEach(block => {
            const isComplete = block.state === this.STATE_COMPLETE || block.state === 'complete';
            if (isComplete && !block.isExcluded) {
                // マーカーを削除したテキストを取得
                const cleanLines = block.lines.map(line => this.removeMarker(line));
                const blockText = cleanLines.join('\n');
                
                // カテゴリを抽出
                const { category, text: mainText } = this.extractCategory(blockText);
                
                completed.push({
                    text: mainText,
                    category: category,
                    originalText: blockText
                });
            }
        });

        return completed;
    }

    /**
     * カテゴリを抽出（先頭行の最初の単語）
     */
    extractCategory(text) {
        const lines = text.split('\n');
        const firstLine = lines[0].trim();
        
        // スペースで分割
        const parts = firstLine.split(/\s+/);
        
        if (parts.length >= 2) {
            const category = parts[0];
            const rest = parts.slice(1).join(' ');
            
            // カテゴリ部分を除いたテキストを再構築
            const remainingLines = [rest, ...lines.slice(1)];
            
            return {
                category: category,
                text: remainingLines.join('\n').trim()
            };
        }
        
        return {
            category: null,
            text: text
        };
    }

    /**
     * 完了ブロックをテキストから削除
     */
    removeCompletedBlocks(text) {
        const blocks = this.parseBlocks(text);
        const lines = text.split('\n');
        const remainingLines = [];

        let currentIndex = 0;
        blocks.forEach(block => {
            const isComplete = block.state === this.STATE_COMPLETE || block.state === 'complete';
            if (isComplete && !block.isExcluded) {
                // このブロックをスキップ
                currentIndex = block.endLine + 1;
            } else {
                // このブロックを保持
                for (let i = currentIndex; i <= block.endLine; i++) {
                    if (i < lines.length) {
                        remainingLines.push(lines[i]);
                    }
                }
                currentIndex = block.endLine + 1;
            }
        });

        return remainingLines.join('\n').trim();
    }

    /**
     * ブロックIDを生成（短縮版）
     */
    generateBlockId() {
        return Math.random().toString(36).substr(2, 6); // 6文字に短縮
    }

    /**
     * ガター表示用の記号を取得
     */
    getGutterSymbol(state, isExcluded) {
        if (isExcluded) {
            return '';
        }
        
        // 旧形式との互換性のため両方チェック
        if (state === this.STATE_NORMAL || state === 'normal') {
            return '▶';
        } else if (state === this.STATE_COMPLETE || state === 'complete') {
            return '✓';
        }
        
        return '';
    }
}

// グローバルインスタンス
const blockManager = new BlockManager();
