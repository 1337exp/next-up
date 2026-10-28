<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { TaoButton, TaoFormField, TaoInput, TaoInputNumber, TaoDate, TaoSelect, TaoTextarea } from '@1337exp/taoui';
import { useNotesStore } from '@/app/notes';
import { MAX_REPEAT_EVERY, REPEAT_UNITS, type Item, type NoteInput, type RepeatRule } from '@/core/model';
import { RETENTION_DAYS } from '@/core/constants';
import { addDays } from '@/core/date';
import { newId } from '@/core/id';
import { cloneInput, validateInput } from '@/core/notes';
import { useI18n } from '@/i18n';
import { useEditor } from './useEditor';

const AUTOSAVE_MS = 600;
const QUICK_SHIFT_DAYS = [7, 30] as const;

const emit = defineEmits<{ close: [] }>();

const { t } = useI18n();
const store = useNotesStore();
const editor = useEditor();

const { mode, source } = editor.state.value!;

// id у новой заметки выдаём заранее: правки сразу после создания склеиваются с ним в один шаг отмены
let id = mode === 'edit' ? source!.id : newId();
let created = mode === 'edit';

function initialInput(): NoteInput {
    if (mode === 'edit') {
        const note = source!;
        return { due: note.due, body: note.body, items: note.items.map((i) => ({ ...i })), repeat: note.repeat ? { every: note.repeat.every, unit: note.repeat.unit } : null };
    }
    if (mode === 'clone') return cloneInput(source!);
    return { due: store.today, body: '', items: [], repeat: null };
}

const draft = reactive<NoteInput>(initialInput());
const toInput = (): NoteInput => JSON.parse(JSON.stringify(draft));

let lastSaved = JSON.stringify(mode === 'edit' ? draft : null);
const error = ref<ReturnType<typeof validateInput>>(null);

// --- автосохранение: кнопки «Сохранить» нет, правка уходит в стор после короткой паузы ---
let timer: ReturnType<typeof setTimeout> | undefined;

function save(): void {
    clearTimeout(timer);
    timer = undefined;
    const input = toInput();
    const snapshot = JSON.stringify(input);
    if (snapshot === lastSaved) return;

    error.value = validateInput(input, store.today);
    if (error.value) return;

    if (!created) {
        if (!store.add(input, id).ok) return;
        created = true;
        editor.setActive(id);
    } else if (!store.edit(id, input).ok) {
        return;
    }
    lastSaved = snapshot;
}

watch(draft, () => {
    clearTimeout(timer);
    timer = setTimeout(save, AUTOSAVE_MS);
});

onBeforeUnmount(save);

// заметку удалили или убрала чистка, пока она открыта: закрываем редактор
watch(
    () => (created ? store.notes.find((n) => n.id === id)?.deletedAt : null),
    (deletedAt) => {
        if (created && deletedAt !== null) emit('close');
    },
);

// пустая заметка в режиме создания — просто «ещё ничего не ввели», а не ошибка
const visibleError = computed(() => (error.value === 'empty' && !created ? null : error.value));
const errorText = computed(() => {
    switch (visibleError.value) {
        case 'badDate': return t('editor.error.badDate');
        case 'empty': return t('editor.error.empty');
        case 'tooOld': return t('editor.error.tooOld', [RETENTION_DAYS]);
        case 'badRepeat': return t('editor.error.badRepeat', [MAX_REPEAT_EVERY]);
        default: return '';
    }
});

// --- срок ---
const minDate = computed(() => addDays(store.today, -RETENTION_DAYS));

function setDue(value: string | null): void {
    if (value) draft.due = value; // очистить срок нельзя: он обязателен
}
const shift = (days: number): void => void (draft.due = addDays(draft.due, days));

// --- пункты ---
const root = ref<HTMLElement | null>(null);

function focusItem(index: number): void {
    void nextTick(() => root.value?.querySelectorAll<HTMLInputElement>('.item-row input')[index]?.focus());
}

function addItem(after = draft.items.length - 1): void {
    const item: Item = { id: newId(), text: '', doneAt: null };
    draft.items.splice(after + 1, 0, item);
    focusItem(after + 1);
}

function removeItem(index: number): void {
    draft.items.splice(index, 1);
}

// --- повтор: пресеты и свой период ---
type Preset = 'none' | 'day' | 'week' | 'month' | 'half' | 'year' | 'custom';
const PRESETS: Record<Exclude<Preset, 'none' | 'custom'>, RepeatRule> = {
    day: { every: 1, unit: 'day' },
    week: { every: 1, unit: 'week' },
    month: { every: 1, unit: 'month' },
    half: { every: 6, unit: 'month' },
    year: { every: 1, unit: 'year' },
};

function presetOf(rule: RepeatRule | null): Preset {
    if (!rule) return 'none';
    const found = (Object.keys(PRESETS) as (keyof typeof PRESETS)[]).find((key) => PRESETS[key].every === rule.every && PRESETS[key].unit === rule.unit);
    return found ?? 'custom';
}

