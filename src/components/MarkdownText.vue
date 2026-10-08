<script setup lang="ts">
import { computed } from 'vue';
import { renderMarkdown } from '@/lib/markdown';

const props = defineProps<{ text: string }>();
const emit = defineEmits<{ tag: [tag: string] }>();

// безопасно: сырой HTML в renderMarkdown отключён
const html = computed(() => renderMarkdown(props.text));

// хештеги выводятся кнопками внутри v-html, поэтому слушаем клик на корне
function onClick(e: MouseEvent): void {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-tag]');
    if (el?.dataset.tag) emit('tag', `#${el.dataset.tag}`);
}
</script>

<template>
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div class="markdown" v-html="html" @click="onClick" />
</template>

<style scoped>
.markdown {
    overflow-wrap: anywhere;
}

.markdown :deep(> :first-child) {
    margin-top: 0;
}

.markdown :deep(> :last-child) {
    margin-bottom: 0;
}

.markdown :deep(p),
.markdown :deep(ul),
.markdown :deep(ol) {
    margin: 0 0 var(--tao-space-2, 8px);
}

.markdown :deep(ul),
.markdown :deep(ol) {
    padding-left: 1.4em;
}

.markdown :deep(a) {
    color: var(--tao-color-accent, inherit);
}

.markdown :deep(.hashtag) {
    padding: 0;
    border: 0;
    background: none;
    color: var(--tao-color-accent, inherit);
    font: inherit;
    cursor: pointer;
}

.markdown :deep(.hashtag:hover) {
    text-decoration: underline;
}

.markdown :deep(code) {
    padding: 0 4px;
    border-radius: 4px;
    background: var(--tao-color-surface-sunken);
    font-size: 0.95em;
}

.markdown :deep(pre) {
    overflow-x: auto;
    padding: var(--tao-space-2, 8px);
    border-radius: 6px;
    background: var(--tao-color-surface-sunken);
}

.markdown :deep(pre code) {
    padding: 0;
    background: none;
}

.markdown :deep(blockquote) {
    margin: 0 0 var(--tao-space-2, 8px);
    padding-left: var(--tao-space-3, 12px);
    border-left: 3px solid var(--tao-color-border-strong);
    color: var(--tao-color-text-muted);
}
</style>
