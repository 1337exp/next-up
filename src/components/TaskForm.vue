<script setup lang="ts">
import { computed, reactive, ref, useId, watch } from 'vue';
import { confirm, TaoButton, TaoDropdownMenu, TaoFormField, TaoIcon, TaoInput, TaoModal, TaoTextarea, type TaoDropdownAction } from '@1337exp/taoui';
import { RETENTION_DAYS } from '@/domain/constants';
import { draftFromClone, draftFromTask, draftToInput, newDraft, normalizeDateText, QUICK_SHIFT_DAYS, shiftDateText, withNewItem, type TaskDraft } from '@/domain/draft';
import { formatUserDate } from '@/domain/date';
import { isRecurrence, RECURRENCES, type Task } from '@/domain/types';
import type { TaskError } from '@/domain/tasks';
import { useI18n } from '@/i18n';
import { useTasksStore } from '@/stores/tasks';

export type TaskFormMode = 'create' | 'edit' | 'clone';

const open = defineModel<boolean>({ required: true });
const props = defineProps<{
    mode: TaskFormMode;
    /** Исходная задача для режимов «изменить» и «клонировать». */
    task?: Task | null;
}>();
const emit = defineEmits<{ saved: [task: Task] }>();

const { t } = useI18n();
const tasks = useTasksStore();

const dateHintId = `nextup-date-hint-${useId()}`;
const draft = reactive<TaskDraft>(newDraft(tasks.today));
const newItemText = ref('');
const error = ref<TaskError | null>(null);

// Что было в форме при открытии: по нему видно, ввёл ли пользователь что-то, что пропадёт при закрытии.
let initialDraft = '';
const isDirty = (): boolean => newItemText.value.trim() !== '' || JSON.stringify(draft) !== initialDraft;

function buildDraft(): TaskDraft {
    if (props.task && props.mode === 'edit') return draftFromTask(props.task);
    if (props.task && props.mode === 'clone') return draftFromClone(props.task);
    return newDraft(tasks.today);
}

// каждое открытие начинается с чистой формы (или с данных выбранной задачи)
watch(
    open,
    (isOpen) => {
        if (!isOpen) return;
        Object.assign(draft, buildDraft());
        initialDraft = JSON.stringify(draft);
        newItemText.value = '';
        error.value = null;
    },
    { immediate: true },
);

// после правки даты или заметки ошибка больше не актуальна
// (пункты списка сюда не входят: submit() сам может добавить ожидающий пункт и не должен гасить свою ошибку)
watch(
    () => [draft.dateText, draft.note],
    () => (error.value = null),
);

const title = computed(() => ({ create: t('tasks.form.title.create'), edit: t('ui.button.change'), clone: t('tasks.form.title.clone') })[props.mode]);
const submitLabel = computed(() => (props.mode === 'edit' ? t('ui.button.save') : t('ui.button.add')));

const dateError = computed(() => {
    if (error.value === 'badDate') return t('tasks.notify.badDate.message');
    if (error.value === 'tooOld') return t('tasks.form.error.tooOld', [RETENTION_DAYS]);
    return '';
});
const noteError = computed(() => (error.value === 'empty' ? t('tasks.form.error.empty') : ''));

// две строки подсказки: формат ввода и сегодняшняя дата (чтобы не искать её глазами)
const todayText = computed(() => formatUserDate(tasks.today));
const noteHint = computed(() => `${t('tasks.hint.mdSupport')} [text](https://example.com)`);

// TaoInput и TaoTextarea передают атрибуты на обёртку, а не на сам <input>/<textarea>.
// Подписей у полей нет (форма простая), поэтому доступное имя задаём полю напрямую.
function fieldOf(instance: unknown): HTMLElement | null {
    const root = (instance as { $el?: HTMLElement } | null)?.$el;
    return root?.querySelector<HTMLElement>('input, textarea') ?? null;
}

function nameField(instance: unknown, label: string): void {
    fieldOf(instance)?.setAttribute('aria-label', label);
}

// цифровая клавиатура на телефоне нужна именно полю даты
function setupDateField(instance: unknown): void {
    nameField(instance, t('tasks.form.date.label'));
    fieldOf(instance)?.setAttribute('inputmode', 'numeric');
    fieldOf(instance)?.setAttribute('aria-describedby', dateHintId);
}

