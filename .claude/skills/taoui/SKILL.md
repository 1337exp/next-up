---
name: taoui
description: Build Vue 3 interfaces with @1337exp/taoui 5 (TaoUI) — setup, themes and palettes, size / density / tone / surface contexts, the typography layer, components and their props, and the mistakes people make with them. Use when code imports @1337exp/taoui, uses Tao* components or --tao-* tokens, or the user asks for TaoUI.
---

# TaoUI 5

A Vue 3 component kit on design tokens. Components read **roles** (CSS custom properties `--tao-*`), never colours, so a
theme, a palette or a context class changes every component under it. The props of every component, with types and
defaults, are in [references/components.md](references/components.md); read the section you need before writing a
component you have not used yet.

## Setup

```js
import { createApp } from 'vue'
import TaoUI, { localeRu } from '@1337exp/taoui'   // ESM-only; Vue 3.4+
import '@1337exp/taoui/styles.css'                    // required: tokens, themes, contexts, typography
import '@1337exp/taoui/palettes.css'                  // optional: the 7 ready palettes

createApp(App).use(TaoUI, { locale: localeRu }).mount('#app')   // locale optional, English by default
```

- Nuxt 3: the same `app.use` in a plugin, the CSS in `app.vue`. Everything is SSR-safe.
- Components can also be imported one by one: `import { TaoButton } from '@1337exp/taoui'`.
- Browser floor: Chrome / Edge 111, Safari 16.4, Firefox 128 (`@property`, container queries, `color-mix()`).

## Rules that keep an app consistent

1. **Colours come from roles**, never hex: `var(--tao-color-text-muted)`, `--tao-color-accent`, `--tao-color-surface`,
   `--tao-color-border`, `--tao-color-danger`… A hex in app CSS breaks the light mode and every palette.
2. **Status is `tone`**, the same everywhere: `success | danger | warning | info | neutral` (the accent when omitted) on
   TaoButton, TaoAlert, TaoTag, the stripe of TaoCard / TaoBlock (`stripeTone`), TaoTimeline markers; `toast().danger()`. Say the status in words
   too: colour alone is not a message.
3. **Size and density are contexts**, not props on every control: `class="tao-size-small"` (or `-medium`, `-large`) and
   `class="tao-density-compact | comfortable | auto"` on any container change every control inside. An explicit `size`
   prop wins. `comfortable` gives touch-sized controls (34 / 44 / 52px); `auto` is comfortable on `pointer: coarse`.
4. **A surface is a material**: `surface="flat | grain | glass"` on TaoCard / TaoBlock or `class="tao-surface-glass"` on any
   element. Glass needs something behind it (popovers, a header over a scroll).
5. **Floating panels** (Select, Combobox, Date, Popover, Tooltip, menus) are teleported to `body`; they carry the size and
   the density of where they hang from by themselves. Do not wrap them in `overflow: hidden` expecting a clip.
6. **Do not restyle internals by class names** (`.tao-select__panel` …) unless the reference says a class is public;
   tune tokens instead. When you must, note that `TaoGrid` lays out on `.tao-grid__cells`, not on `.tao-grid`.
7. **Text content goes in `.tao-prose`**: the library never styles a bare `h1` or `p`. `<article class="tao-prose">` gives
   headings, lists, quotes, code and links; `<h2 class="tao-heading-5">` gives any tag the look of a level.

## Themes and palettes

```html
<html data-tao-mode="light">                              <!-- the default theme, light -->
<html data-tao-theme="lagoon">                            <!-- a palette, dark -->
<html data-tao-theme="lagoon" data-tao-mode="light">      <!-- its light twin -->
```

Palettes: `sunset`, `marple`, `violet-dusk`, `ocean-blue`, `pinheiro`, `tokyo-night`, `lagoon` (`taoPalettes`). Put the
attributes on `<html>` so teleported panels follow. Your own palette at run time:
`applyTaoPalette({ name, label, stops: [darkest, …, lightest] }, 'dark' | 'light', element?)` returns a function that
takes it off; `taoPaletteCss(def)` gives the CSS. `class="tao-atmosphere"` on `<body>` paints the soft glow behind a page.

