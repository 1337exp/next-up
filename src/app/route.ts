import { ref } from 'vue';
import { formatRoute, HOME, parseRoute, type ListSection, type Route } from '@/core/route';

/**
 * Маршрут приложения живёт в адресе (`location.hash`), поэтому кнопка и жест «назад» работают по-человечески: закрывают заметку
 * или настройки, возвращают в прошлый раздел, а не выбрасывают из приложения (в APK — не закрывают его).
 *
 * Каждая запись истории помечена своим номером (`history.state.i`), а здесь хранится, какой адрес стоял под каким номером в
 * этой сессии: по нему можно узнать, что было «до». После перезагрузки страницы эта память пуста, и тогда окна закрываются
 * заменой записи, а не шагом назад.
 */
const route = ref<Route>(parseRoute(location.hash));
/** Последний открытый раздел со списком: под нижним листом настроек на телефоне виден именно он. */
const listSection = ref<ListSection>(route.value.section === 'settings' ? 'active' : route.value.section);

let index = typeof history.state?.i === 'number' ? history.state.i : 0;
const stack: string[] = [];
stack[index] = formatRoute(route.value);
if (typeof history.state?.i !== 'number') history.replaceState({ i: index }, '');

function remember(): void {
    stack[index] = formatRoute(route.value);
    if (route.value.section !== 'settings') listSection.value = route.value.section;
}

/** Адрес сменился снаружи: «назад» / «вперёд», правка адреса руками, обычная ссылка. */
function read(): void {
    const state = history.state;
    if (typeof state?.i === 'number') index = state.i;
    else {
        // новая запись, которую создал сам браузер (ссылка, ручная правка адреса): ставим ей номер
        index += 1;
        history.replaceState({ i: index }, '');
    }
    route.value = parseRoute(location.hash);
    remember();
}

window.addEventListener('popstate', read);
window.addEventListener('hashchange', read);

/** Перейти на маршрут: новой записью истории или (`replace`) вместо текущей. Тот же адрес — ничего не делает. */
function go(next: Route, replace = false): void {
    if (formatRoute(next) === formatRoute(route.value)) return;
    const hash = formatRoute(next);
    if (replace) history.replaceState({ i: index }, '', hash);
    else {
        index += 1;
        stack.length = index;
        history.pushState({ i: index }, '', hash);
    }
    route.value = next;
    remember();
}

/** Маршрут, который стоял в истории перед текущим (если известен). */
function previous(): Route | undefined {
    const hash = index > 0 ? stack[index - 1] : undefined;
    return hash === undefined ? undefined : parseRoute(hash);
}

export function useRoute() {
    return {
        route,
        listSection,
        go,
        /** Шаг назад по истории. */
        back: (): void => history.back(),
        previous,
        /** Есть ли в истории приложения, куда вернуться. */
        canGoBack: (): boolean => index > 0,
        /** Заменить текущую запись (без нового шага в истории). */
        replace: (next: Route): void => go(next, true),
        HOME,
    };
}
