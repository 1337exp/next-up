// Сборка APK для Android: `npm run apk` кладёт отладочный файл в release/next-up.apk.
//
// Что делает: собирает веб-часть (vue-tsc + vite), переносит её в проект Android (cap sync) и запускает Gradle.
// Нужны Android SDK и JDK 17 или 21. Пути ищутся сами; если не нашлись, задайте переменные ANDROID_HOME и NEXTUP_JAVA_HOME.
// Отладочный APK подписан автоматическим ключом: его можно ставить на свой телефон. Для Google Play нужна своя подпись.
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const windows = process.platform === 'win32';
const local = process.env.LOCALAPPDATA ?? '';

const firstExisting = (candidates, probe) => candidates.filter(Boolean).find((dir) => existsSync(join(dir, probe)));

// SDK: переменная окружения, затем обычные места установки Android Studio
const sdk = firstExisting(
    [process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT, 'C:/Android/sdk', join(local, 'Android/Sdk'), join(homedir(), 'Android/Sdk'), join(homedir(), 'Library/Android/sdk')],
    'platform-tools',
);

// JDK: Gradle этого проекта (Capacitor 6) работает на 17 и 21, а системная Java бывает новее и ломает сборку,
// поэтому сначала берём JDK из Android Studio
const java = firstExisting(
    [
        process.env.NEXTUP_JAVA_HOME,
        'C:/Program Files/Android/Android Studio/jbr',
        '/Applications/Android Studio.app/Contents/jbr/Contents/Home',
        '/opt/android-studio/jbr',
        'C:/Program Files/Java/jdk-17',
        process.env.JAVA_HOME,
    ],
    join('bin', windows ? 'java.exe' : 'java'),
);

if (!sdk) fail('Не найден Android SDK. Поставьте Android Studio или задайте ANDROID_HOME.');
if (!java) fail('Не найден JDK 17. Поставьте Android Studio или задайте NEXTUP_JAVA_HOME.');
console.log(`SDK: ${sdk}\nJDK: ${java}\n`);

const env = { ...process.env, ANDROID_HOME: sdk, ANDROID_SDK_ROOT: sdk, JAVA_HOME: java };

function fail(message) {
    console.error(message);
    process.exit(1);
}

function run(title, command, args, cwd = root) {
    console.log(`\n> ${title}`);
    const result = spawnSync(command, args, { cwd, env, stdio: 'inherit', shell: windows });
    if (result.status !== 0) fail(`Шаг не удался: ${title}`);
}

run('Сборка веб-части', 'npm', ['run', 'build']);
run('Перенос в проект Android', 'npx', ['cap', 'sync', 'android']);
const gradle = join(root, 'android', windows ? 'gradlew.bat' : 'gradlew');
run('Сборка APK (Gradle)', `"${gradle}"`, ['assembleDebug'], join(root, 'android'));

const built = join(root, 'android/app/build/outputs/apk/debug/app-debug.apk');
if (!existsSync(built)) fail('Gradle отработал, но app-debug.apk не найден.');
mkdirSync(join(root, 'release'), { recursive: true });
const target = join(root, 'release/next-up.apk');
copyFileSync(built, target);
console.log(`\nГотово: ${target}`);
