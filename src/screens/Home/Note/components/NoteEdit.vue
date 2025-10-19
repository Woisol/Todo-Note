<script setup lang="ts">
import { Note, NoteMeta as NoteMetaType } from '@/api/types/note';
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { useToastHelper } from '@/api/utils/toast';
import { noteDiffEngine } from '@/api/note/diffEngine';
import NoteMeta from './NoteMeta.vue';
import 'vditor/dist/index.css';
import { NoteId } from '@/api/types/gerneral';
import { collaborateService } from '@/api/note/collaborate';
import { VditorYjsBinding } from '@/api/note/vditorYjsBinding';

const toast = useToastHelper();

const noteMetaProxy = defineModel<NoteMetaType>({
  default: {},
  type: Object as () => NoteMetaType
});

const { note, isCollaborating } = defineProps<{
  note?: Note;
  isCollaborating?: boolean;
}>();

const vditorElement = ref<HTMLDivElement>();
let yjsBinding: VditorYjsBinding | null = null;

onMounted(async () => {
  if (vditorElement.value) {
    await noteDiffEngine.initVditor(vditorElement.value, toast, {
      height: '100%',
      placeholder: 'Start Typing Here...',
    });
    noteDiffEngine.setAutoSave(true, 2 * 60 * 1000);

    // 如果已经在协作模式，设置绑定
    setupCollaborationBinding();
  }
});

onUnmounted(() => {
  destroyCollaborationBinding();
  noteDiffEngine.destroy();
});

// 监听协作状态变化
watch(() => isCollaborating, (newValue) => {
  if (newValue) {
    setupCollaborationBinding();
  } else {
    destroyCollaborationBinding();
  }
});

// 设置协作绑定
function setupCollaborationBinding() {
  if (!isCollaborating || !noteDiffEngine.isInitialized) {
    return;
  }

  try {
    const vditor = noteDiffEngine.getVditor();
    const yText = collaborateService.getSharedType<import('yjs').Text>();

    if (vditor && yText) {
      yjsBinding = new VditorYjsBinding(vditor, yText);
      console.log('✅ Vditor 协作绑定已建立');
    }
  } catch (error) {
    console.error('设置协作绑定失败:', error);
    toast.error('协作绑定失败');
  }
}

// 销毁协作绑定
function destroyCollaborationBinding() {
  if (yjsBinding) {
    yjsBinding.destroy();
    yjsBinding = null;
    console.log('🔌 Vditor 协作绑定已断开');
  }
}


</script>
<template>
  <NoteMeta v-if="note" v-model="noteMetaProxy" class="px-2 pb-4" />
  <div v-else class="flex place-items-center h-full flex-1">
    <p class="text-gray-500">请选择一个笔记查看内容</p>
  </div>
  <div ref="vditorElement"
    :class="'h-full border-2 border-gray-200 rounded-xl flex flex-col overflow-y-auto ' + (note ? '' : 'hidden!')">
  </div>
</template>
