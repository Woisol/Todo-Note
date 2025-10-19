import { Router } from 'express';
import { NoteController } from '../controllers/noteController';
import { authenticateToken } from '../middleware/auth';
import { CollaborateService } from '../services/collaborateService';

// 创建协作服务实例
const collaborateService = new CollaborateService();

const router = Router();
const noteController = new NoteController(collaborateService);

// 应用认证中间件到所有笔记路由
router.use(authenticateToken);

// 协作相关路由
router.get('/collaborate/status', noteController.getCollaborateStatus);    // 获取协作服务状态
router.get('/collaborate/room/:noteId', noteController.getRoomInfo);       // 获取特定房间信息

// 笔记 API 路由
router.get('/folders', noteController.getFolders);          // 1. 获取用户笔记目录结构
router.put('/folders', noteController.updateFolders);      // 2. 更新用户笔记目录结构
router.get('/Recent', noteController.getRecentNotes);      // 获取最近的笔记
router.get('/:id', noteController.getNote);                // 3. 根据ID获取笔记
router.post('/', noteController.createNote);               // 4. 创建新笔记
router.put('/', noteController.updateNote);                // 5. 更新笔记
router.delete('/:id', noteController.deleteNote);          // 6. 删除笔记

// 保留的方法(暂时不可用)
// router.post('/folder', noteController.createNoteFolder);   // 创建笔记文件夹

// 导出路由和协作服务
export { collaborateService };
export default router;
