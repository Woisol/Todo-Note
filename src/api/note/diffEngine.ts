import Vditor from 'vditor';
import diff from 'fast-diff';
import { throttle } from '../utils/perform';
import { indexedDBManager } from '../utils/indexedDB';
import { noteOps } from './note';
import { ApiResponse } from '../types/request';
import { useToastHelper } from '../utils/toast';

export interface NoteDiff {
  type: 'equal' | 'delete' | 'insert';
  text: string;
}

export interface NoteVersion {
  id: string;
  content?: string; // 完整内容（仅用于第一个版本）
  diffs?: NoteDiff[]; // 相对于前一版本的差异
  timestamp: number;
  author?: string;
  baseVersionId?: string; // 基础版本ID
}
export interface NoteVersionRaw {
  id: string;
  content: string;
  timestamp: number;
  author?: string;
}

export class NoteDiffEngine {
  private vditor?: Vditor;
  private noteId?: string;
  private versions: Map<string, NoteVersion[]> = new Map();
  private autoSaveEnabled = true;
  private autoSaveDelay = 2000; // 2秒自动保存
  // private dbInitialized = false;
  private toast: ReturnType<typeof useToastHelper> | null = null;

  // constructor() {
  //   this.initDB();
  // }

  // /**
  //  * 初始化 IndexedDB
  //  */
  // private async initDB(): Promise<void> {
  //   try {
  //     await indexedDBManager.init();
  //     this.dbInitialized = true;
  //     console.log('IndexedDB 初始化成功');
  //   } catch (error) {
  //     console.error('IndexedDB 初始化失败:', error);
  //     this.dbInitialized = false;
  //   }
  // }

  // /**
  //  * 确保数据库已初始化
  //  */
  // private async ensureDBInitialized(): Promise<void> {
  //   if (!this.dbInitialized) {
  //     await this.initDB();
  //   }
  // }

  /**
   * 获取 init 状态
   */
  get isInitialized(): boolean {
    return this.vditor !== undefined &&
      this.vditor.vditor !== undefined
      // this.dbInitialized;
  }
  /**
   * 初始化 Vditor 编辑器
   */
  async initVditor(element: HTMLElement, toast: ReturnType<typeof useToastHelper>, options?: IOptions): Promise<Vditor> {
    return new Promise((resolve) => {
      this.toast = toast
      this.vditor = new Vditor(element, {
        mode: 'ir',
        height: 400,
        placeholder: '请输入笔记内容...',
        cache: {
          enable: false
        },
        after: () => {
          console.log('Vditor 初始化完成');
          // 在 after 回调中 resolve，确保 Vditor 完全初始化
          resolve(this.vditor!);
        },
        input: (value: string) => {
          this.handleContentChange(value);
        },
        blur: async (value: string) => {
          // 失去焦点时手动保存一次
          // @todo use real user
          try {
            await this.saveVersion(this.noteId || '', value);
          } catch (error) {
            console.error('保存失败:', error);
          }
        },
        ...options
      });
    });
  }

  /**
   * 处理内容变更 - 自动保存版本
   */
  private handleContentChange = throttle(async (value: unknown) => {
    if (!this.autoSaveEnabled) return;
    if (!this.noteId) {
      // use toast instead
      console.warn('未设置 noteId，无法保存版本');
      return;
    }

    const content = String(value);
    const currentNoteId = this.noteId;

    try {
      const res = await this.saveVersion(currentNoteId, content);
      if (res.success) {
        console.log('自动保存版本成功');
        return res;
      } else {
        this.toast!.error(res.message || '保存笔记失败');
      }
    } catch (error) {
      console.error('自动保存失败:', error);
    }
  }, this.autoSaveDelay);

  updateNoteId(noteId: string) {
    this.noteId = noteId;
  }

  /**
   * 设置自动保存配置
   */
  setAutoSave(enabled: boolean, delay = 2000) {
    this.autoSaveEnabled = enabled;
    this.autoSaveDelay = delay;
  }

  /**
   * 计算两个文本之间的差异
   */
  // calculateDiff(oldText: string, newText: string): NoteDiff[] {
  //   const diffs = diff(oldText, newText);

  //   return diffs.map(([type, text]) => ({
  //     type: type === diff.EQUAL ? 'equal' :
  //       type === diff.DELETE ? 'delete' : 'insert',
  //     text
  //   }));
  // }
  // /**
  //  * 生成差异的 HTML 显示
  //  */
  // generateDiffHtml(diffs: NoteDiff[]): string {
  //   return diffs.map(diff => {
  //     const escapedText = this.escapeHtml(diff.text);