Contrast: every palette keeps WCAG 2 numbers (4.5:1 text, 3:1 fills); the polarity of a label on a fill is chosen by APCA,
so light-mode fills carry white labels. `contrastRatio(a, b)` and `apcaContrast(text, bg)` are exported: use APCA to
choose a text colour, WCAG 2 to promise a number.

## Layout

- `TaoContainer` (page width), `TaoFlex` / `TaoSpace` (rows and stacks with `gap`), `TaoDivider`, `TaoSplit` (resizable panes).
- `TaoGrid min="220px"` — a catalog of equal tiles. `TaoGrid :cols` + `TaoGridItem :col :row :order` — a bento. Values can be
  per width class **of the grid itself**: `compact` < 600px, `medium` < 840px, `expanded`:
  `:cols="{ compact: 3, expanded: 6 }"`, `:col="{ compact: 'full', expanded: 4 }"`, `:order="{ compact: 9 }"`. A plain
  number is one column on compact. `rowHeight` is the exact row height (a mosaic: pictures are cropped).
- `TaoNav` — app navigation from one list: a bottom bar, a rail or a drawer, `layout="auto"` by its own width; put the page
  in its default slot and it lays it out. `floating` makes the bar a detached pill (the FAB is your own button beside
  it). `select(id, event)` + `event.preventDefault()` to route with a router. Widths `--tao-nav-rail-width` /
  `--tao-nav-drawer-width`; the action button may take `shortcut="N"` (shown in the side panel, hidden when round). `surface="glass"` for a
  translucent bar over the page (as on TaoCard; it turns solid where blur is off). `#footer`: a small line under the
  items (version, About) in the rail and the side panel.

## Forms

- Every field takes `size`, `disabled`, `error` (a red frame). The message, the label and the hint go through
  **`TaoFormField`** (`label`, `hint`, `error`), which also wires `id`, `aria-describedby` and `aria-invalid`.
- `TaoInput`, `TaoTextarea`, `TaoInputNumber`, `TaoQuantity`, `TaoSelect`, `TaoCombobox`, `TaoDate` (`editable` to type `5`, `5.3`, `05.03.26`) / `TaoDateRange`
  (`YYYY-MM-DD` strings), `TaoCalendar` (the inline month calendar, `mode="single" | "range"`), `TaoCheckbox`,
  `TaoChecklist` (one model for a group), `TaoRadioGroup` + `TaoRadio`, `TaoSwitch`, `TaoSegmented`, `TaoSlider` /
  `TaoRangeSlider`, `TaoPinCode` (`status="success | error"` after `complete`), `TaoColorInput` / `TaoColorPicker`,
  `TaoFileDrop`. A form is a plain `<form>`; there is no TaoForm.