// «свой период» — отдельный режим: иначе поле исчезало бы, как только число совпадёт с пресетом (2 → 1)
const customMode = ref(presetOf(draft.repeat) === 'custom');
const preset = computed(() => (customMode.value ? 'custom' : presetOf(draft.repeat)));
const presetOptions = computed(() => (['none', 'day', 'week', 'month', 'half', 'year', 'custom'] as const).map((value) => ({ value, label: t(`editor.repeat.${value}`) })));
const unitOptions = computed(() => REPEAT_UNITS.map((value) => ({ value, label: t(`editor.repeat.unit.${value}`) })));

function setPreset(value: string | number | null): void {
    const next = (value ?? 'none') as Preset;
    customMode.value = next === 'custom';
    if (next === 'none') draft.repeat = null;
    else if (next === 'custom') draft.repeat ??= { every: 2, unit: 'day' };
    else draft.repeat = { ...PRESETS[next] };
}

function setEvery(value: number | null): void {
    if (draft.repeat && value !== null) draft.repeat.every = value;
}

onMounted(() => {
    // клонирование — это и есть намерение сделать копию: она появляется сразу, а не после первой правки
    if (mode === 'clone') save();
    if (mode !== 'edit') root.value?.querySelector<HTMLTextAreaElement>('textarea')?.focus();
});
</script>

<template>
    <form ref="root" class="editor" @submit.prevent="emit('close')">
        <TaoFormField :label="t('editor.due.label')" :error="visibleError === 'badDate' || visibleError === 'tooOld' ? errorText : ''">
            <div class="due">
                <TaoButton variant="ghost" icon="tao-chevron-left" :aria-label="t('editor.due.prev')" @click="shift(-1)" />
                <TaoDate :model-value="draft.due" :min="minDate" :error="visibleError === 'badDate' || visibleError === 'tooOld'" class="due-field" @update:model-value="setDue" />
                <TaoButton variant="ghost" icon="tao-chevron-right" :aria-label="t('editor.due.next')" @click="shift(1)" />
            </div>
        </TaoFormField>

        <div class="chips">
            <TaoButton size="small" variant="secondary" @click="draft.due = store.today">{{ t('editor.due.today') }}</TaoButton>
            <TaoButton v-for="days in QUICK_SHIFT_DAYS" :key="days" size="small" variant="secondary" :aria-label="t('editor.due.add', [days])" @click="shift(days)">+{{ days }}</TaoButton>
        </div>

        <TaoFormField :label="t('editor.body.label')" :hint="t('editor.body.hint')" :error="visibleError === 'empty' ? errorText : ''">
            <TaoTextarea v-model="draft.body" variant="outline" :placeholder="t('editor.body.placeholder')" :error="visibleError === 'empty'" />
        </TaoFormField>

        <fieldset class="items">
            <legend class="sr-only">{{ t('editor.items.label') }}</legend>
            <div v-for="(item, index) in draft.items" :key="item.id" class="item-row">
                <TaoButton variant="ghost" tone="danger" icon="trash" :aria-label="t('editor.items.remove')" @click="removeItem(index)" />
                <TaoInput v-model="item.text" :placeholder="t('editor.items.placeholder')" :aria-label="t('editor.items.label')" @keydown.enter.prevent="addItem(index)" />
            </div>
            <TaoButton variant="ghost" icon="tao-plus" class="add-item" @click="addItem()">{{ t('editor.items.add') }}</TaoButton>
        </fieldset>

        <TaoFormField :label="t('editor.repeat.label')" :error="visibleError === 'badRepeat' ? errorText : ''">
            <div class="repeat">
                <TaoSelect :model-value="preset" :options="presetOptions" :clearable="false" @update:model-value="setPreset" />
                <div v-if="preset === 'custom' && draft.repeat" class="custom">
                    <span>{{ t('editor.repeat.every') }}</span>
                    <TaoInputNumber :model-value="draft.repeat.every" :min="1" :max="MAX_REPEAT_EVERY" :step="1" class="every" @update:model-value="setEvery" />
                    <TaoSelect v-model="draft.repeat.unit" :options="unitOptions" :clearable="false" />
                </div>
            </div>
        </TaoFormField>

        <TaoButton type="submit" variant="primary" class="submit">{{ t('editor.done') }}</TaoButton>
    </form>
</template>

<style scoped>
.editor {
    display: flex;
    flex-direction: column;
    gap: var(--tao-space-4);
}

.due {
    display: flex;
    align-items: center;
    gap: var(--tao-space-2);
}

.due-field {
    flex: 1;
    min-width: 0;
}

.chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--tao-space-2);
    margin-top: calc(var(--tao-space-2) * -1);
}

.items {
    display: flex;
    flex-direction: column;
    gap: var(--tao-space-2);
    margin: 0;
    padding: 0;
    border: 0;
}

.item-row {
    display: flex;
    align-items: center;
    gap: var(--tao-space-2);
}

.add-item {
    align-self: flex-start;
}

.item-row :deep(.tao-input) {
    flex: 1;
    min-width: 0;
}

.repeat,
.custom {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--tao-space-2);
}

.repeat {
    flex-direction: column;
    align-items: stretch;
}

.every {
    width: 8em;
}

.submit {
    align-self: flex-start;
}

.sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
}
</style>