  //     switch (diff.type) {
  //       case 'delete':
  //         return `<del class="diff-delete">${escapedText}</del>`;
  //       case 'insert':
  //         return `<ins class="diff-insert">${escapedText}</ins>`;
  //       default:
  //         return escapedText;
  //     }
  //   }).join('');
  // }
  /**
   * 保存笔记版本 - 只保存与前一版本的差异
   */
  async saveVersion(noteId: string, content: string): Promise<ApiResponse<{ success: boolean }>> {
    //! 旧的本地优先的保存策略
    // try {
    //   await this.ensureDBInitialized();
    // } catch (error) {
    //   console.error('数据库初始化失败，使用内存存储:', error);
    // }

    // // 从数据库加载现有版本（如果内存中没有）
    // if (!this.versions.has(noteId) && this.dbInitialized) {
    //   try {
    //     const dbVersions = await indexedDBManager.getNoteVersions(noteId);
    //     this.versions.set(noteId, dbVersions);
    //   } catch (error) {
    //     console.error('从数据库加载版本失败:', error);
    //     this.versions.set(noteId, []);
    //   }
    // } else if (!this.versions.has(noteId)) {
    //   this.versions.set(noteId, []);
    // }

    // const versions = this.versions.get(noteId)!;

    // // 如果是第一个版本，直接保存完整内容
    // if (versions.length === 0) {
    //   const firstVersion: NoteVersion = {
    //     id: this.generateVersionId(),
    //     content,
    //     timestamp: Date.now(),
    //     author
    //   };
    //   versions.push(firstVersion);

    //   // 保存到数据库
    //   if (this.dbInitialized) {
    //     try {
    //       await indexedDBManager.addVersionToNote(noteId, firstVersion);
    //     } catch (error) {
    //       console.error('保存版本到数据库失败:', error);
    //     }
    //   }

    // 获取最新版本的内容
    // const latestVersion = versions[versions.length - 1];
    // const latestContent = await this.getVersionContent(noteId, latestVersion.id);

    // if (!latestContent) {
    //   throw new Error('无法获取最新版本内容');
    // }

    // // 计算差异
    // const diffs = this.calculateDiff(latestContent, content);

    // // 检查是否有实际差异（忽略纯空白字符的变化）
    // const hasSignificantDiff = diffs.some(diff =>
    //   diff.type !== 'equal' && diff.text.trim() !== ''
    // );

    // // 如果没有显著差异，不保存新版本
    // if (!hasSignificantDiff) {
    //   console.log('内容无显著变化，跳过版本保存');
    //   return false;
    // }

    // // 保存差异版本
    // const newVersion: NoteVersion = {
    //   id: this.generateVersionId(),
    //   diffs,
    //   timestamp: Date.now(),
    //   author,
    //   baseVersionId: latestVersion.id
    // };

    // versions.push(newVersion);

    // // 保存到数据库
    // if (this.dbInitialized) {
    //   try {
    //     await indexedDBManager.addVersionToNote(noteId, newVersion);
    //   } catch (error) {
    //     console.error('保存版本到数据库失败:', error);
    //   }
    // }

    // console.log(`保存版本差异: +${this.getDiffStats(diffs).additions} -${this.getDiffStats(diffs).deletions}`);
    // return true;

    return noteOps.updateNote({ meta: { id: noteId }, content: content }).then((res) => {
      if (res.success) {
        return res;
      } else {
        this.toast!.error(res.message || '保存笔记失败');
        console.error('保存笔记失败:', res.message);
        return res;
      }
    }).catch((error) => {
      this.toast!.error(error || '保存笔记失败');
      console.error('保存笔记失败:', error);
      return { success: false, message: error.message || '保存笔记失败' };
    });
  }

  /**
   * 获取指定版本的完整内容
   */
  // _versionCache: Map<string, string> = new Map();
  // async getVersionContent(noteId: string, versionId: string): Promise<string | null> {
  //   const cacheKey = `${noteId}_${versionId}`;

  //   if (this._versionCache.has(cacheKey)) {
  //     return this._versionCache.get(cacheKey) || null;
  //   }

  //   // 尝试从内存中获取
  //   let versions = this.versions.get(noteId);

  //   // 如果内存中没有，尝试从数据库加载
  //   if (!versions && this.dbInitialized) {
  //     try {
  //       versions = await indexedDBManager.getNoteVersions(noteId);
  //       if (versions.length > 0) {
  //         this.versions.set(noteId, versions);
  //       }
  //     } catch (error) {
  //       console.error('从数据库加载版本失败:', error);
  //     }
  //   }

