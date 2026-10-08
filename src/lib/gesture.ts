// Нажатие мыши или пальца приходит цепочкой: pointerdown → pointerup → mouseup → click. На тачскринах click может
// прийти заметно позже pointerup. Если на pointerup показать что-то поверх (диалог), завершающий click попадёт уже в него.
// Фиксированная пауза тут только гонка с другим шансом, поэтому ждём само событие click.

let lastPointerUp = 0;
let lastClick = 0;

if (typeof document !== 'undefined') {
    document.addEventListener('pointerup', () => (lastPointerUp = performance.now()), true);
    document.addEventListener('click', () => (lastClick = performance.now()), true);
}

/**
 * Разрешается, когда текущий жест закончился, и можно безопасно показывать диалог.
 * Если жеста нет (Esc, программное закрытие) или click уже прошёл (кнопка), ждать нечего.
 * `maxWaitMs`: запас на случай, когда click не приходит (палец увели, жест превратился в прокрутку).
 */
export function afterPointerGesture(maxWaitMs = 400, recentMs = 100): Promise<void> {
    return new Promise((resolve) => {
        const gestureInProgress = performance.now() - lastPointerUp < recentMs && lastClick < lastPointerUp;
        if (!gestureInProgress) return void setTimeout(resolve, 0);

        let timer: ReturnType<typeof setTimeout>;
        const finish = (): void => {
            clearTimeout(timer);
            document.removeEventListener('click', finish, true);
            setTimeout(resolve, 0); // обработчики самого click ещё не закончили работу
        };
        document.addEventListener('click', finish, true);
        timer = setTimeout(finish, maxWaitMs);
    });
}