function shiftDate(days: number): void {
    draft.dateText = shiftDateText(draft.dateText, days, tasks.today);
}

// клик по «Сегодняшняя дата» подставляет её в поле: не нужно копировать и вставлять
function useToday(): void {
    draft.dateText = todayText.value;
}

function normalizeDate(): void {
    draft.dateText = normalizeDateText(draft.dateText, tasks.today);
}

function pushPendingItem(): void {
    draft.checklist = withNewItem(draft.checklist, newItemText.value);
    newItemText.value = '';
}

// действие пользователя («+» или Enter): новый пункт снимает ошибку «пустая задача»
function addItem(): void {
    pushPendingItem();
    if (error.value === 'empty') error.value = null;
}

function removeItem(index: number): void {
    draft.checklist.splice(index, 1);
}

const repeatActions = computed<TaoDropdownAction[]>(() => RECURRENCES.map((id) => ({ id, name: t(`tasks.form.repeat.${id}`) })));
const repeatCurrent = computed(() => (draft.recurrence === 'none' ? '-' : t(`tasks.form.repeat.${draft.recurrence}`)));

function onRepeatSelected(id: string): void {
    if (isRecurrence(id)) draft.recurrence = id;
}

// Закрытие без сохранения (Esc, клик мимо, крестик, «Отменить»): если что-то введено, сначала спрашиваем.
// Сохранение закрывает форму напрямую и сюда не попадает.
let asking = false;

async function requestClose(): Promise<void> {
    if (!isDirty()) {
        open.value = false;
        return;
    }
    if (asking) return; // подтверждение уже на экране (второй Esc)
    asking = true;
    try {
        const discard = await confirm(t('tasks.form.discard.title'))
            .message(t('tasks.form.discard.message'))
            .ok(t('tasks.form.discard.ok'))
            .cancel(t('tasks.form.discard.keep'))
            .danger();
        if (discard) open.value = false;
    } finally {
        asking = false;
    }
}

function onModalUpdate(value: boolean): void {
    if (value) open.value = true;
    else void requestClose();
}

function submit(): void {
    // текст, который не успели добавить кнопкой «+», не теряем
    if (newItemText.value.trim() !== '') pushPendingItem();

    const built = draftToInput(draft, tasks.today);
    if (!built.ok) {
        error.value = built.error;
        return;
    }

    const result = props.mode === 'edit' && props.task ? tasks.updateTaskById(props.task.id, built.input) : tasks.addTask(built.input);

    if (!result.ok) {
        if (result.error === 'notFound') open.value = false; // задачу успели удалить
        else error.value = result.error;
        return;
    }

    emit('saved', result.task);
    open.value = false;
}
</script>

