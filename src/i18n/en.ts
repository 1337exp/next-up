import type ru from './ru';

type DeepStrings<T> = { [K in keyof T]: T[K] extends string ? string : DeepStrings<T[K]> };

export default {
    app: { name: 'Next Up' },

    ui: {
        button: { add: 'Add', close: 'Close', save: 'Save', cancel: 'Cancel', delete: 'Delete', clone: 'Clone', change: 'Edit', done: 'Complete', reopen: 'Reopen' },
        copy: 'Copy',
        copied: 'Copied',
    },

    nav: { label: 'Sections', active: 'Active', archive: 'Archive', tags: 'Tags', trash: 'Trash', settings: 'Settings', create: 'New note', more: 'More' },

    list: {
        emptyActive: 'No active notes',
        emptyArchive: 'The archive is empty',
        searchEmpty: 'Nothing found',
        tagsEmpty: 'No tags yet',
        tagsEmptyHint: 'Write #tag in a note and it will show up here.',
        scrollTop: 'Back to top',
        collapse: 'Collapse',
        expand: 'Expand',
        menu: 'Actions',
        run: '{0} times: {1} — {2}',
        runShow: 'Show',
        runHide: 'Hide',
    },

    search: { placeholder: 'Search', clear: 'Clear search', exact: 'Exact match', filters: 'Filters' },

    date: { today: 'Today', daysLeft: 'Days: {0}', quarterTag: 'Q' },

    repeat: {
        one: { day: 'Every day', week: 'Every week', month: 'Every month', year: 'Every year' },
        many: { day: 'Every {0} days', week: 'Every {0} weeks', month: 'Every {0} months', year: 'Every {0} years' },
    },

    editor: {
        title: { create: 'New note', edit: 'Note', clone: 'Cloning' },
        done: 'Done',
        empty: 'Pick a note or create a new one',
        due: { label: 'Due', today: 'Today', prev: 'Previous day', next: 'Next day', add: 'Add days: {0}' },
        format: { label: 'Formatting', bold: 'Bold', italic: 'Italic', code: 'Code', list: 'List', quote: 'Quote', link: 'Link' },
        body: { label: 'Text', placeholder: 'Write the note', hint: 'Markdown, #tags and links are supported' },
        items: { label: 'List', placeholder: 'Item', add: 'Add item', remove: 'Remove item' },
        repeat: {
            label: 'Repeat',
            none: 'Do not repeat',
            day: 'Every day',
            week: 'Every week',
            month: 'Every month',
            half: 'Every six months',
            year: 'Every year',
            custom: 'Custom period…',
            every: 'Every',
            unit: { day: 'days', week: 'weeks', month: 'months', year: 'years' },
        },
        error: { badDate: 'Invalid date', empty: 'Enter text or add at least one item', tooOld: 'The due date cannot be earlier than {0} days ago', badRepeat: 'The repeat period is 1 to {0}' },
    },

    trash: { empty: 'The trash is empty', hint: 'Deleted notes are kept here for {0} days.', restore: 'Restore', purge: 'Delete forever', emptyAll: 'Empty the trash' },

    data: {
        title: 'Data',
        exportJson: 'Download JSON',
        exportMarkdown: 'Download Markdown',
        importHint: 'Import: a JSON file from this app or its earlier version. Drop it here or click',
        removeAll: 'Delete everything',
        removeAllMessage: 'All notes go to the trash for {0} days. The deletion can be undone.',
        removeAllDone: 'All notes deleted',
    },

    import: {
        done: 'Import finished. Added: {0}, updated: {1}, skipped: {2}.',
        upgraded: 'A version {0} file was upgraded to version {1}.',
        upgradedLegacy: 'A file from the first app was converted to version {0}.',
        invalid: 'Damaged records: {0}.',
        expired: 'Older than a year, not imported: {0}.',
        notJson: 'The file does not look like JSON.',
        unknown: 'The file was not recognised: it must be JSON saved by this app or its earlier version.',
        newer: 'The file was made by a newer version of the app (version {0}). Update the app.',
        tooLarge: 'The file is too large (over {0} MB).',
        unreadable: 'The file could not be read.',
    },

    sync: {
        title: 'Sync',
        enable: 'Sync between devices',
        url: 'Document address',
        urlHint: 'https:// (or http://localhost). The token may be part of the address. A sample server: examples/README.md.',
        urlInvalid: 'An https:// (or http://localhost) address is required',
        authorization: 'Authorization header',
        authorizationHint: 'Optional: Bearer … or Basic …',
        now: 'Sync now',
        status: {
            off: 'Off.',
            idle: 'Everything is in sync.',
            syncing: 'Syncing…',
            offline: 'No network: will sync when it is back.',
            error: 'Sync failed.',
        },
        lastAt: 'Last time: {0}.',
        done: 'Synced',
        error: {
            network: 'The server is unreachable. Check the address and the network.',
            timeout: 'The server did not answer in time.',
            unauthorized: 'No access: check the token or the Authorization header.',
            server: 'The server returned an error.',
            badResponse: 'The server response does not look like Next Up data.',
            tooLarge: 'The data is too large.',
            newer: 'The server holds data from a newer version of the app. Update the app.',
            conflict: 'The data on the server changes too often. Try again.',
        },
    },

    toast: { removed: 'Note deleted', done: 'Note completed', reopened: 'Back in progress', itemOn: 'Item checked', itemOff: 'Check removed', undo: 'Undo', redo: 'Redo', nothingToUndo: 'Nothing to undo', nothingToRedo: 'Nothing to redo' },

    notify: { today: 'Notes due today: {0}' },

    command: { undo: 'Undo', redo: 'Redo', create: 'New note', search: 'Search', settings: 'Settings' },

    storage: {
        corrupt: 'Saved data could not be read. A copy was kept and the list was started over.',
        newerVersion: 'The data was saved by a newer version of the app. Changes will not be saved.',
        migrated: 'Data from the previous version was carried over. The backup is untouched.',
        invalid: 'Damaged records skipped: {0}.',
        saveFailed: 'Could not save changes.',
        quotaFull: 'Browser storage is full: changes were not saved. Download a copy in settings and delete old notes.',
        memoryOnly: 'Browser storage is unavailable: changes last only until the page is closed.',
    },

    settings: {
        title: 'Settings',
        language: 'Language',
        mode: { title: 'Theme', auto: 'Auto', light: 'Light', dark: 'Dark' },
        palette: { title: 'Palette', default: 'Default' },
        size: { title: 'Interface size', small: 'Small', medium: 'Medium', large: 'Large' },
        hideFar: 'Collapse notes further than {0} days',
        notify: {
            label: 'Notify about notes due today',
            hint: 'Once a day, when the date changes, if the tab is in the background.',
            denied: 'Notifications are blocked in the browser settings.',
            unsupported: 'This browser does not support notifications (https or localhost is required).',
        },
        dev: { notice: 'Test notification', replace: 'Replace', title: 'Development', demo: 'Demo data', demoConfirm: 'Replace all notes with demo data?' },
    },
} satisfies DeepStrings<typeof ru>;
