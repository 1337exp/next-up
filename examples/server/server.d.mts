import type { Server } from 'node:http';

export interface NextupServerOptions {
    /** Папка, где лежат снимки (по файлу на токен). */
    dataDir?: string;
    /** Куда писать строки журнала (токены в них обрезаны). */
    log?: (line: string) => void;
}

export function createNextupServer(options?: NextupServerOptions): Server;
