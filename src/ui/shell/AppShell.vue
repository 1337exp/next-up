<script setup lang="ts">
import { ref } from 'vue';
import { TaoButton, TaoNav, TaoSplit, type TaoNavItem } from '@1337exp/taoui';

// Каркас фазы 0: проверяем раскладку на трёх ширинах. Содержимое придёт в следующих фазах.
const section = ref('active');
const split = ref(40);

const items: TaoNavItem[] = [
    { id: 'active', label: 'Активные', icon: 'tao-circle' },
    { id: 'archive', label: 'Архив', icon: 'tao-folder' },
    { id: 'tags', label: 'Теги', icon: 'tao-file' },
    { id: 'settings', label: 'Настройки', icon: 'tao-info' },
];
</script>

<template>
    <TaoNav v-model="section" class="nav" :items="items">
        <template #action>
            <TaoButton icon="tao-plus" aria-label="Новая заметка"><span class="tao-nav__action-label">Новая заметка</span></TaoButton>
        </template>

        <TaoSplit v-model="split" unit="%" :min="25" :max="70" class="split">
            <template #start><div class="pane">Список: {{ section }}</div></template>
            <template #end><div class="pane">Редактор</div></template>
        </TaoSplit>
    </TaoNav>
</template>

<style scoped>
.nav {
    min-height: 100%;
}

.pane {
    padding: var(--tao-space-4);
}
</style>