  //   if (!versions) return null;

  //   const versionIndex = versions.findIndex(v => v.id === versionId);
  //   if (versionIndex === -1) return null;

  //   const targetVersion = versions[versionIndex];

  //   // 如果是第一个版本且有完整内容
  //   if (targetVersion.content !== undefined) {
  //     return targetVersion.content;
  //   }

  //   // 重建内容：从第一个版本开始应用所有差异
  //   const firstVersion = versions[0];
  //   if (!firstVersion.content) {
  //     throw new Error('第一个版本缺少完整内容');
  //   }

  //   let content = firstVersion.content;

  //   // 依次应用每个版本的差异
  //   for (let i = 1; i <= versionIndex; i++) {
  //     const version = versions[i];
  //     if (version.diffs) {
  //       content = this.applyPatch(content, version.diffs);
  //     }
  //   }

  //   // 缓存结果
  //   this._versionCache.set(cacheKey, content);
  //   if (this._versionCache.size > 100) {
  //     // 清理缓存，保持最近的 100 个版本内容
  //     const keys = Array.from(this._versionCache.keys()).slice(0, -100);
  //     keys.forEach(key => this._versionCache.delete(key));
  //   }

  //   return content;
  // }

  // /**
  //  * 获取所有版本内容
  //  */
  // async getAllVersions(noteId: string): Promise<NoteVersionRaw[]> {
  //   const versions = await this.getVersions(noteId);
  //   const contents: NoteVersionRaw[] = [];

  //   for (const version of versions) {
  //     const content = await this.getVersionContent(noteId, version.id);
  //     contents.push({
  //       id: version.id,
  //       content: content || '',
  //       timestamp: version.timestamp,
  //       author: version.author
  //     });
  //   }

  //   return contents;
  // }

  // /**
  //  * 获取差异统计信息
  //  */
  // private getDiffStats(diffs: NoteDiff[]): {
  //   additions: number;
  //   deletions: number;
  //   changes: number;
  // } {
  //   let additions = 0;
  //   let deletions = 0;
  //   let changes = 0;

  //   diffs.forEach(diff => {
  //     switch (diff.type) {
  //       case 'insert':
  //         additions += diff.text.length;
  //         changes++;
  //         break;
  //       case 'delete':
  //         deletions += diff.text.length;
  //         changes++;
  //         break;
  //     }
  //   });

  //   return { additions, deletions, changes };
  // }

  // /**
  //  * 获取笔记的所有版本
  //  */
  // async getVersions(noteId: string): Promise<NoteVersion[]> {
  //   // 尝试从内存中获取
  //   let versions = this.versions.get(noteId);

  //   // 如果内存中没有，尝试从数据库加载
  //   if (!versions && this.dbInitialized) {
  //     try {
  //       versions = await indexedDBManager.getNoteVersions(noteId);
  //       if (versions.length > 0) {
  //         this.versions.set(noteId, versions);
  //       }
  //     } catch (error) {
  //       console.error('从数据库加载版本失败:', error);
  //       return [];
  //     }
  //   }

  //   return versions || [];
  // }
  // /**
  //  * 比较两个版本的差异
  //  */
  // async compareVersions(noteId: string, versionId1: string, versionId2: string): Promise<NoteDiff[] | null> {
  //   const content1 = await this.getVersionContent(noteId, versionId1);
  //   const content2 = await this.getVersionContent(noteId, versionId2);

  //   if (!content1 || !content2) return null;

  //   return this.calculateDiff(content1, content2);
  // }
  // /**
  //  * 应用差分补丁
  //  */
  // applyPatch(_originalText: string, diffs: NoteDiff[]): string {
  //   let result = '';

  //   for (const diff of diffs) {
  //     switch (diff.type) {
  //       case 'equal':
  //       case 'insert':
  //         result += diff.text;
  //         break;
  //       case 'delete':
  //         // 删除的内容不添加到结果中
  //         break;
  //     }
  //   }

  //   return result;
  // }
  // /**
  //  * 实时协作差分同步
  //  */
  // async syncCollaborativeDiff(
  //   _noteId: string,
  //   localContent: string,
  //   remoteContent: string
  // ): Promise<string> {
  //   const diffs = this.calculateDiff(localContent, remoteContent);

  //   // 处理冲突
  //   const resolvedDiffs = this.resolveConflicts(diffs);

  //   // 应用合并后的差异
  //   return this.applyPatch(localContent, resolvedDiffs);
  // }


