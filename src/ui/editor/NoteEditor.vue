<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { TaoButton, TaoCheckbox, TaoDate, TaoFormField, TaoIcon, TaoInput, TaoInputNumber, TaoSelect, TaoTextarea, TaoToolbar, TaoToolbarGroup } from '@1337exp/taoui';
import { bindHotkeys, formatHotkey } from '@1337exp/taoux/hotkeys';
import { moveItem, sortableTextsEn, sortableTextsRu, useSortable } from '@1337exp/taoux/sortable';
import { useNotesStore } from '@/app/notes';
import { MAX_REPEAT_EVERY, REPEAT_UNITS, type Item, type NoteInput, type RepeatRule } from '@/core/model';
import { RETENTION_DAYS } from '@/core/constants';
import { addDays, diffDays } from '@/core/date';
import { newId } from '@/core/id';
import { applyMarkdown, type MdAction } from '@/core/mdFormat';
import { cloneInput, validateInput } from '@/core/notes';
import { formatDateTime, i18n, inDaysText, useI18n } from '@/i18n';
import { useEditor } from './useEditor';

const AUTOSAVE_MS = 600;

const emit = defineEmits<{ close: [] }>();

const { t, locale } = useI18n();
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
/** Есть правка, которая ещё не ушла в стор: пока так, «Сохранено» не показываем. */
const pending = ref(false);

