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
            hint: 'Auto fills the window. Mini is at most {0} px wide, centered.',
        },
        removeAll: 'Delete all',
        export: 'Export',
        import: 'Import',
        autoHide: 'Hide tasks for more than {0} days',
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
            mdSupport: 'The text of the note supports Markdown:',
        },

        form: {
            date: { label: 'Date', placeholder: 'dd.mm.yyyy' },
            note: { label: 'Note', placeholder: 'Enter note text' },
            checklist: { label: 'List of tasks', placeholder: 'Enter task text' },
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
            removeAll: {
                title: 'Confirm the action',
                message: 'Are you sure you want to delete all entries?',
            },
        },
    },
} satisfies DeepStrings<typeof ru>;
