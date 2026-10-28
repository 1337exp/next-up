<script setup lang="ts">
import { computed } from 'vue';
import { renderMarkdown } from './markdown';

const props = defineProps<{ text: string }>();
const emit = defineEmits<{ tag: [tag: string] }>();

const html = computed(() => renderMarkdown(props.text));

// хештеги в разметке — кнопки с data-tag: один обработчик на весь блок
function onClick(event: MouseEvent): void {
    const button = (event.target as HTMLElement).closest<HTMLElement>('button.hashtag');
    if (button?.dataset.tag) emit('tag', button.dataset.tag);
}
</script>

<template>
    <!-- eslint-disable-next-line vue/no-v-html: сырой HTML выключен в markdown.ts -->
    <div class="markdown tao-prose" @click="onClick" v-html="html" />
</template>

<style scoped>
.markdown {
    overflow-wrap: anywhere;
    font-size: var(--tao-font-size-md);
}

.markdown :deep(> :first-child) {
    margin-top: 0;
}

.markdown :deep(> :last-child) {
    margin-bottom: 0;
}

.markdown :deep(.hashtag) {
    padding: 0;
    border: 0;
    background: none;
    color: var(--tao-color-accent-text);
    font: inherit;
    cursor: pointer;
}

.markdown :deep(.hashtag:hover) {
    text-decoration: underline;
}
</style>
