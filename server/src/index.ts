// console.log("Auth server is running...");
import 'dotenv/config';
import { createServer } from 'http';
import app from './app';
import { collaborateService } from './routes/note';

const PORT = process.env.PORT || 3000;

// 创建 HTTP 服务器
const server = createServer(app);

// 设置 WebSocket 服务器用于 Yjs 协作
collaborateService.setupWebSocketServer(server, '/notes/collaborate');

server.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket 协作服务运行在 ws://localhost:${PORT}/notes/collaborate`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信号，正在关闭服务器...');
  collaborateService.close();
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});
