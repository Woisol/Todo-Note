import { WebSocketServer } from 'ws';
import * as Y from 'yjs';
// import { } from 'y-websocket'
import { Server as HTTPServer } from 'http';

interface CollaborationRoom {
  doc: Y.Doc;
  clients: Set<any>;
}

export class CollaborateService {
  private wss: WebSocketServer | null = null;
  private rooms: Map<string, CollaborationRoom> = new Map();

  /**
   * 初始化 WebSocket 服务器
   * @param server HTTP 服务器实例
   * @param path WebSocket 路径
   */
  public setupWebSocketServer(server: HTTPServer, path: string = '/collaborate'): void {
    this.wss = new WebSocketServer({
      server,
      path
    });

    this.wss.on('connection', (ws, req) => {
      console.log('📡 新的协作连接建立');

      //! 官方 demo 示例 require('y-websocket/bin/utils').setupWSConnection 就行……

      // 从 URL 参数中获取房间 ID（笔记 ID）
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const roomId = url.searchParams.get('room') || 'default';

      this.handleConnection(ws, roomId);
    });

    console.log(`✨ Yjs WebSocket 服务器已启动，路径: ${path}`);
  }

  /**
   * 处理新的 WebSocket 连接
   */
  private handleConnection(ws: any, roomId: string): void {
    // 获取或创建房间
    let room = this.rooms.get(roomId);
    const isFirstClient = !room;

    if (!room) {
      room = {
        doc: new Y.Doc(),
        clients: new Set()
      };
      this.rooms.set(roomId, room);
      console.log(`📝 创建新的协作房间: ${roomId}, Client ID: ${room.doc.clientID}`);
    } else {
      console.log(`📂 使用现有房间: ${roomId}, Client ID: ${room.doc.clientID}`);
    }

    // 添加客户端到房间
    room.clients.add(ws);
    console.log(`👤 客户端加入房间 ${roomId}，当前客户端数: ${room.clients.size}, 是否为首个客户端: ${isFirstClient}`);

    // ✅ 关键逻辑：如果不是第一个客户端，立即发送服务端状态
    if (!isFirstClient) {
      const state = Y.encodeStateAsUpdate(room.doc);
      console.log(`📤 非首个客户端，发送服务端状态，大小: ${state.length} 字节, 内容长度: ${room.doc.getText('content').length}`);
      ws.send(state);
    } else {
      console.log(`⏳ 首个客户端，等待接收客户端状态来初始化服务端 Y.Doc`);
    }

    // 监听客户端消息
    ws.on('message', (message: any) => {
      try {
        const update = new Uint8Array(message);
        console.log(`📩 Server received update, 大小: ${update.length} 字节`);

        const beforeContent = room!.doc.getText('content').toString();
        console.log(`📄 应用前内容长度: ${beforeContent.length}, 前50字符: "${beforeContent.substring(0, 50)}"`);

        // 应用更新到文档
        Y.applyUpdate(room!.doc, update);

        const afterContent = room!.doc.getText('content').toString();
        console.log(`📄 应用后内容长度: ${afterContent.length}, 前50字符: "${afterContent.substring(0, 50)}"`);

        if (beforeContent !== afterContent) {
          console.log(`✅ 文档内容已更新`);
        } else {
          console.log(`⚠️ 文档内容未改变`);
        }

        // 广播更新给房间内其他客户端
        let broadcastCount = 0;
        room!.clients.forEach(client => {
          if (client !== ws && client.readyState === 1) { // 1 = OPEN
            console.log(`📡 广播更新到其他客户端`);
            client.send(message);
            broadcastCount++;
          }
        });

        if (broadcastCount > 0) {
          console.log(`✅ 已广播给 ${broadcastCount} 个客户端`);
        }
      } catch (error) {
        console.error('❌ 处理协作消息错误:', error);
      }
    });

    // 监听客户端断开
    ws.on('close', () => {
      room!.clients.delete(ws);
      console.log(`👋 客户端离开房间 ${roomId}，当前客户端数: ${room!.clients.size}`);

      // 如果房间没有客户端了，可以选择清理房间
      if (room!.clients.size === 0) {
        // 可选：设置延迟清理，以防客户端短暂断线重连
        setTimeout(() => {
          if (room!.clients.size === 0) {
            this.rooms.delete(roomId);
            console.log(`🗑️ 清理空房间: ${roomId}`);
          }
        }, 60000); // 1分钟后清理
      }
    });

    ws.on('error', (error: Error) => {
      console.error('❌ WebSocket 错误:', error);
    });
  }

  /**
   * 获取当前活跃的房间数量
   */
  public getRoomCount(): number {
    return this.rooms.size;
  }

  /**
   * 获取特定房间的客户端数量
   */
  public getRoomClientCount(roomId: string): number {
    return this.rooms.get(roomId)?.clients.size || 0;
  }

  /**
   * 关闭 WebSocket 服务器
   */
  public close(): void {
    if (this.wss) {
      this.wss.close();
      console.log('🔌 Yjs WebSocket 服务器已关闭');
    }
  }
}