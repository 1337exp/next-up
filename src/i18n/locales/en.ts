import type ru from './ru';

// Все ключи ru.ts должны быть здесь, лишних быть не должно (satisfies проверяет оба направления).
type DeepStrings<T> = { [K in keyof T]: T[K] extends string ? string : DeepStrings<T[K]> };

export default {
    ui: {
        button: {
            add: 'Add',
            close: 'Close',
            save: 'Save',
            cancel: 'Cancel',
            delete: 'Delete',
            clone: 'Clone',
            change: 'Change',
            done: 'Done',
            inProgress: 'In progress',
        },
        confirm: {
            yes: 'Confirm',
            no: 'Cancel',
        },
        copy: 'Copy',
        copied: 'Copied',
    },

    language: {
        title: 'Language',
        hint: 'You can change the language later in settings.',
    },

    settings: {
        title: 'Settings',
        width: {
            title: 'Width',
            auto: 'Auto',
            mini: 'Mini',
            hint: 'Auto fills the whole window.',
        },
        uiScale: {
            title: 'Interface size',
            hint: 'Scales the whole interface at once.',
        },
        fontSize: {
            title: 'Text size separately',
            note: 'Note',
            items: 'List items',
            header: 'Header (date)',
        },
        removeAll: 'Delete all',
        export: 'Export',
        import: 'Import',
        autoHide: 'Hide tasks for more than {0} days',
        confirmUncheck: 'Confirm unchecking a task',
        notify: {
            label: "Notify about today's tasks",
            hint: 'Once a day when the date changes, if the tab is in the background.',
            denied: 'Notifications are blocked in the browser settings.',
            unsupported: 'This browser does not support notifications (https or localhost is required).',
        },
        data: {
            title: 'Data',
            dropHint: 'Export file: drop it here or click to choose',
        },
        sync: {
            title: 'Cloud',
            placeholder: 'https://example.com/wh_tasks_TOKEN',
            invalid: 'Only https:// (or http://localhost) is allowed',
        },
    },

    sync: {
        hint: "Your server's webhook address. The token is part of it, so don't show it to anyone.",
        upload: { label: 'Upload', title: 'Send the data from this device to the server' },
        download: { label: 'Download', title: 'Get the data from the server to this device' },
        replace: 'Replace',
        status: {
            never: 'Not synced yet.',
            at: 'Synced: {0}.',
            unsynced: 'There are changes that are not on the server.',
        },
        confirm: {
            localNewer: {
                title: 'Data on this device is newer',
                message: 'You changed data here on {0}, while the server copy is from {1}. Downloading will replace the data on this device. Continue?',
            },
            serverNewer: {
                title: 'The server has newer data',
                message: 'It was saved on {0}, after your last sync: probably uploaded from another device. Uploading will replace the data on the server. Continue?',
            },
        },
        done: {
            upload: 'Uploaded to the server. Tasks: {0}.',
            download: 'Downloaded from the server. Tasks: {0}.',
        },
        empty: 'The server has no data yet: upload it first.',
        error: {
            network: 'The server is unreachable. Check the address and your connection.',
            timeout: 'The server did not answer in time.',
            unauthorized: 'Access denied: check the token in the address.',
            server: 'The server returned an error.',
            badResponse: "The server's answer does not look like Next Up data.",
            tooLarge: 'The data on the server is too large.',
        },
    },

    transfer: {
        done: 'Import finished. Added: {0}, updated: {1}, skipped: {2}.',
        invalid: 'Damaged entries: {0}.',
        expired: 'Older than a year, not imported: {0}.',
        unknownFormat: 'The file was not recognized: it must be JSON saved by this app or its previous version.',
        notJson: 'The file does not look like JSON.',
        tooLarge: 'The file is too large (over {0} MB).',
        readError: 'Could not read the file.',
    },

    storage: {
        corrupt: 'Saved tasks could not be read. A copy of the data was kept and the list was started anew.',
        newerVersion: 'The data was saved by a newer version of the app. Changes will not be saved.',
        invalid: 'Damaged entries skipped: {0}.',
        saveFailed: 'Could not save the changes.',
        memoryOnly: 'Browser storage is unavailable: changes will last only until the page is closed.',
    },

    tasks: {
        create: 'Create',
        empty: 'No entries',
        menu: 'Actions',
        scrollTop: 'Back to top',
        search: {
            placeholder: 'Search',
            clear: 'Clear search',
            exact: 'Exact match',
            empty: 'Nothing found',
        },
        expand: 'Expand',
        collapse: 'Collapse',

        tabs: {
            active: 'Active',
            archive: 'Archive',
        },

        date: {
            today: 'Today',
            yesterday: 'Yesterday',
            daysLeft: 'Days: {0}',
            quarterTag: 'Q',
        },

        hint: {
            dateFormat: 'Date format:',
            today: "Today's date:",
            mdSupport: 'The text of the note supports Markdown:',
        },

        form: {
            title: { create: 'New note', clone: 'Clone note' },
            date: { label: 'Date', placeholder: 'dd.mm.yyyy', prev: 'Previous day', next: 'Next day', addDays: 'Add days: {0}', useToday: "Use today's date" },
            note: { label: 'Note', placeholder: 'Enter note text' },
            discard: { title: 'Close without saving?', message: 'What you entered will be lost.', ok: 'Close', keep: 'Keep editing' },
            checklist: { label: 'List of tasks', placeholder: 'Enter task text', add: 'Add item', remove: 'Remove item' },
            error: {
                empty: 'Enter the note text or add at least one list item',
                tooOld: 'The date cannot be earlier than {0} days ago',
            },
            repeat: {
                label: 'Repeat',
                none: 'Do not repeat',
                daily: 'Every day',
                weekly: 'Every week',
                monthly: 'Every month',
                semiannual: 'Every 6 months',
                yearly: 'Every year',
            },
        },

        notify: {
            today: 'There are tasks for today ({0}):',
            badDate: {
                title: 'Incorrect data',
                message: 'Check the date and/or value input format',
            },
            remove: {
                title: 'Confirm the action',
                message: 'Are you sure you want to delete entry: "{0}"?',
            },
            uncheck: {
                title: 'Confirm the action',
                message: 'Uncheck the item "{0}"? The time of the check mark will be reset.',
            },
            removeAll: {
                title: 'Confirm the action',
                message: 'Are you sure you want to delete all entries?',
            },
        },
    },
} satisfies DeepStrings<typeof ru>;