  // /**
  //  * 解决差分冲突
  //  */
  // private resolveConflicts(diffs: NoteDiff[]): NoteDiff[] {
  //   // 简单的冲突解决策略：优先保留插入的内容
  //   return diffs.filter(diff => diff.type !== 'delete' || diff.text.trim() === '');
  // }

  // /**
  //  * 转义 HTML 字符
  //  */
  // private escapeHtml(text: string): string {
  //   const div = document.createElement('div');
  //   div.textContent = text;
  //   return div.innerHTML;
  // }

  // /**
  //  * 生成版本 ID
  //  */
  // private generateVersionId(): string {
  //   return `v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  // }

  /**
   * 获取当前编辑器内容
   */
  getCurrentContent(): string {
    return this.vditor?.getValue() || '';
  }

  /**
   * 获取 Vditor 实例
   */
  getVditor(): Vditor | undefined {
    return this.vditor;
  }

  /**
   * 设置编辑器内容
   */
  setContent(content: string): void {
    if (!this.vditor) {
      console.warn('Vditor 实例不存在，无法设置内容');
      return;
    }

    try {
      // 检查 Vditor 是否有必要的内部属性，确保完全初始化
      if (this.vditor.vditor && this.vditor.vditor.ir) {
        this.vditor.setValue(content);
      }
    } catch (error) {
      console.error('设置 Vditor 内容失败:', error);
      console.error('Content:', content);
      console.error('Vditor instance:', this.vditor);
    }
  }

  /**
   * 销毁编辑器和清理资源
   */
  destroy(): void {
    this.vditor?.destroy();
    this.vditor = undefined;

    // 清理内存中的数据
    this.versions.clear();
    // this._versionCache.clear();

    // 关闭数据库连接
    // if (this.dbInitialized) {
    //   indexedDBManager.close();
    //   this.dbInitialized = false;
    // }
  }

  /**
   * 删除笔记的所有版本
   */
  // async deleteNoteVersions(noteId: string): Promise<void> {
  //   // 从内存中删除
  //   this.versions.delete(noteId);

  //   // 从缓存中删除相关条目
  //   const keysToDelete = Array.from(this._versionCache.keys())
  //     .filter(key => key.startsWith(`${noteId}_`));
  //   keysToDelete.forEach(key => this._versionCache.delete(key));

  //   // 从数据库中删除
  //   if (this.dbInitialized) {
  //     try {
  //       await indexedDBManager.deleteNoteVersions(noteId);
  //     } catch (error) {
  //       console.error('从数据库删除版本失败:', error);
  //     }
  //   }
  // }

  // /**
  //  * 获取所有笔记的基本信息
  //  */
  // async getAllNotesInfo(): Promise<Array<{ id: string; lastModified: number; versionCount: number }>> {
  //   if (!this.dbInitialized) {
  //     await this.ensureDBInitialized();
  //   }

  //   if (this.dbInitialized) {
  //     try {
  //       return await indexedDBManager.getAllNotesInfo();
  //     } catch (error) {
  //       console.error('获取笔记信息失败:', error);
  //     }
  //   }

  //   // 回退到内存数据
  //   const notesInfo: Array<{ id: string; lastModified: number; versionCount: number }> = [];
  //   for (const [noteId, versions] of this.versions.entries()) {
  //     const lastModified = versions.length > 0 ? versions[versions.length - 1].timestamp : 0;
  //     notesInfo.push({
  //       id: noteId,
  //       lastModified,
  //       versionCount: versions.length
  //     });
  //   }
  //   return notesInfo;
  // }

  // /**
  //  * 清理过期数据
  //  */
  // async cleanupOldData(daysToKeep = 30): Promise<void> {
  //   if (this.dbInitialized) {
  //     try {
  //       await indexedDBManager.cleanupOldData(daysToKeep);
  //       console.log(`已清理 ${daysToKeep} 天前的数据`);
  //     } catch (error) {
  //       console.error('清理过期数据失败:', error);
  //     }
  //   }
  // }

  // /**
  //  * 获取存储使用情况
  //  */
  // async getStorageInfo(): Promise<{ estimatedUsage: number; quota: number }> {
  //   if (this.dbInitialized) {
  //     try {
  //       return await indexedDBManager.getStorageInfo();
  //     } catch (error) {
  //       console.error('获取存储信息失败:', error);
  //     }
  //   }
  //   return { estimatedUsage: 0, quota: 0 };
  // }
}

// 导出单例实例
export const noteDiffEngine = new NoteDiffEngine();

