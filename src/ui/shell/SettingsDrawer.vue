<script setup lang="ts">
import { TaoDrawer } from '@1337exp/taoui';
import { useI18n } from '@/i18n';
import SettingsForm from './SettingsForm.vue';

/** Нижний лист настроек: только для телефона. На остальных экранах настройки — раздел рядом с меню (AppShell). */
const open = defineModel<boolean>({ required: true });
const { t } = useI18n();
</script>

<template>
    <TaoDrawer v-model="open" side="bottom" :title="t('settings.title')">
        <SettingsForm />
    </TaoDrawer>
</template>