function save(): void {
    clearTimeout(timer);
    timer = undefined;
    pending.value = false;
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
    pending.value = true;
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
const dateError = computed(() => visibleError.value === 'badDate' || visibleError.value === 'tooOld');
const saved = computed(() => created && !pending.value && !error.value);

// Esc в тексте или пункте закрывает редактор; в выпадающих списках и календаре он закрывает только их
function onEscape(event: KeyboardEvent): void {
    if ((event.target as HTMLElement).closest('textarea, .item-text')) emit('close');
}

// --- срок: быстрые кнопки и дата рядом, сколько дней осталось — словами ---
const minDate = computed(() => addDays(store.today, -RETENTION_DAYS));
const QUICK_DUE = [{ days: 0, label: 'editor.due.today' }, { days: 1, label: 'editor.due.tomorrow' }, { days: 7, label: 'editor.due.plus' }] as const;

function setDue(value: string | null): void {
    if (value) draft.due = value; // очистить срок нельзя: он обязателен
}
const quickDue = (days: number): string => addDays(store.today, days);
const dueLeft = computed(() => diffDays(store.today, draft.due));
const dueHint = computed(() => (dueLeft.value >= 1 ? inDaysText(dueLeft.value) : ''));

// --- пункты: галочка, текст, ручка перестановки, удаление ---
const root = ref<HTMLElement | null>(null);
const itemsEl = ref<HTMLElement | null>(null);

function focusItem(index: number): void {
    void nextTick(() => root.value?.querySelectorAll<HTMLInputElement>('.item-text input')[index]?.focus());
}

function addItem(after = draft.items.length - 1): void {
    const item: Item = { id: newId(), text: '', doneAt: null };
    draft.items.splice(after + 1, 0, item);
    focusItem(after + 1);
}

function removeItem(index: number): void {
    draft.items.splice(index, 1);
}

// Backspace в пустом пункте убирает его и возвращает курсор выше: так удаляют, не тянясь к кнопке
function onItemBackspace(event: KeyboardEvent, index: number): void {
    if (draft.items[index]!.text !== '') return;
    event.preventDefault();
    removeItem(index);
    focusItem(Math.max(0, index - 1));
}

function setItemDone(item: Item, done: boolean): void {
    item.doneAt = done ? Date.now() : null;
}
const doneTime = (item: Item): string => (item.doneAt ? formatDateTime(item.doneAt, locale.value) : '');

useSortable(itemsEl, {
    onMove: (from, to) => void (draft.items = moveItem(draft.items, from, to)),
    texts: () => (i18n.current.value === 'ru' ? sortableTextsRu : sortableTextsEn),
});

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

// --- панель Markdown: появляется, пока курсор в тексте; кнопки и Mod+B / Mod+I / Mod+K; сами правила — core/mdFormat.ts ---
const bodyArea = (): HTMLTextAreaElement | null => root.value?.querySelector('textarea') ?? null;

async function format(action: MdAction): Promise<void> {
    const area = bodyArea();
    if (!area) return;
    const edit = applyMarkdown(action, area.value, area.selectionStart, area.selectionEnd);
    draft.body = edit.text;
    await nextTick();
    area.focus();
    area.setSelectionRange(edit.start, edit.end);
}

const FORMAT_KEYS: Partial<Record<MdAction, string>> = { bold: 'Mod+B', italic: 'Mod+I', link: 'Mod+K' };
const FORMATS: MdAction[] = ['bold', 'italic', 'code', 'list', 'quote', 'link'];
const formatTitle = (action: MdAction): string => {
    const key = FORMAT_KEYS[action];
    return key ? `${t(`editor.format.${action}`)} (${formatHotkey(key)})` : t(`editor.format.${action}`);
};

let unbindKeys = (): void => {};
onBeforeUnmount(() => unbindKeys());

onMounted(() => {
    // клонирование — это и есть намерение сделать копию: она появляется сразу, а не после первой правки
    if (mode === 'clone') save();
    const area = bodyArea();
    if (area) unbindKeys = bindHotkeys(area, { 'Mod+B': () => void format('bold'), 'Mod+I': () => void format('italic'), 'Mod+K': () => void format('link') }, { editable: 'always' });
    if (mode !== 'edit') area?.focus();
});
</script>

<template>
    <form ref="root" class="editor" @submit.prevent="emit('close')" @keydown.esc="onEscape">
        <!-- текст идёт первым: заметку начинают с него, а не с даты -->
        <div class="body-field">
            <TaoFormField :error="visibleError === 'empty' ? errorText : ''">
                <TaoTextarea v-model="draft.body" class="body" variant="plain" size="large" :rows="4" :resize="false" max-height="none" :placeholder="t('editor.body.placeholder')" :aria-label="t('editor.body.label')" :error="visibleError === 'empty'" />
            </TaoFormField>
            <!-- pointerdown.prevent: кнопка не уводит фокус из поля, иначе выделение пропало бы до применения -->
            <TaoToolbar :label="t('editor.format.label')" size="small" variant="plain" class="format">
                <TaoToolbarGroup>
                    <TaoButton v-for="action in FORMATS" :key="action" variant="ghost" size="small" :aria-label="t(`editor.format.${action}`)" :title="formatTitle(action)" @pointerdown.prevent @click="format(action)">
                        <b v-if="action === 'bold'" aria-hidden="true">B</b>
                        <i v-else-if="action === 'italic'" aria-hidden="true">I</i>
                        <TaoIcon v-else :name="action" />
                    </TaoButton>
                </TaoToolbarGroup>
            </TaoToolbar>
        </div>

        <fieldset class="items">
            <legend class="caption">{{ t('editor.items.label') }}</legend>
            <div class="items-card">
            <div ref="itemsEl" class="item-list">
                <div v-for="(item, index) in draft.items" :key="item.id" class="item-row" data-sortable-item>
                    <TaoCheckbox :model-value="item.doneAt !== null" class="item-check" :aria-label="t('editor.items.done')" @update:model-value="setItemDone(item, $event)" />
                    <div class="item-main">
                        <TaoInput v-model="item.text" class="item-text" variant="plain" :placeholder="t('editor.items.placeholder')" :aria-label="t('editor.items.label')" @keydown.enter.prevent="addItem(index)" @keydown.backspace="onItemBackspace($event, index)" />
                        <span v-if="item.doneAt" class="item-time">{{ doneTime(item) }}</span>
                    </div>
                    <!-- ручка перестановки у самого края: на сенсорном экране задевают крайнюю кнопку, а захват простит промах, удаление нет -->
                    <TaoButton variant="ghost" icon="tao-close" class="drop" :aria-label="t('editor.items.remove')" @click="removeItem(index)" />
                    <TaoButton variant="ghost" icon="tao-grip" class="grip" :aria-label="t('editor.items.move')" data-sortable-handle />
                </div>
            </div>
            <TaoButton variant="ghost" icon="tao-plus" class="add-item" @click="addItem()">{{ t('editor.items.add') }}</TaoButton>
            </div>
        </fieldset>

        <!-- срок и повтор — один блок: подписи слева, значения справа -->
        <div class="props-group">
        <h3 class="caption">{{ t('editor.propsCaption') }}</h3>
        <section class="props" :aria-label="t('editor.props')">
            <div class="prop">
                <h3 class="prop-label">{{ t('editor.due.label') }}</h3>
                <div class="prop-value">
                    <div class="chips">
                        <TaoButton v-for="quick in QUICK_DUE" :key="quick.days" size="small" variant="secondary" :pressed="draft.due === quickDue(quick.days)" @click="draft.due = quickDue(quick.days)">{{ t(quick.label, [quick.days]) }}</TaoButton>
                    </div>
                    <TaoFormField :error="dateError ? errorText : ''">
                        <div class="date-line">
                            <TaoDate editable :model-value="draft.due" :min="minDate" :error="dateError" :aria-label="t('editor.due.label')" class="due-field" @update:model-value="setDue" />
                            <span v-if="dueHint" class="due-hint">{{ dueHint }}</span>
                        </div>
                    </TaoFormField>
                </div>
            </div>

            <div class="prop">
                <h3 class="prop-label">{{ t('editor.repeat.label') }}</h3>
                <div class="prop-value">
                    <TaoFormField :error="visibleError === 'badRepeat' ? errorText : ''">
                        <div class="repeat">
                            <TaoSelect :model-value="preset" :options="presetOptions" :clearable="false" :aria-label="t('editor.repeat.label')" @update:model-value="setPreset" />
                            <div v-if="preset === 'custom' && draft.repeat" class="custom">
                                <span>{{ t('editor.repeat.every') }}</span>
                                <TaoInputNumber :model-value="draft.repeat.every" :min="1" :max="MAX_REPEAT_EVERY" :step="1" class="every" @update:model-value="setEvery" />
                                <TaoSelect v-model="draft.repeat.unit" :options="unitOptions" :clearable="false" />
                            </div>
                        </div>
                    </TaoFormField>
                </div>
            </div>
        </section>
        </div>

        <!-- «Готово» внизу, у большого пальца; при прокрутке остаётся на виду -->
        <div class="foot">
            <p class="status" aria-live="polite">
                <template v-if="saved"><TaoIcon name="tao-check" />{{ t('editor.saved') }}</template>
            </p>
            <TaoButton type="submit" variant="primary">{{ t('editor.done') }}</TaoButton>
        </div>
    </form>
</template>

<style scoped>
.editor {
    display: flex;
    flex-direction: column;
    gap: var(--tao-space-4);
    /* на весь экран телефона форма растягивается, и «Готово» оказывается у самого низа */
    min-height: 100%;
}

/* крупный текст без рамки: это страница заметки, а не форма */
.body :deep(textarea) {
    font-size: var(--tao-font-size-lg);
    line-height: 1.55;
    /* где браузер умеет, поле растёт вместе с текстом */
    field-sizing: content;
    min-height: 4.5em;
}


.format {
    display: none;
}

.body-field:focus-within .format {
    display: flex;
}

.items {
    display: flex;
    flex-direction: column;
    gap: var(--tao-space-1);
    margin: 0;
    padding: 0;
    border: 0;
}

/* подпись раздела над карточкой, как на макете E1 */
.caption {
    margin: 0 0 var(--tao-space-2);
    padding: 0;
    color: var(--tao-color-text-muted);
    font-size: var(--tao-font-size-sm);
    font-weight: 500;
}

.props-group {
    display: flex;
    flex-direction: column;
}

.props-group .caption {
    margin-bottom: var(--tao-space-2);
}

/* пункты — строки одной карточки с разделителями, а не россыпь плашек */
.items-card {
    overflow: hidden;
    border: 1px solid var(--tao-color-border);
    border-radius: var(--tao-radius-lg);
    background: var(--tao-color-bg);
}

.item-list {
    display: flex;
    flex-direction: column;
}

.item-row {
    display: flex;
    align-items: center;
    gap: var(--tao-space-1);
    /* слева отступ равен отступу значка справа (кнопка 36 px вокруг значка 14–20 px): колонка галочек и колонка ручек стоят на одном расстоянии от краёв */
    padding-inline: var(--tao-space-4) var(--tao-space-1);
    border-bottom: 1px solid var(--tao-color-border);
    background: var(--tao-color-bg);
}

.item-row[data-sortable-dragging],
.item-row[data-sortable-lifted] {
    background: var(--tao-color-surface-raised);
    box-shadow: 0 6px 18px rgb(0 0 0 / 0.25);
}

.item-check {
    flex: none;
}

.item-main {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
}

.item-main :deep(.tao-input) {
    min-width: 0;
}

.item-time {
    padding-inline: var(--tao-space-3);
    color: var(--tao-color-text-muted);
    font-size: var(--tao-font-size-xs);
}

.grip,
.drop {
    flex: none;
    color: var(--tao-color-text-muted);
}

.grip {
    cursor: grab;
    touch-action: none;
}

.add-item {
    align-self: stretch;
    justify-content: flex-start;
    border-radius: 0;
    padding-inline-start: var(--tao-space-4);
    color: var(--tao-color-text-muted);
}

.props {
    display: flex;
    flex-direction: column;
    padding: var(--tao-space-2) var(--tao-space-4);
    border: 1px solid var(--tao-color-border);
    border-radius: var(--tao-radius-lg);
    background: var(--tao-color-surface);
}

.prop {
    display: flex;
    flex-wrap: wrap;
    gap: var(--tao-space-2) var(--tao-space-4);
    padding-block: var(--tao-space-3);
}

.prop + .prop {
    border-top: 1px solid var(--tao-color-border);
}

.prop-label {
    flex: none;
    width: 4.5rem;
    margin: var(--tao-space-2) 0 0;
    color: var(--tao-color-text-muted);
    font-size: var(--tao-font-size-sm);
    font-weight: 500;
}

.prop-value {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: var(--tao-space-2);
    min-width: min(100%, 14rem);
}

.chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--tao-space-2);
}

.date-line {
    display: flex;
    flex-wrap: wrap;
    gap: var(--tao-space-2) var(--tao-space-3);
    align-items: center;
}

.due-field {
    flex: 0 1 11rem;
    min-width: 0;
}

.due-hint {
    color: var(--tao-color-text-muted);
    font-size: var(--tao-font-size-sm);
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

.foot {
    position: sticky;
    margin-top: auto;
    bottom: 0;
    z-index: 1;
    display: flex;
    gap: var(--tao-space-3);
    align-items: center;
    justify-content: space-between;
    padding-block: var(--tao-space-3);
    border-top: 1px solid var(--tao-color-border);
    background: var(--nu-foot-bg, var(--tao-color-bg));
}

.status {
    display: flex;
    gap: var(--tao-space-1);
    align-items: center;
    margin: 0;
    color: var(--tao-color-text-muted);
    font-size: var(--tao-font-size-sm);
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
