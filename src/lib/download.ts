/** Сохранить текст файлом через браузер. */
export function downloadTextFile(fileName: string, text: string, mime = 'application/json'): void {
    const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }));

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.append(link);
    link.click();
    link.remove();

    // браузеру нужно время, чтобы начать скачивание
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Прочитать выбранный файл как текст. */
export function readFileText(file: File): Promise<string> {
    if (typeof file.text === 'function') return file.text();

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ''));
        reader.onerror = () => reject(reader.error ?? new Error('read failed'));
        reader.readAsText(file);
    });
}
