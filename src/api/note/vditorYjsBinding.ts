import * as Y from 'yjs';
import Vditor from 'vditor';

/**
 * Vditor 与 Yjs 的绑定类
 * 实现 Vditor 编辑器与 Yjs 文档的双向同步
 */
export class VditorYjsBinding {
  private vditor: Vditor;
  private yText: Y.Text;
  private isLocalChange = false;
  private isSyncing = false;
  private unobserve?: () => void;

  constructor(vditor: Vditor, yText: Y.Text) {
    this.vditor = vditor;
    this.yText = yText;
    this.setupBindings();
  }

  /**
   * 设置双向绑定
   */
  private setupBindings(): void {
    // 1. 从 Yjs 同步到 Vditor
    this.observeYjsChanges();

    // 2. 从 Vditor 同步到 Yjs
    this.observeVditorChanges();

    // 3. 初始同步：如果 yText 有内容， 强行 同步到 Vditor
    if (this.yText.length > 0) {//&& !this.vditor.getValue()
      this.syncYjsToVditor();
    }
    // 4. 如果 Vditor 有内容而 yText 没有，同步到 Yjs
    else if (this.vditor.getValue() && this.yText.length === 0) {
      this.syncVditorToYjs();
    }
  }

  /**
   * 监听 Yjs 文档变化，同步到 Vditor
   */
  private observeYjsChanges(): void {
    const observer = (event: Y.YTextEvent) => {
      if (this.isLocalChange || this.isSyncing) {
        return;
      }

      this.isSyncing = true;

      try {
        const currentValue = this.vditor.getValue();
        const newValue = this.yText.toString();

        if (currentValue !== newValue) {
          // 保存当前光标位置
          const cursorPos = this.getCursorPosition();

          // 更新 Vditor 内容
          this.vditor.setValue(newValue);

          // 尝试恢复光标位置
          if (cursorPos !== null) {
            this.setCursorPosition(cursorPos);
          }
        }
      } catch (error) {
        console.error('同步 Yjs 到 Vditor 失败:', error);
      } finally {
        this.isSyncing = false;
      }
    };

    this.yText.observe(observer);

    // 保存 unobserve 函数
    this.unobserve = () => {
      this.yText.unobserve(observer);
    };
  }

  /**
   * 监听 Vditor 编辑器变化，同步到 Yjs
   */
  private observeVditorChanges(): void {
    // Vditor 通过 input 回调监听内容变化
    const originalInput = this.vditor.vditor.options.input;

    this.vditor.vditor.options.input = (value: string) => {
      // 调用原始的 input 回调
      if (originalInput) {
        originalInput(value);
      }

      // 同步到 Yjs
      if (!this.isSyncing) {
        this.syncVditorToYjs(value);
      }
    };
  }

  /**
   * 从 Vditor 同步到 Yjs
   */
  private syncVditorToYjs(value?: string): void {
    if (this.isSyncing) return;

    this.isLocalChange = true;

    try {
      const currentValue = value ?? this.vditor.getValue();
      const yTextValue = this.yText.toString();

      console.log('📤 Vditor → Yjs 同步:', {
        vditorValue: currentValue.substring(0, 50),
        vditorLength: currentValue.length,
        yTextValue: yTextValue.substring(0, 50),
        yTextLength: yTextValue.length,
        yTextDoc: this.yText.doc ? 'exists' : 'null',
        docKeys: this.yText.doc ? Array.from(this.yText.doc.share.keys()) : []
      });

      if (currentValue !== yTextValue) {
        console.log('📝 内容不同，开始更新 Y.Text');
        // 使用事务来批量更新
        this.yText.doc?.transact(() => {
          this.yText.delete(0, this.yText.length);
          this.yText.insert(0, currentValue);
          console.log('✅ Y.Text 更新完成, 新长度:', this.yText.length);
          console.log('✅ Y.Text 内容:', this.yText.toString().substring(0, 50));
        });
      } else {
        console.log('⏭️ 内容相同，跳过更新');
      }
    } catch (error) {
      console.error('同步 Vditor 到 Yjs 失败:', error);
    } finally {
      this.isLocalChange = false;
    }
  }

  /**
   * 从 Yjs 同步到 Vditor
   */
  private syncYjsToVditor(): void {
    const yTextValue = this.yText.toString();
    const currentValue = this.vditor.getValue();

    if (yTextValue !== currentValue) {
      this.vditor.setValue(yTextValue);
    }
  }

  /**
   * 获取当前光标位置
   */
  private getCursorPosition(): number | null {
    try {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return null;

      const range = selection.getRangeAt(0);
      const preCaretRange = range.cloneRange();
      const container = this.vditor.vditor.element;

      if (!container) return null;

      preCaretRange.selectNodeContents(container);
      preCaretRange.setEnd(range.endContainer, range.endOffset);

      return preCaretRange.toString().length;
    } catch (error) {
      return null;
    }
  }

  /**
   * 设置光标位置
   */
  private setCursorPosition(position: number): void {
    try {
      const container = this.vditor.vditor.element;
      if (!container) return;

      const range = document.createRange();
      const selection = window.getSelection();
      if (!selection) return;

      let charCount = 0;
      let found = false;

      const walk = (node: Node) => {
        if (found) return;

        if (node.nodeType === Node.TEXT_NODE) {
          const textLength = node.textContent?.length || 0;
          if (charCount + textLength >= position) {
            range.setStart(node, position - charCount);
            range.collapse(true);
            found = true;
            return;
          }
          charCount += textLength;
        } else {
          for (let i = 0; i < node.childNodes.length; i++) {
            walk(node.childNodes[i]);
            if (found) break;
          }
        }
      };

      walk(container);

      if (found) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
    } catch (error) {
      console.error('设置光标位置失败:', error);
    }
  }

  /**
   * 手动触发同步
   */
  public sync(): void {
    this.syncVditorToYjs();
  }

  /**
   * 销毁绑定
   */
  public destroy(): void {
    if (this.unobserve) {
      this.unobserve();
      this.unobserve = undefined;
    }
  }
}
