import * as Y from 'yjs';
import { Ref, ref } from 'vue';
import { WebsocketProvider } from 'y-websocket'

/**
 * Yjs 协作服务类
 * 用于管理笔记的实时协作功能
 */
export class CollaborateService {
  private ws: WebSocket | null = null;
  private doc: Y.Doc | null = null;
  private noteId: string | null = null;
  private serverUrl: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;

  // 连接状态
  public connectionStatus: Ref<'disconnected' | 'connecting' | 'connected' | 'error'> = ref('disconnected');
  public clientCount: Ref<number> = ref(0);

  constructor(serverUrl: string = 'ws://localhost:3000/notes/collaborate') {
    this.serverUrl = serverUrl;
  }

  /**
   * 连接到协作服务器
   * @param noteId 笔记 ID
   * @param token 认证令牌
   * @returns Y.Doc 实例
   */
  public connect(noteId: string, token?: string): Y.Doc {
    if (this.isConnecting) {
      console.warn('正在连接中，请勿重复连接');
      return this.doc!;
    }

    if (this.doc && this.noteId === noteId && this.ws?.readyState === WebSocket.OPEN) {
      console.log('已经连接到该笔记的协作服务');
      return this.doc;
    }

    // 如果连接到不同的笔记，先断开当前连接
    if (this.noteId && this.noteId !== noteId) {
      this.disconnect();
    }

    this.isConnecting = true;
    this.noteId = noteId;
    this.connectionStatus.value = 'connecting';

    // ⚠️ 关键修复：每次连接都创建全新的 Y.Doc
    // 这样可以避免与服务端的状态不同步
    if (this.doc) {
      this.doc.destroy();
    }
    this.doc = new Y.Doc();
    console.log('📄 创建新的 Y.Doc, Client ID:', this.doc.clientID);

    // 构建 WebSocket URL
    const url = new URL(this.serverUrl);
    url.searchParams.set('room', noteId);
    if (token) {
      url.searchParams.set('token', token);
    }

    try {
      this.ws = new WebSocket(url.toString());

      this.ws.onopen = () => {
        console.log(`✅ 协作连接已建立: ${noteId}`);
        console.log(`📄 客户端 Y.Doc Client ID: ${this.doc!.clientID}`);
        this.connectionStatus.value = 'connected';
        this.reconnectAttempts = 0;
        this.isConnecting = false;
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };
      // this.ws

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket 错误:', error);
        this.connectionStatus.value = 'error';
        this.isConnecting = false;
      };

      this.ws.onclose = () => {
        console.log('📡 协作连接已断开');
        this.connectionStatus.value = 'disconnected';
        this.isConnecting = false;

        // 尝试重连
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.attemptReconnect();
        }
      };

      // 监听文档更新，发送到服务器
      this.doc.on('update', (update: Uint8Array, origin: any) => {
        console.log('📡 Y.Doc 更新事件:', {
          origin,
          updateSize: update.length,
          wsReady: this.ws?.readyState === WebSocket.OPEN,
          docKeys: Array.from(this.doc!.share.keys()),
          contentText: this.doc!.getText('content').toString()
        });

        // 如果更新不是来自远程（即本地产生的更新），则发送到服务器
        if (origin !== 'remote' && this.ws?.readyState === WebSocket.OPEN) {
          console.log('📤 发送更新到服务器, 大小:', update.length);
          this.ws.send(update);
        }
      });

    } catch (error) {
      console.error('连接协作服务器失败:', error);
      this.connectionStatus.value = 'error';
      this.isConnecting = false;
    }

    return this.doc;
  }

  /**
   * 处理来自服务器的消息
   */
  private handleMessage(data: any): void {
    try {
      if (data instanceof Blob) {
        // 如果是 Blob，转换为 ArrayBuffer
        data.arrayBuffer().then((buffer: ArrayBuffer) => {
          const update = new Uint8Array(buffer);
          Y.applyUpdate(this.doc!, update, 'remote');
          // this.doc.
        });
      } else if (data instanceof ArrayBuffer) {
        const update = new Uint8Array(data);
        Y.applyUpdate(this.doc!, update, 'remote');
      } else {
        console.warn('收到未知类型的消息:', typeof data);
      }
    } catch (error) {
      console.error('处理协作消息错误:', error);
    }
  }

  /**
   * 尝试重新连接
   */
  private attemptReconnect(): void {
    if (!this.noteId) return;

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`🔄 尝试重新连接 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(() => {
      if (this.noteId) {
        this.connect(this.noteId);
      }
    }, delay);
  }

  /**
   * 断开协作连接
   */
  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.doc) {
      this.doc.destroy();
      this.doc = null;
    }

    this.noteId = null;
    this.connectionStatus.value = 'disconnected';
    this.reconnectAttempts = 0;
    console.log('🔌 协作服务已断开');
  }

  /**
   * 获取当前文档实例
   */
  public getDoc(): Y.Doc | null {
    return this.doc;
  }

  /**
   * 获取连接状态
   */
  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN && this.connectionStatus.value === 'connected';
  }

  /**
   * 获取共享类型（用于编辑器集成）
   * @param name 共享类型的名称，默认为 'content'
   */
  public getSharedType<T = Y.Text>(name: string = 'content'): T | null {
    if (!this.doc) return null;
    // 使用 getText 确保获取的是同一个 Y.Text 实例
    return this.doc.getText(name) as T;
  }

  /**
   * 设置共享文本内容
   * @param content 文本内容
   * @param name 共享类型的名称
   */
  public setSharedText(content: string, name: string = 'content'): void {
    if (!this.doc) return;

    const yText = this.doc.getText(name);
    this.doc.transact(() => {
      yText.delete(0, yText.length);
      yText.insert(0, content);
    });
  }

  /**
   * 获取共享文本内容
   * @param name 共享类型的名称
   */
  public getSharedText(name: string = 'content'): string {
    if (!this.doc) return '';
    return this.doc.getText(name).toString();
  }

  /**
   * 监听共享文本变化
   * @param callback 回调函数
   * @param name 共享类型的名称
   */
  // public onSharedTextChange(callback: (text: string) => void, name: string = 'content'): () => void {
  //   if (!this.doc) {
  //     return () => {};
  //   }

  //   const yText = this.doc.getText(name);
  //   const observer = () => {
  //     callback(yText.toString());
  //   };

  //   yText.observe(observer);

  //   // 返回取消监听的函数
  //   return () => {
  //     yText.unobserve(observer);
  //   };
  // }
}

// 创建单例实例
export const collaborateService = new CollaborateService();