- Attributes given to a field (`aria-label`, `name`, `autocomplete`, `inputmode`, `data-*`, listeners) reach its control
  (the input, the trigger button, the checkbox); `class` and `style` stay on its wrapper. A field that reads as text
  (an item of a list being edited): `<TaoInput variant="plain">` (`TaoInputNumber`, `TaoCombobox` and `TaoTextarea` take the same `variant`). On `TaoColorInput` the
  `aria-label` is followed by the colour («Background: #ff8800»); `TaoColorPicker` is a group it names.

## Overlays and feedback

- `TaoModal` (`fullscreen`, `fullscreen="narrow"` for a page on a phone), `TaoDrawer` (`side="bottom"` is the phone's
  bottom sheet) — v-model; Escape closes the top layer only. `TaoPopover`, `TaoTooltip` (`placement`).
- Menus share one engine: `TaoDropdownMenu`, `TaoMenubar`, `TaoContextMenu`, `TaoMenu` (the panel for your own shell).
  Items are a data tree `TaoMenuItem[]`: `{ id, label, icon?, shortcut?, disabled?, items? }`,
  `{ type: 'checkbox' | 'radio', checked }`, `{ type: 'label' | 'separator' }`. `@select="id => …"`. `closeOnScroll`.
  With TaoUX, `createCommands().toMenu(layout)` builds this tree and binds the same shortcuts.
- `TaoToolbar` (one tab stop, arrows walk it) with `TaoToolbarGroup` and `TaoToolbarSeparator`; toggles are
  `TaoButton v-model:pressed`, a one-of-many choice inside it is `TaoSegmented`.
- `toast().success().message('Saved')`, `toast().danger().title('Network').timeout(5000).message('…')`,
  `.action('Undo', fn)`. `await confirm().title('Delete?').message('…').danger()` resolves to a boolean.
  Their hosts `TaoToastViewport` / `TaoConfirmHost` mount themselves on the first call; place them yourself only to control
  where they render.
- `TaoAlert` (`tone`, `title`, `closable`, `collapsible` + `v-model:collapsed`), `TaoEmpty`, `TaoLoader`, `TaoSkeleton`,
  `TaoProgress`.

## Data and display

`TaoTable` (columns, sort, row click), `TaoPagination` (`pageInput` for hundreds of pages), `TaoList` / `TaoListItem` (`roving`: one Tab stop, arrows between the rows),
`TaoTree` (expand, select, tri-state `checkable`, lazy `load`), `TaoStages`, `TaoTimeline` (`active` makes it a progress),
`TaoTag`, `TaoAvatar`, `TaoImage`, `TaoCarousel`, `TaoCard` (`#media`, `#title`, `#sub`, `#footer`, `#corner`, `closable`,
`stripe` + `stripeTone`), `TaoBlock`, `TaoTabs`, `TaoBreadcrumb`, `TaoLink`, `TaoSpoiler` / `TaoSpoilerGroup`, `TaoCounter`,
`TaoCopy`, `TaoMarquee` (one line that runs round only when it does not fit), `TaoScrubber` (play / pause + time),
`TaoScrollTop`, `TaoAnimatedBorder`, `TaoIcon`.

Small charts only: `TaoSparkline` (a trend), `TaoMeter` (a value in a range, `low` / `high` / `optimum`), `TaoDonut`
(`segments` or `value` of `max`), `TaoHeatmap` (`values` by `rows` × `cols`, threshold `steps` with a legend, a grid the
arrows move through). Series colours `--tao-color-chart-1…6`. For a real chart (axes, tooltips) use a chart
library and feed it `taoChartTheme()` / `watchTaoChartTheme(apply)`; do not build axes by hand.

## Icons

`<TaoIcon name="tao-check" />`: 40 built-in SVG icons under the `tao-` prefix (incl. `tao-settings`, `tao-edit`, `tao-trash`, `tao-bell`, `tao-tag`, `tao-repeat`, `tao-undo`, `tao-redo`) (`taoIconNames`). Your own:
`registerTaoIcons({ rocket: { body: '<path d="…"/>' } })` on a 24 grid with `currentColor`; add `grid: true` for icons made
only of straight lines through the middle (a plus), so they stay crisp when small. Any other name renders the class
`icon-<name>` for an icon font you bring.

## Language

`app.use(TaoUI, { locale: localeRu })`; `setTaoLocale(localeEn)` switches at run time without a reload; a prop passed by
hand (`placeholder`, `closeLabel`…) always wins. For SSR per request, `provideTaoLocale`.

## Mistakes to avoid

- Writing hex colours or `rgba()` in app CSS instead of roles; inventing token names (check `styles.css`).
- Passing `size` to every control instead of one `tao-size-*` / `tao-density-*` class on the container.
- Styling `.tao-grid` as a grid (it is `.tao-grid__cells`); expecting `rowHeight` to be a minimum (it is exact).
- Putting `TaoMarquee` in a parent without left room: the left fade takes `fade` px (22) left of the text.
- Using colour alone for a status; forgetting `aria-label` on an icon-only button (`TaoButton icon="tao-plus"` needs one).
- Global `h1 { … }` styles fighting `.tao-prose` (its rules are `:where()`, so yours win by design).
- Expecting `variant="danger"` on a button: the colour is `tone="danger"`, the shape is `variant`.
- Importing from deep paths (`@1337exp/taoui/dist/...`); only the package root, `styles.css`, `palettes.css` and
  `styles/*` are public.

Migrating from TaoUI 4: `MIGRATION-5.md` in the package lists every rename; `CHANGELOG.md` explains each change.
