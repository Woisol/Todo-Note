<script setup lang="ts">
import { Note, NoteMeta as NoteMetaType } from '@/api/types/note';
import { onMounted, onUnmounted, ref } from 'vue';
import { useToastHelper } from '@/api/utils/toast';
import { noteDiffEngine } from '@/api/note/diffEngine';
import NoteMeta from './NoteMeta.vue';
import 'vditor/dist/index.css';
import { NoteId } from '@/api/types/gerneral';

const toast = useToastHelper();

const noteMetaProxy = defineModel<NoteMetaType>({
  default: {},
  type: Object as () => NoteMetaType
});

const { note } = defineProps<{ note?: Note }>();
const vditorElement = ref<HTMLDivElement>();

onMounted(async () => {
  if (vditorElement.value) {
    await noteDiffEngine.initVditor(vditorElement.value, toast, {
      height: '100%',
      placeholder: 'Start Typing Here...',
    });
    noteDiffEngine.setAutoSave(true, 2 * 60 * 1000);
  }
});

onUnmounted(() => {
  noteDiffEngine.destroy();
});


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