<template>
    <TaoModal :model-value="open" :title="title" :close-label="t('ui.button.close')" @update:model-value="onModalUpdate">
        <div class="form">
            <TaoFormField :error="dateError">
                <div class="date-row">
                    <TaoInput
                        v-model="draft.dateText"
                        class="date-input"
                        :ref="setupDateField"
                        :placeholder="t('tasks.form.date.placeholder')"
                        :error="!!dateError"
                        @blur="normalizeDate"
                        @keydown.enter.prevent="normalizeDate"
                    >
                        <template #prefix>
                            <TaoButton variant="text" :aria-label="t('tasks.form.date.prev')" @click="shiftDate(-1)"><TaoIcon name="left-open" /></TaoButton>
                        </template>
                        <template #suffix>
                            <TaoButton variant="text" :aria-label="t('tasks.form.date.next')" @click="shiftDate(1)"><TaoIcon name="right-open" /></TaoButton>
                        </template>
                    </TaoInput>

                    <!-- одним блоком: на узком экране кнопки переезжают под дату все вместе, а не по одной -->
                    <div class="quick-shifts">
                        <TaoButton
                            v-for="days in QUICK_SHIFT_DAYS"
                            :key="days"
                            variant="ghost"
                            class="quick-shift"
                            :aria-label="t('tasks.form.date.addDays', [days])"
                            @click="shiftDate(days)"
                        >
                            +{{ days }}
                        </TaoButton>
                    </div>
                </div>

                <!-- подсказки под полем даты; «сегодняшняя дата» — кнопка, подставляющая её в поле -->
                <div :id="dateHintId" class="date-hints">
                    <span>{{ t('tasks.hint.dateFormat') }} dd, dd.mm, dd.mm.yyyy</span>
                    <span>
                        {{ t('tasks.hint.today') }}
                        <TaoButton variant="text" class="today-button" :aria-label="t('tasks.form.date.useToday')" @click="useToday">{{ todayText }}</TaoButton>
                    </span>
                </div>
            </TaoFormField>

            <TaoFormField :hint="noteHint" :error="noteError">
                <TaoTextarea
                    v-model="draft.note"
                    :ref="(el: unknown) => nameField(el, t('tasks.form.note.label'))"
                    :placeholder="t('tasks.form.note.placeholder')"
                    :rows="4"
                    :error="!!noteError"
                />
            </TaoFormField>

            <div class="checklist">
                <div class="add-item">
                    <TaoInput
                        v-model="newItemText"
                        class="grow"
                        :ref="(el: unknown) => nameField(el, t('tasks.form.checklist.label'))"
                        :placeholder="t('tasks.form.checklist.placeholder')"
                        @keydown.enter.prevent="addItem"
                    />
                    <TaoButton variant="ghost" :aria-label="t('tasks.form.checklist.add')" @click="addItem"><TaoIcon name="plus" /></TaoButton>
                </div>

                <ul v-if="draft.checklist.length" class="items">
                    <li v-for="(item, index) in draft.checklist" :key="index" class="item">
                        <!-- «удалить» слева: справа над списком стоит «+», и большой палец правой руки не должен задевать удаление -->
                        <TaoButton variant="ghost" tone="danger" :aria-label="t('tasks.form.checklist.remove')" @click="removeItem(index)"><TaoIcon name="cancel" /></TaoButton>
                        <TaoInput
                            v-model="item.text"
                            class="grow"
                            :ref="(el: unknown) => nameField(el, t('tasks.form.checklist.label'))"
                            :placeholder="t('tasks.form.checklist.placeholder')"
                        />
                    </li>
                </ul>
            </div>

            <!-- кнопка у dropdown уже есть: внутри только текст, иначе hover срабатывает дважды -->
            <TaoDropdownMenu class="repeat" :actions="repeatActions" :menu-label="t('tasks.form.repeat.label')" @selected="onRepeatSelected">
                <template #button>{{ t('tasks.form.repeat.label') }}: {{ repeatCurrent }}</template>
            </TaoDropdownMenu>
        </div>

        <template #footer>
            <div class="footer">
                <TaoButton variant="ghost" @click="requestClose">{{ t('ui.button.cancel') }}</TaoButton>
                <TaoButton variant="primary" class="submit" @click="submit">{{ submitLabel }}</TaoButton>
            </div>
        </template>
    </TaoModal>
</template>

<style scoped>
.form {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.date-hints {
    display: flex;
    flex-direction: column;
    margin-top: var(--tao-space-1, 4px);
    font-size: var(--tao-font-size-xs);
    color: var(--tao-color-text-muted);
}

/* кнопка «text» стоит прямо в строке текста — именно для такого случая этот вариант и нужен */
.today-button {
    padding: 0 4px;
    font-size: inherit;
}

.date-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--tao-space-2, 8px);
}

/* дата никогда не бывает длинной: узкое поле, текст по центру */
.date-input {
    --nextup-date-width: 230px;

    width: var(--nextup-date-width);
    flex: none;
}

.date-input :deep(input) {
    text-align: center;
}

.quick-shifts {
    display: flex;
    gap: var(--tao-space-2, 8px);
}

/* без вложенной кнопки текст «Повтор» иначе получал нестандартный размер */
.repeat,
.repeat :deep(.tao-dropdown-menu__button) {
    font-size: var(--tao-font-size-md);
}

.add-item,
.item {
    display: flex;
    align-items: center;
    gap: var(--tao-space-2, 8px);
}

.grow {
    flex: 1;
    min-width: 0;
}

.items {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin: 10px 0 0;
    padding: 0;
    list-style: none;
}

.footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--tao-space-2, 8px);
}
</style>
