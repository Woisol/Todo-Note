import { AxiosResponse } from 'axios';
import type { Todo, TodoTrans } from '../types/todo';
import { request } from '../utils/request';
import { ApiResponse } from '../types/request';
import { TodoId } from '../types/gerneral';
import { AffectNumber } from '../types/db';
import { testTodo } from '../constants/test';
import { todoTransToTodo } from '../utils/todo';
import { invoke } from '../tauri';

// TODO操作API
export const todoOps = {
  /**
   * 获取用户的所有TODO
   */
  getTodos: async (): Promise<ApiResponse<Todo[]>> => {
    // return { success: true, data: testTodo }
    const response = await request.get('/todos')
      .catch(res => {
        return { success: false, ...res.response } as AxiosResponse;
      });
    const { message } = response.data as { message: string } ?? { message: '' };

    if (response.status === 200) {
      const res = { ...response.data, data: response.data.data.map(todoTransToTodo) }
      return res as ApiResponse<Todo[]>;
    // return { success: true, data: response.data as Todo[], message: '' };
    }

    // const errorData = await response.json().catch(() => ({ message: '网络错误' }));
    return { success: false, data: [], message: message ?? '获取TODO列表失败' };
  },

  /**
   * 创建新的TODO
   */
  createTodo: async (todo: Todo): Promise<ApiResponse<AffectNumber>> => {
    const response = await request.post('/todos', todo)
      .catch(res => {
        console.error('创建TODO失败:', res);
        return { success: false, ...res.response } as AxiosResponse;
    });
    const { message } = response.data as { message: string } ?? { message: '' };

    if (response.status === 201) {
      return response.data as ApiResponse<AffectNumber>;
    // return { success: true, data: response.data as Todo, message: '' };
    }

    return { success: false, message: message ?? '创建TODO失败' };
  },
  /**
   * 更新TODO
   */
  updateTodo: async (todo: Todo): Promise<ApiResponse<AffectNumber>> => {
    const response = await request.put(`/todos`, todo)
      .catch(res => {
        console.error('更新TODO失败:', res);
        return { success: false, ...res.response } as AxiosResponse;
    });
    const { message } = response.data as { message: string } ?? { message: '' };

    if (response.status === 200) {
      return response.data as ApiResponse<AffectNumber>;
    // return { success: true, data: response.data as Todo, message: '' };
    }

    // const errorData = await response.json().catch(() => ({ message: '网络错误' }));
    return { success: false, message: message ?? '更新TODO失败' };
  },
  /**
   * 删除TODO
   */
  deleteTodo: async (id: TodoId): Promise<ApiResponse<void>> => {
    const response = await request.delete(`/todos/${id}`)
      .catch(res => {
        console.error('删除TODO失败:', res);
        return { success: false, ...res.response } as AxiosResponse;
    });
    const { message } = response.data as { message: string } ?? { message: '' };

    if (response.status === 200) {
      return response.data as ApiResponse<void>;
    // return { success: true, message: '' };
    }

    // const errorData = await response.json().catch(() => ({ message: '网络错误' }));
    return { success: false, message: message ?? '删除TODO失败' };
  },
  /**
   * 切换TODO完成状态
   */
  toggleTodo: async (id: TodoId, complete: boolean): Promise<ApiResponse<boolean>> => {
    //! 不能直接传输 false/true，必须传递标准 JSON
    const response = await request.patch(`/todos/toggle`, { id, complete })
      .catch(res => {
        console.error('切换TODO状态失败:', res);
        return { success: false, ...res.response } as AxiosResponse;
    });
    const { message } = response.data as { message: string } ?? { message: '' };

    if (response.status === 200) {
      return response.data as ApiResponse<boolean>;
    // return { success: true, data: response.data as Todo, message: '' };
    }

    // const errorData = await response.json().catch(() => ({ message: '网络错误' }));
    return { success: false, message: message ?? '切换TODO状态失败' };
  },
  export: async (): Promise<ApiResponse<string>> => {
    const res = todoOps.getTodos().then(res => {
      if (res.success) {
        const todos: Todo[] = res.data;
        return invoke('export_todo', { todo: JSON.stringify(todos), path: 'todo.json' });
      }
    })
    console.log(res)
  }

  // /**
  //  * 获取已完成的TODO
  //  */
  // getCompletedTodos: async (): Promise<TodoListResponse> => {
  //   const response = await fetch('/api/todos/completed', {
  //     method: 'GET',
  //     headers: {
  //       'Content-Type': 'application/json',
  //     },
  //   }).catch(res => {
  //     console.error('获取已完成TODO失败:', res);
  //     return { success: false, ...res.response } as AxiosResponse;
  //   });
  //   const { message } = response.data as { message: string } ?? { message: '' };

  //   if (response.status === 200) {
  //     return response.data as TodoListResponse;
  //   // return { success: true, data: response.data as Todo[], message: '' };
  //   }

  //   // const errorData = await response.json().catch(() => ({ message: '网络错误' }));
  //   return { success: false, data: [], message: message ?? '获取已完成TODO失败' };
  // },

  // /**
  //  * 获取未完成的TODO
  //  */
  // getPendingTodos: async (): Promise<TodoListResponse> => {
  //   const response = await request.get('/todos/pending')
  //     .catch(res => {
  //       console.error('获取未完成TODO失败:', res);
  //       return { success: false, ...res.response } as AxiosResponse;
  //   });
  //   const { message } = response.data as { message: string } ?? { message: '' };

  //   if (response.status === 200) {
  //     return response.data as TodoListResponse;
  //   // return { success: true, data: response.data as Todo[], message: '' };
  //   }

  //   // const errorData = await response.json().catch(() => ({ message: '网络错误' }));
  //   return { success: false, data: [], message: message ?? '获取未完成TODO失败' };
  // },

  // /**
  //  * 按分类获取TODO
  //  */
  // getTodosByCategory: async (category: string): Promise<TodoListResponse> => {
  //   const response = await request.get(`/todos/category/${category}`)
  //     .catch(res => {
  //       console.error('获取分类TODO失败:', res);
  //       return { success: false, ...res.response } as AxiosResponse;
  //   });
  //   const { message } = response.data as { message: string } ?? { message: '' };

  //   if (response.status === 200) {
  //     return response.data as TodoListResponse;
  //   // return { success: true, data: response.data as Todo[], message: '' };
  //   }

  //   // const errorData = await response.json().catch(() => ({ message: '网络错误' }));
  //   return { success: false, data: [], message: message ?? '获取分类TODO失败' };
  // },
};