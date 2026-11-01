<script setup lang="ts">
import { computed, ref } from 'vue';
import { TaoButton } from '@1337exp/taoui';
import { useNotesStore } from '@/app/notes';
import { weekDays } from '@/core/date';
import { dateLong, useI18n } from '@/i18n';
import { useSearch } from './useNotes';

/**
 * Неделя над списком: семь дней подряд, начиная с сегодня, точки показывают, где есть заметки. Тап по дню оставляет в списке
 * только его, повторный тап снимает. Стрелки листают по семь дней; назад дальше сегодня не уйти (активных заметок в прошлом нет).
 */
const { t, locale } = useI18n();
const store = useNotesStore();
const { day } = useSearch();

const offset = ref(0);
const days = computed(() => weekDays(store.today, offset.value));

const counts = computed(() => {
    const map = new Map<string, number>();
    for (const note of store.active) map.set(note.due, (map.get(note.due) ?? 0) + 1);
    return map;
});

const cells = computed(() =>
    days.value.map((iso) => {
        const count = counts.value.get(iso) ?? 0;
        return {
            iso,
            number: Number(iso.slice(8, 10)),
            weekday: new Intl.DateTimeFormat(locale.value, { weekday: 'short', timeZone: 'UTC' }).format(Date.parse(`${iso}T00:00:00Z`)),
            dots: Math.min(count, 3),
            today: iso === store.today,
            label: `${dateLong(locale.value, iso)}, ${t('week.count', [count])}`,
        };
    }),
);

function pick(iso: string): void {
    day.value = day.value === iso ? null : iso;
}
</script>

<template>
    <div class="week" role="group" :aria-label="t('week.label')">
        <TaoButton variant="ghost" icon="tao-chevron-left" :disabled="offset <= 0" :aria-label="t('week.prev')" @click="offset--" />
        <div class="days">
            <button v-for="cell in cells" :key="cell.iso" type="button" class="day" :class="{ today: cell.today, on: day === cell.iso }" :aria-label="cell.label" :aria-pressed="day === cell.iso" @click="pick(cell.iso)">
                <span class="dow">{{ cell.weekday }}</span>
                <span class="num">{{ cell.number }}</span>
                <span class="line" aria-hidden="true" />
                <span class="dots" aria-hidden="true"><i v-for="n in 3" :key="n" :class="{ full: n <= cell.dots }" /></span>
            </button>
        </div>
        <TaoButton variant="ghost" icon="tao-chevron-right" :aria-label="t('week.next')" @click="offset++" />
    </div>
</template>

<style scoped>
.week {
    display: flex;
    gap: var(--tao-space-1);
    align-items: center;
}

/* стрелки листания приглушены: акцент остаётся за сегодняшним днём */
.week > :deep(.tao-button) {
    color: var(--tao-color-text-muted);
}

.week > :deep(.tao-button:hover:not(:disabled)) {
    color: var(--tao-color-text);
}

.days {
    display: grid;
    flex: 1;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    min-width: 0;
}

.day {
    display: flex;
    flex-direction: column;
    gap: 2px;
    align-items: center;
    padding: var(--tao-space-1) 0;
    border: 0;
    border-radius: var(--tao-radius-md);
    background: transparent;
    color: var(--tao-color-text);
    font: inherit;
    cursor: pointer;
}

.day:hover {
    background: var(--tao-color-surface-hover);
}

.day:focus-visible {
    outline: 2px solid var(--tao-color-accent);
    outline-offset: 1px;
}

.dow {
    color: var(--tao-color-text-muted);
    font-size: var(--tao-font-size-xs);
}

.num {
    display: grid;
    place-items: center;
    box-sizing: border-box;
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 50%;
    font-size: var(--tao-font-size-md);
    font-weight: 500;
}

/* выбранный день — короткая линия под числом и подложка всей ячейки, как при наведении, но прозрачнее; сегодняшний отличается только жирным числом */
.line {
    width: 1.25rem;
    height: 3px;
    /* линия поднята под само число (круг `.num` выше цифры), а высота ячейки сохранена нижним отступом: найдено подбором в devtools */
    margin-block: -0.45rem 0.45rem;
    border-radius: 2px;
    background: transparent;
}

.today .num {
    font-weight: 700;
}

.on .line {
    background: var(--tao-color-accent);
}

.on {
    background: color-mix(in srgb, var(--tao-color-surface-hover) 55%, transparent);
}

.on:hover {
    background: var(--tao-color-surface-hover);
}

.dots {
    display: flex;
    gap: 3px;
    height: 5px;
}

.dots i {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: transparent;
}

.dots i.full {
    background: var(--tao-color-text-muted);
}
</style>
