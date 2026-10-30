<h1 align="center">Next Up</h1>

<p align="center">
  <b>Notes with due dates.</b><br>
  What to do, when, and how long is left.
</p>

<p align="center">
  <b>English</b> · <a href="README.ru.md">Русский</a> ·
  <a href="#how-it-works">How it works</a> ·
  <a href="#data-and-versions">Data</a> ·
  <a href="#sync-between-devices">Sync</a> ·
  <a href="docs/DESIGN.md">Design</a>
</p>

Markdown text, checklist items with the time they were ticked, repeats, search that forgives typos, tags. It works on a desktop, a tablet and a phone, installs as an app (PWA) and opens without a network. Vue 3 + TypeScript + Vite + [TaoUI](https://www.npmjs.com/package/@1337exp/taoui) and [TaoUX](https://www.npmjs.com/package/@1337exp/taoux). The interface is in Russian and English.

The structure and the decisions taken: [docs/PLAN-v3.md](docs/PLAN-v3.md). The interface design (audit, decisions, rules): [docs/DESIGN.md](docs/DESIGN.md). Notes for the libraries found along the way: [docs/library-issues.md](docs/library-issues.md), [-2](docs/library-issues-2.md), [-3](docs/library-issues-3.md). The docs are in Russian.

## Commands

```bash
npm install
npm run dev              # development
npm run build            # vue-tsc + vite build (dist/ holds the service worker with the offline cache too)
npm test                 # vitest
npm run example:server   # demo sync server, see examples/README.md
```

## How it works

- **A note** is a due date (a calendar day), Markdown text, checklist items and a repeat rule. «Upcoming» is the notes due today or later; the archive is the notes whose date has passed or that are done.
- **A list by time.** «Today», «Tomorrow», «This week» (till Sunday), «Later»; every row shows how long is left («in 3 days») and the date. The circle on the left finishes a note in one tap. Rows are separated by a thin line. The archive is grouped by month.
- **Quick input.** The «What to remember?» field: `buy a gift on friday #home every week` → a note with a date, a repeat and a tag; under the field you see how the text was read. It understands «today / tomorrow», «on friday», «in 3 days», «nov 5», «30.10», «every day / week / monday», «every 2 weeks» (and the same in Russian). The parser: `src/core/quick.ts`. On a phone the field starts as a «+» button under the thumb: a tap opens it, and on an empty field the button opens the full note.
- **Repeats** are «every N days / weeks / months / years» (presets and your own period). Every repeat is a separate record with an id like `series@date`, so two devices create the same records, not duplicates. Archived repeats of one series in a row fold into one line.
- **Tags** are `#word` right in the text; a click on a tag searches by it; over the list are chips of the five latest tags, and the rest, with the number of notes, are behind the «All tags…» chip (it shows up only when there is something to show).
- **Search** takes all words in any order, does not tell «е» from «ё», forgives typos (`mlik` finds `milk`); `#tag` is matched exactly; «Exact match» is in the settings.
- **The week.** Over the list are the seven days of the current week (the arrows turn the weeks), the dots show where the notes are, today is marked with a line; a tap on a day leaves only that day in the list, another tap clears it. It can be switched off in the settings.
- **Keyboard in the list.** One `Tab` stop for the whole list: the arrows move between rows, `Home` / `End` go to the start and the end, `Enter` opens, `Space` finishes, `Delete` deletes (with undo), the menu key opens the row's actions.
- **Reading.** A click on a row (or `Enter`) opens the note for reading: the text is drawn as a document, you can select and copy it, links and tags are clickable, items are ticked right there. `E` or «Edit» is editing, `Esc` from editing goes back to reading. Finishing, copying and deleting a note happen in the list.
- **Swipes** (TaoUX `swiperow`, touch screens): right to finish (in the archive, to bring back), left for a copy, delete and edit. A long swipe to the left runs «Edit» (not delete); it can be turned off in the settings.
- **The editor** has no «Save» button: a change goes by itself after a short pause, and «Saved» shows at the bottom. The text comes first with the Markdown bar over it (`Ctrl+B` / `Ctrl+I` / `Ctrl+K`). The date and the repeat are one block: «Today», «Tomorrow», an «Add» button (+1, +7, +30, +90 days to the date) and the date. Items have checkboxes, reordering by drag (or the keyboard) and delete by `Backspace` in an empty one. On a desktop the editor is to the right of the list, on a tablet a window over the list, on a phone the full screen.
- **Undo instead of confirmations.** Delete, finish and import happen at once, with «Undo» at the bottom; `Ctrl+Z` / `Ctrl+Shift+Z` go by records, not by snapshots of the list. The only dialog is «Delete everything».
- **The trash** keeps deleted notes for 30 days: restore or delete for good.

Keys (global): `N` is a new note (the full form), `/` is search, `Ctrl+,` is the settings, `Enter` on a row opens it, `Esc` in the note text closes the editor (the focus goes back to the row).

## Data and versions

Everything is stored in the browser (`localStorage`); no server is needed. The format is versioned: an export file, the content of the storage and a server reply go through one pipeline that finds the version and lifts the data to the current one (the very first app's file → the previous Next Up → the current). A file of a newer version is left alone, and the app asks you to update. The keys of the previous version are copied on the first start, not moved.

Settings → Data: export as JSON (to move and to back up) and as Markdown (a readable dump), import with a report («added / updated / skipped», which file version was lifted).

## Sync between devices

Settings → Sync: the address of a document and, if needed, an `Authorization` header. The protocol is plain conditional HTTP (`GET` and `PUT` with `ETag` / `If-Match`), so WebDAV (Nextcloud) or any server with ETag will do; there is a demo server to try. A change goes out in 3 seconds, other people's changes come on start, on return to the tab and when the network is back. There are no conflict dialogs: the merge goes by records (the later change wins, a delete does not come back to life). The protocol and what your own server needs: [examples/README.md](examples/README.md).

## Notifications and offline

- **Offline.** After the first load the app opens without a network: the service worker (`public/sw.js`) caches the shell, and the file list and the version are put in by the build (`build/precache.ts`). It can be put on the home screen of a phone or a tablet.
- **Notifications.** Settings → «Notify about notes due today»: once a day, when the date changes, if the tab is in the background. The permission is asked on the click of the switch; `https` or `localhost` is needed. Notifications with the app fully closed would need a push server, which is not here.

## Look

The dark theme is the default; in the settings it changes to light or «as in the system», and there are the palette and the interface size (small / medium / large). It is all done by TaoUI contexts (`data-tao-mode`, `data-tao-theme`, `tao-size-*`), with no multipliers of our own.

The layout is picked by width: on a phone a floating glass bar (the quick input is pinned above it), a rail on a tablet, a side panel and the editor beside the list on a desktop. The app is capped at 1320 px (`--nu-app-max`) and stands in the centre on a very wide monitor. The side menu and the note window have a light grain (`surface="grain"`); glass goes off with «reduce transparency» in the system, the grain with «more contrast». Secondary text keeps the contrast of at least 4.5:1 in the light and the dark themes, and the current section in the menu differs not by colour alone but by weight as well.

The font is Roboto, variable (weight 100–900), Latin and Cyrillic: `src/assets/font` (the SIL OFL 1.1 licence is next to it).

## Development mode

A «Development» block shows up in the settings (demo data, a notification check). The mode turns on by itself: in `npm run dev`, on `localhost` or on an IP address, or with a flag:

```js
localStorage.setItem('nextup-dev', '1');   // on anywhere
localStorage.setItem('nextup-dev', '0');   // off (also on an IP address)
localStorage.removeItem('nextup-dev');     // back to automatic
```

In development mode the service worker is not registered (its cache would get in the way of edits); check offline on the built version: `npx vite preview`.

## Structure

```
src/core/      plain TypeScript: model, dates, repeats, merge, undo, search, tags, Markdown formatting, import and sync (no Vue, no DOM)
src/app/       the notes store, storage, settings, sync, notifications
src/ui/        the shell (TaoNav + TaoSplit), the list, the row, the editor and the reader, the settings
src/i18n/      ru / en dictionaries (typed, on createI18n from TaoUX)
build/         the build plugin for the offline cache
examples/      the demo sync server
tests/         vitest: core, store, editor, sync (also against a real server), migrations on frozen files
```
