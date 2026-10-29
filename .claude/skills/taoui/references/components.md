# TaoUI components: props, events, slots

Generated from the showcase prop tables by `npm run skill`; do not edit by hand.
A default "inherited" means the value comes from a context class on an ancestor (size, density).

## TaoBlock

Showcase section: `#block`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `padding` | `number \| string \| (…)[]` | 16 | Inner padding. A number is px, a string is any CSS length. An array works like CSS padding (1–4 values) |
| `radius` | `number \| string` | 8 | Corner radius. A number is px, a string is CSS |
| `shadow` | `boolean` | true | Panel shadow |
| `hover` | `boolean` | false | Stronger shadow on hover, pointer cursor |
| `surface` | `'flat' \| 'grain' \| 'glass'` | 'flat' | What the block is made of: fill / grain / glass. See “Surfaces” |
| `stripe` | `'top' \| 'left' \| 'bottom'` | — | A coloured stripe on one side; the corners clip it (over a picture in #media too) |
| `stripeTone` | `tone \| 'gradient'` | 'accent' | The stripe colour: accent, success / danger / warning / info / neutral, or the palette gradient. Say a status in the text as well |

**Slots, events, notes.** default — the block content.

## TaoButton

Showcase section: `#button`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `type` | `'button' \| 'submit' \| 'reset'` | 'button' | The native button type |
| `variant` | `'primary' \| 'secondary' \| 'ghost' \| 'text'` | 'primary' | Shape. The colour is tone |
| `tone` | `'accent' \| 'neutral' \| 'success' \| 'danger' \| 'warning' \| 'info'` | 'accent' | The colour, on any variant. accent is the theme accent. neutral keeps the text strong and only the hover wash takes the theme colour: the quiet action next to a primary one |
| `size` | `'small' \| 'medium' \| 'large'` | inherited | Size. Without it — the size of the ancestors (the tao-size-* class or size on FormField / InputGroup), otherwise medium |
| `disabled` | `boolean` | false | Disabled |
| `loading` | `boolean` | false | A spinner, the click is swallowed |
| `block` | `boolean` | false | 100% width |
| `minWidth` | `number \| string` | — | Minimum width (number = px); the --tao-button-min-width variable |
| `icon` | `string` | '' | An icon before the text: a name for TaoIcon (tao-plus, your own or a font one). Without text and slot the button is a square of the control height and needs aria-label |
| `iconEnd` | `string` | '' | An icon after the text |
| `v-model:pressed` | `boolean` | — | A toggle button (Bold, a filter): aria-pressed and the tone tint while pressed. Without it the button is an ordinary one |
| `shortcut` | `string` | — | The key that does the same (N, Ctrl+K): shown at the end of the button, given as aria-keyshortcuts. It only shows the key; listening to it is the app's job |

**Slots, events, notes.** default — the button caption.

## .tao-prose / .tao-heading-*

Showcase section: `#typography`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `--tao-text-base` | `length` | 16px | The text size and h6; the scale is counted from it |
| `--tao-text-ratio` | `number` | 1.25 | The step of the scale: each level up is multiplied by it (1.2 calmer, 1.333 bolder). Set it on any element and the scale under it follows |
| `--tao-heading-1…6` | `length` | 49 / 39 / 31 / 25 / 20 / 16 | The steps, ready for your own rules; h1 and h2 in .tao-prose shrink on a narrow screen (not below h3 / h4) |
| `--tao-line-height-body / -heading` | `number` | 1.6 / 1.25 | Line height of text and headings |
| `--tao-font-family-mono` | `font` | ui-monospace… | The code font in .tao-prose |

**Slots, events, notes.** .tao-prose on a wrapper: headings, paragraphs, lists, quotes, code, hr, links (the theme link colour), images; spacing by proximity. Every rule inside is :where(), your CSS wins. .tao-heading-1…6 — the look of a level on any tag (h2 class="tao-heading-5").

## Classes and tokens

Showcase section: `#surface`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `.tao-surface-grain` | `class` | — | Static film grain. Any element |
| `.tao-surface-glass` | `class` | — | A translucent fill + background blur. Without blur support, or with prefers-reduced-transparency, it is solid |
| `--tao-surface-grain-image / -size` | `image / length` | SVG / 160px | Your own grain texture |
| `--tao-glass-fill / -border / -blur` | `color / color / length` | 55% / white 8% / 16px | Glass |

**Slots, events, notes.** A surface belongs to a single element: nested panels do not inherit it. Toast and confirm are glass by default: toast.defaults({ surface: 'flat' }) / confirm.defaults({ surface: 'flat' }) turn it off.

## TaoCard

Showcase section: `#card`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `padding` | `number \| string \| (…)[]` | var(--tao-space-5) | Padding of the card body. A number is px, a string is CSS. With flush — 0. Published as --tao-pad |
| `radius` | `number \| string` | var(--tao-radius-panel) | Corner radius. A number is px, a string is CSS. Published as --tao-radius; children get --tao-radius-inner |
| `shadow` | `boolean` | true | The regular shadow. Off with flush |
| `shadowBottomOnly` | `boolean` | false | A line at the bottom of the card, not a scrim over the photo |
| `flush` | `boolean` | false | A tile: no padding and no shadow, cover/body fill the whole cell |
| `hover` | `boolean` | false | An accent outline on hover |
| `surface` | `'flat' \| 'grain' \| 'glass'` | 'flat' | What the card is made of: fill / grain / glass. See “Surfaces” |
| `stripe` | `'top' \| 'left' \| 'bottom'` | — | A coloured stripe on one side; the corners clip it (over a picture in #media too) |
| `stripeTone` | `tone \| 'gradient'` | 'accent' | The stripe colour: accent, success / danger / warning / info / neutral, or the palette gradient. Say a status in the text as well |
| `active` | `boolean` | false | The selected state |
| `overflow` | `boolean` | false | Do not clip the content (media / carousel) |
| `closable` | `boolean` | false | A close button in the top right corner; the parent removes the card on the close event |
| `closeLabel` | `string` | 'Close' | aria-label of the close button |

**Slots, events, notes.** default — the body. #media (a photo or a carousel on top), #overlay (a scrim over the media or the whole tile), #header (the top row: laid out as you like), #title, #sub, #footer, #corner (the top right corner: a tag, a menu button; the title leaves room for it, the width is the variable --tao-card-corner-size). The close event — the cross was pressed.

## TaoMarquee

Showcase section: `#marquee`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `text` | `string` | '' | The line; or anything inline in the slot (a link, an icon, bold text) |
| `speed` | `number` | 40 | Speed, pixels per second |
| `gap` | `number` | 48 | The gap between the end of the line and its next round, px |
| `fade` | `number` | 22 | The width of the fading edges, px. The left fade lives in a padding outside the text: at rest the line stands where it would, but the parent needs that much room on the left (its padding, or a smaller fade; 0 for none) or the running text shows past its edge |
| `pauseOnHover` | `boolean` | true | Stop on hover |
| `paused` | `boolean` | false | Stopped by the app |

**Slots, events, notes.** default — the content of the line; its copies for the second round are hidden from a screen reader and inert. It runs only when it does not fit; it stops on hover, on focus (a running line is a tab stop) and on a tap; with «reduce motion» it wraps. measure() — measure again by hand.

## TaoCopy

Showcase section: `#copy`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `text` | `string` | — | The string for the clipboard. Required |
| `successText` | `string` | 'Copied!' | The tooltip text after the click |
| `copyLabel` | `string` | 'Copy' | aria-label of the button |
| `tip` | `boolean` | true | Show a tooltip above the button after copying |

## TaoInput

Showcase section: `#input`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `v-model` | `string \| number` | '' | The field value |
| `type` | `'text' \| 'password' \| 'email' \| 'number' \| 'tel'` | 'text' | The native input type |
| `placeholder` | `string` | '' | The hint inside |
| `size` | `'small' \| 'medium' \| 'large'` | inherited | Size, the same scale as TaoButton. Without it — the size of the ancestors (tao-size-* or size on FormField / InputGroup), otherwise medium |
| `disabled` | `boolean` | false | Disabled |
| `error` | `boolean` | false | A red border. The error text is error on TaoFormField |
| `variant` | `'outline' \| 'filled' \| 'plain'` | 'outline' | A frame / a fill only / nothing: plain reads as text (an item of a list being edited): no inset, the caret shows the focus, an error is a red line under the text. The height does not change |
| `id` | `string` | auto | The input id; otherwise taken from FormField or useId |

**Slots, events, notes.** #prefix and #suffix — inside the frame, left/right (an icon, text).

## TaoInputGroup

Showcase section: `#input`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `size` | `'small' \| 'medium' \| 'large'` | inherited | The size of the whole group: addons, the field and buttons inside |

**Slots, events, notes.** default — the field itself (TaoInput etc.). #before / #after — a protocol, a unit, a button. Glues addon + field + addon into one frame.

## TaoInputNumber

Showcase section: `#input-number`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `v-model` | `number \| null` | null | A number. An empty field is null, not 0 and not a string |
| `min / max` | `number` | — | The bounds. If not set — no limit |
| `step` | `number` | 1 | The step of ± and the arrows |
| `precision` | `number` | — | Digits after the decimal point |
| `@commit` | `number \| null` | — | Edit finished: blur, Enter, ±, arrow key (once per action; v-model fires per keystroke). |
| `controls` | `boolean` | true | ± buttons on the right |
| `size` | `'small' \| 'medium' \| 'large'` | inherited | Size, the same scale as TaoButton. Without it — the size of the ancestors (tao-size-* or size on FormField / InputGroup), otherwise medium |
| `disabled` | `boolean` | false | Disabled |
| `error` | `boolean` | false | A red border. The error text is error on TaoFormField |
| `variant` | `'outline' \| 'filled' \| 'plain'` | 'outline' | As on TaoInput: a frame / a fill only / nothing (the field reads as text, an error is a red line under the text) |
| `placeholder` | `string` | '' | The hint when null |

## TaoQuantity

Showcase section: `#quantity`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `v-model` | `number` | 1 | A whole quantity. Never empty |
| `min` | `number` | 1 | The lower bound |
| `max` | `number` | — | Stock. If not set — no ceiling |
| `allowRemove` | `boolean` | true | The minus at min stays alive and fires dec — the parent may remove the row |
| `forceMaxLimit` | `boolean` | true | Clamp the input to max on blur and when more than the stock arrives |
| `size` | `'small' \| 'medium' \| 'large'` | inherited | Size, the same scale as TaoButton. Without it — the size of the ancestors (tao-size-* or size on FormField / InputGroup), otherwise medium |
| `disabled` | `boolean` | false | Disabled |
| `error` | `boolean` | false | A red border. The error text is error on TaoFormField |

**Slots, events, notes.** #decrement-icon / #increment-icon — the button icons.

## TaoTextarea

Showcase section: `#textarea`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `v-model` | `string` | '' | Text |
| `placeholder` | `string` | '' | Hint |
| `rows` | `number` | 3 | The initial height |
| `maxlength` | `number` | — | Cuts the input |
| `count` | `boolean` | false | Show “typed / maximum” (together with maxlength) |
| `resize` | `boolean` | true | Can be dragged by the corner |
| `variant` | `'bar' \| 'outline' \| 'filled' \| 'plain'` | 'bar' | A stripe on the left / a frame like TaoInput / a fill only / nothing |
| `readonly` | `boolean` | false | Can be read and selected, but not edited |
| `noSpace` | `boolean` | false | A space cannot be typed — neither from the keyboard nor by pasting |
| `align` | `'start' \| 'center' \| 'end'` | 'start' | Text alignment |
| `autofocus` | `boolean` | false | Focus on mount |
| `blurOnEnter` | `boolean` | false | Enter drops the focus instead of inserting a line break (Shift+Enter inserts it); keydown goes out first |
| `size` | `'small' \| 'medium' \| 'large'` | inherited | Size, the same scale as TaoButton. Without it — the size of the ancestors (tao-size-* or size on FormField / InputGroup), otherwise medium |
| `disabled` | `boolean` | false | Disabled |
| `error` | `boolean` | false | A red border |

## TaoChecklist

Showcase section: `#checklist`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `items` | `TaoChecklistItem[]` | — | { value, label, description?, disabled? } |
| `v-model` | `(string \| number)[]` | [] | The checked values, in the order of the items |
| `legend` | `string` | — | The group caption (legend). In a TaoFormField the field gives it |
| `selectAll` | `boolean` | false | «Select all» on top: mixed when some are checked; toggles every enabled item |
| `counter` | `boolean` | false | «3 of 5» next to the caption, announced politely |
| `strike` | `boolean` | false | Strike the checked items through (a to-do list). A look only: the checkbox tells the state |
| `disabled` | `boolean` | false | The whole group is disabled |
| `error` | `boolean` | false | Red frames; the message goes to error of TaoFormField |
| `size` | `'small' \| 'medium' \| 'large'` | inherited | Size of the checkboxes |
| `selectAllLabel` | `string` | 'Select all' | The «Select all» label |
| `counterText` | `string` | '{checked} of {total}' | The counter text |

**Slots, events, notes.** #item — { item, checked }: your own item text. Events update:modelValue, change. «Select all» leaves a disabled item alone. A fieldset: in a TaoFormField the group takes the id, the label and the error of the field, the checkboxes inside keep ids of their own.

## TaoCheckbox

Showcase section: `#checkbox`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `v-model` | `boolean` | — | Checked / not |
| `checked` | `boolean` | — | The state without v-model |
| `label` | `string` | '' | The caption on the right |
| `indeterminate` | `boolean` | false | A dash instead of the tick. A click sets checked, the parent works out the mixed state |
| `disabled` | `boolean` | false | Disabled |
| `size` | `'small' \| 'medium' \| 'large'` | inherited | A 14 / 18 / 22 square and the caption font size. Without it — the size of the ancestors |
| `error` | `boolean` | false | A red accent. The error text goes through TaoFormField |

## TaoSelect

Showcase section: `#select`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `v-model` | `string \| number \| null` | null | value of the selected option. Clearing → null |
| `options` | `TaoSelectOption[]` | [] | { value, label, disabled? } |
| `placeholder` | `string` | 'Choose' | When the model is null |
| `disabled` | `boolean` | false | Disabled |
| `error` | `boolean` | false | A red border |
| `size` | `'small' \| 'medium' \| 'large'` | inherited | Size, as TaoButton; also scales the opened list. Without it — the size of the ancestors |
| `clearable` | `boolean` | true | Clear row and Delete / Backspace. Turn off when null is not valid. |
| `clearText` | `string` | 'Clear' | Label of the clear row. |

**Slots, events, notes.** #clear: content of the clear row (icon, markup), replaces clearText. #chevron: custom arrow.

## TaoSwitch

Showcase section: `#select`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `v-model` | `boolean` | false | On / off. role="switch" |
| `label` | `string` | '' | The caption on the right |
| `disabled` | `boolean` | false | Disabled |
| `size` | `'small' \| 'medium' \| 'large'` | inherited | The track is 28 / 36 / 44 px wide, and the caption font size. Without it — the size of the ancestors |
| `error` | `boolean` | false | A red border. The error text is error on TaoFormField |
| `loading` | `boolean` | false | The change is being applied: a spinner on the thumb, a click does nothing, not greyed out; aria-busy |

## TaoRadio / TaoRadioGroup

Showcase section: `#select`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `value` | `string \| number \| boolean` | — | Radio: the value of this point. Required |
| `v-model` | `the same` | — | Group holds the selection. A Radio without a group holds its own |
| `legend` | `string` | — | Group: the group caption |
| `direction` | `'row' \| 'column'` | 'row' | Group: in a row or in a column |
| `disabled` | `boolean` | false | A single point or the whole group |
| `error` | `boolean` | false | A red border. The error text is error on TaoFormField |
| `size` | `'small' \| 'medium' \| 'large'` | inherited | A 14 / 18 / 22 circle and the caption font size. On a group — for all the radios inside |
| `label / name` | `string` | '' | Radio: the caption and name, if there is no group |

## TaoFormField

Showcase section: `#select`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `label` | `string` | — | A shared caption above the control |
| `hint` | `string` | — | A hint under the field |
| `error` | `string` | — | The error text; if present, the field is invalid |
| `size` | `'small' \| 'medium' \| 'large'` | inherited | The size of the control inside |

**Slots, events, notes.** default — the control itself (Input, Select, Switch…).

## TaoSegmented

Showcase section: `#segmented`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `v-model` | `string \| number \| boolean` | — | value of the selected option |
| `size` | `'small' \| 'medium' \| 'large'` | inherited | The segment height, the same scale as TaoButton. Without it — the size of the ancestors |
| `block` | `boolean` | false | Stretch to the parent width |
| `minWidth` | `number \| string` | — | Minimum width of every option (number = px); the --tao-segmented-option-min-width variable |
| `legend` | `string` | — | The accessible name of the group |
| `disabled` | `boolean` | false | The whole group |
| `error` | `boolean` | false | A red border. The error text is error on TaoFormField |
| `name` | `string` | auto | name for the radio inputs inside |

**Slots, events, notes.** default — a set of TaoSegmentedOption.

## TaoSegmentedOption

Showcase section: `#segmented`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `value` | `string \| number \| boolean` | — | The option value. Required |
| `label` | `string` | '' | The text. Or the default slot |
| `icon` | `string` | '' | A TaoIcon name on the left |
| `count` | `number \| string` | — | A number on the right (a badge) |
| `disabled` | `boolean` | false | This option |

## TaoCombobox

Showcase section: `#combobox`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `v-model` | `string \| number \| null` | null | value of an option, or an arbitrary string with allow-create |
| `options` | `TaoSelectOption[]` | [] | { value, label, disabled? }. The list is not mutated by the component |
| `placeholder` | `string` | 'Start typing' | The empty field |
| `allowCreate` | `boolean` | false | A value that is not in the list can be kept |
| `emptyText` | `string` | 'Nothing found' | An empty filter |
| `size` | `'small' \| 'medium' \| 'large'` | inherited | Size, as TaoButton and TaoSelect; also scales the opened list. Without it — the size of the ancestors |
| `clearable` | `boolean` | true | Clear row in the list. Turn off when null is not valid. |
| `clearText` | `string` | 'Clear' | Label of the clear row; slot #clear replaces it. |
| `disabled / error` | `boolean` | false | Disabled / a red border |
| `variant` | `'outline' \| 'filled' \| 'plain'` | 'outline' | As on TaoInput: a frame / a fill only / nothing (the field reads as text, an error is a red line under the text) |

**Slots, events, notes.** create — an event when a new value is typed: the parent extends options itself.

## TypeaheadPlayground

Showcase section: `#typeahead`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `v-model` | `object \| null` | null | The selected hit { id, name, city, role } or null |

**Slots, events, notes.** #item="{ hit, active }" — a list row. #empty — nothing found. Not part of the npm package, lives in showcase/demo.

## TaoDate

Showcase section: `#date`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `v-model` | `string \| null` | null | A single day YYYY-MM-DD, with no time and no time zone |
| `min / max` | `string` | — | The bounds in the same format |
| `placeholder` | `string` | 'Date' | The empty field |
| `locale` | `string` | the app locale | The calendar captions and the order of day and month; without it the language of setTaoLocale |
| `editable` | `boolean` | false | A text field you type the date into, the calendar on the button next to it or ↓. In the locale's order of day and month: 5 is the 5th of this month, 5.3 the 5th of March (3/5 in en-US), 05.03.26, 0503, ISO. Enter or leaving the field applies it; a text that is not a date or is outside min / max puts the value back; Esc drops the typing; an empty field is null |
| `parse / format` | `(text, { locale, reference }) => string \| null / (iso, locale) => string` | — | Your own reading of the typed text («tomorrow») and your own text in the field; reference is the current value or today |
| `size` | `'small' \| 'medium' \| 'large'` | inherited | Size, the same scale as TaoButton. Without it — the size of the ancestors (tao-size-* or size on FormField / InputGroup), otherwise medium |
| `disabled / error` | `boolean` | false | Disabled / a red border |
| `todayText / clearText` | `string` | 'Today' / 'Clear' | The buttons at the bottom of the popup |
| `calendarLabel` | `string` | 'Choose a date' | aria-label of the calendar button of an editable field |

**Slots, events, notes.** #icon, #prev-icon, #next-icon — the icons of the field and of the month arrows.

## TaoDateRange

Showcase section: `#date`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `v-model` | `{ start, end } \| null` | null | A period YYYY-MM-DD. An incomplete choice is not written to the model |
| `min / max` | `string` | — | The bounds |
| `placeholder` | `string` | 'Period' | While null |
| `locale` | `string` | the app locale | The calendar captions; without it the language of setTaoLocale |
| `size` | `'small' \| 'medium' \| 'large'` | inherited | Size, the same scale as TaoButton. Without it — the size of the ancestors (tao-size-* or size on FormField / InputGroup), otherwise medium |
| `disabled / error` | `boolean` | false | Disabled / a red border |

**Slots, events, notes.** The first click is start, the second is end (they swap if end is earlier).

## TaoPinCode

Showcase section: `#pincode`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `length` | `number` | — | The number of cells. Not needed with format: it is counted from the mask |
| `format` | `string` | — | A mask with separators: # is a cell, the rest is a separator (#-##-## gives 0-00-00). Separators are not part of the value |
| `v-model` | `string` | '' | The cells glued into a string |
| `numbersOnly` | `boolean` | false | Digits only |
| `masked` | `boolean` | false | Dots instead of characters |
| `disabled` | `boolean` | false | Disabled |
| `error` | `boolean` | false | A red border. The error text is error on TaoFormField |
| `size` | `'small' \| 'medium' \| 'large'` | inherited | Cells 40×46 / 50×56 / 58×64. Without it — the size of the ancestors |
| `clearOn` | `'focus' \| 'input'` | 'focus' | focus — a click clears the cell and everything to the right; input — changes only on typing |
| `status` | `'idle' \| 'success' \| 'error'` | 'idle' | The result of the check, set by the app (on complete): error shakes the cells and paints them red, success runs a glow and paints them green; a screen reader hears it. Set idle again when the user edits; play() repeats the animation |
| `successText / errorText` | `string` | 'The code is correct' / 'Wrong code' | What a screen reader hears |
| `placeholder` | `string` | '' | The character in an empty cell |

**Slots, events, notes.** The complete event — the last cell was typed (it blurs).

## TaoProgress

Showcase section: `#slider`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `progress` | `number` | 0 | The fill 0–100, not the bar width |
| `minWidth / maxWidth` | `number` | 200 / — | The bar width in px |
| `height` | `number` | 8 | The thickness in px |
| `showPercentage` | `boolean \| 'top' \| 'right'` | true | true/top — above the bar, right — on the right, false — hide |
| `animated` | `boolean` | true | Smooth filling |

**Slots, events, notes.** #left / #right — captions. If #right is present, the percentage goes on the right in brackets.

## TaoSlider

Showcase section: `#slider`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `v-model` | `number` | — | The current value. Required. Two handles: TaoRangeSlider with a [from, to] pair |
| `min / max / step` | `number` | 0 / 100 / 1 | The range and the step |
| `marks` | `boolean \| (number \| { value, label? })[]` | — | Scale marks: true — automatic divisions, an array of numbers or objects with a caption. A click on a caption moves the handle |
| `marksSide` | `'start' \| 'end'` | 'end' | The marks side: end — under a horizontal slider and to the right of a vertical one, start — above and to the left |
| `discrete` | `boolean` | false | The value only on the marks (a stepped scale); the arrows follow the marks |
| `format` | `(value: number) => string` | — | Number text: the captions of automatic marks and the value on the bar |
| `flat` | `boolean` | false | No round handles: a flat bar with a fill. Keyboard and focus work |
| `vertical` | `boolean` | false | Vertical: the maximum on top, marks on the right. Length — --tao-slider-length (10rem) |
| `variant` | `'bar' \| 'thin'` | 'bar' | bar — a thick track, a form control; thin — a thin one (seek / volume). It used to be size="small" |
| `size` | `'small' \| 'medium' \| 'large'` | inherited | The scale of the track and the thumb (the thumb is 16 / 20 / 24). Without it — the size of the ancestors |
| `showValue` | `boolean` | false | The value over the bar |
| `disabled` | `boolean` | false | Disabled |
| `error` | `boolean` | false | A red outline of the track. The error text is error on TaoFormField |
| `wheel` | `number` | 0 | The change step for the mouse wheel (a single handle). 0 — disabled |
| `@change` | `value` | — | Finished changing: released, a key, the wheel, a click on a mark. v-model fires on every move |
| `#mark` | `{ mark, active }` | — | A custom mark caption |

## TaoRangeSlider

Showcase section: `#slider`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `v-model` | `[number, number]` | — | A [from, to] pair. Required |
| `minGap` | `number` | 0 | The smallest distance between the handles; the handles do not jump over each other |
| `…` | `` |  | The rest as in TaoSlider: min / max / step, marks, discrete, format, vertical, variant, size, showValue, disabled, error |

## TaoScrubber

Showcase section: `#slider`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `v-model` | `number` | — | The current time. Required |
| `v-model:playing` | `boolean` | false | Whether playback is running (the look of the button). The component does not keep time itself |
| `length` | `number` | — | The length; the slider goes from 0 to it. Required |
| `step` | `number` | 0.01 | The slider step |
| `marks` | `(number \| { value, label? })[]` | — | Event marks on the scale |
| `marksSide` | `'start' \| 'end'` | 'end' | The marks above the slider or below it |
| `format` | `(time: number) => string` | toFixed(2) | The time text in the marks and the caption |
| `pauseOnScrub` | `boolean` | true | Pause while the user holds the slider |
| `showRestart / showTime` | `boolean` | true | The “to the start” button; the “time / length” caption |
| `variant` | `'bar' \| 'thin'` | 'thin' | The track thickness |
| `size` | `'small' \| 'medium' \| 'large'` | inherited | Size; without it — the size of the ancestors |
| `disabled` | `boolean` | false | Disabled |
| `playLabel / pauseLabel / restartLabel` | `string` | from the locale | Button captions for screen readers |
| `@restart` | `—` | — | The “to the start” button (the time is already set to 0) |
| `@seek` | `time` | — | Finished seeking: the slider was released or a key was pressed |
| `#mark / #time` | `{ mark, active } / { time, length, text }` | — | A custom mark caption; a custom time caption |

## TaoColorPicker

Showcase section: `#color`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `v-model` | `string` | — | The colour as a hex string: #rrggbb, with alpha also #rrggbbaa. rgb()/rgba() is accepted on input too. Required |
| `alpha` | `boolean` | false | The opacity bar and #rrggbbaa |
| `swatches` | `string[]` | — | Ready colours under the palette; the selected one is marked |
| `modes` | `('hex' \| 'rgb' \| 'hsl')[]` | ['hex', 'rgb', 'hsl'] | Colour input modes; a single mode hides the switch |
| `v-model:mode` | `'hex' \| 'rgb' \| 'hsl'` | the first of modes | The current input mode; v-model:mode remembers the choice between openings |
| `eyedropper` | `boolean` | true | An eyedropper (only where the browser supports EyeDropper) |
| `disabled` | `boolean` | false | Disabled |
| `size` | `'small' \| 'medium' \| 'large'` | inherited | The field size; without it — the size of the ancestors |
| `areaLabel / hueLabel / alphaLabel / hexLabel / swatchesLabel / eyedropperLabel` | `string` | from the locale | Captions for screen readers (the colorPicker locale) |
| `@change` | `hex` | — | Finished editing: the square or a bar was released, a key, the hex field, a swatch. v-model fires on every move |

## TaoColorInput

Showcase section: `#color`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `v-model` | `string` | — | The colour as a hex string. Required |
| `alpha / swatches / modes / v-model:mode / eyedropper / size` | `` |  | As in TaoColorPicker |
| `placement` | `TaoPlacement` | 'bottom-start' | Side and alignment: top / bottom / left / right and -start / -end. Flips at the screen edge |
| `error` | `boolean` | false | A red border. The error text is error on TaoFormField |
| `disabled` | `boolean` | false | Disabled |

## colorModel(source, options)

Showcase section: `#color`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `source` | `Ref<T>` | — | Your colour storage. Returns a writable hex string for v-model |
| `format` | `'object' \| 'array' \| 'css'` | 'object' | { r, g, b, a }, [r, g, b, a] or an rgb(r g b / a) string |
| `range` | `255 \| 1` | 255 | The range of r, g, b; opacity is always 0…1 |
| `space` | `'srgb' \| 'linear'` | 'srgb' | The space of r, g, b; linear only with range: 1 (rendering, the TaoFX gradient) |
| `alpha` | `boolean` | false | Store opacity; without it a hex #rrggbb |
| `precision` | `number` | 5 | Digits of fractional values (range 1); for a linear colour fewer give steps in the dark |

## TaoFileDrop

Showcase section: `#filedrop`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `v-model` | `File[]` | [] | The list of files. The component does not accumulate it — only what the parent gave |
| `multiple` | `boolean` | false | Several files |
| `accept` | `string` | '*' | As in <input type="file"> |
| `size` | `'small' \| 'medium' \| 'large'` | inherited | The height of the zone and of the file rows. Without it — the size of the ancestors |
| `list` | `boolean` | true | Names under the zone. Removing a file goes straight to v-model |
| `showClear` | `boolean` | false | The “clear all” button. It does not clear by itself — it fires clear-request |

**Slots, events, notes.** default — the zone text. The change event — files were added or removed. clear-request: the parent decides whether to reset at once or after confirm().

## TaoSparkline

Showcase section: `#charts`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `values` | `(number \| null)[]` | — | The series; null is a gap that splits the line |
| `label` | `string` | — | What it shows, for a screen reader («Visits, 12 weeks, growing»). Without it the line is decoration (aria-hidden) |
| `tone` | `'accent' \| 'neutral' \| 'success' \| 'danger' \| 'warning' \| 'info'` | 'accent' | The colour |
| `area` | `boolean` | false | A soft fill under the line |
| `dot` | `boolean` | false | A dot on the last value |
| `min / max` | `number` | the data | A fixed range (values outside are clamped): to compare several sparklines |
| `height` | `number \| string` | 32 | Height (number = px). The width is the width of the container |

**Slots, events, notes.** A trend without axes or a tooltip: for a card, a table cell, a line of text.

## TaoMeter

Showcase section: `#charts`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `value` | `number` | — | The measured value |
| `min / max` | `number` | 0 / 100 | The range |
| `low / high` | `number` | — | The bounds of the low and the high region. Without them the meter is the accent colour |
| `optimum` | `number` | the middle | The best value. Its region is success, the next one warning, the far one danger, as the HTML <meter>: optimum 0 for disk space used, max for a battery |
| `label` | `string` | — | Shown above the bar, the accessible name |
| `valueText` | `string \| boolean` | false | The value right of the label: true is the number, a string your own text (read as aria-valuetext) |
| `tone` | `TaoToneName` | — | A fixed colour instead of low / high |

**Slots, events, notes.** role="meter". A measured value in a range (disk, battery, a score), not the progress of a task: that is TaoProgress.

## TaoDonut

Showcase section: `#charts`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `segments` | `TaoDonutSegment[]` | — | { label, value, tone?, color? }. The parts take --tao-color-chart-1…6 in order; a tone or a CSS colour wins. 3–5 parts read well |
| `value / max` | `number` | 0 / 100 | Without segments: a single ring, value of max |
| `tone` | `TaoToneName` | 'accent' | The colour of the single ring |
| `label` | `string` | — | The accessible name; the parts and their shares are read after it |
| `size / thickness` | `number` | 120 / 12 | The outer size and the ring width, px |
| `legend` | `boolean` | false | A list of the parts with their shares next to the ring |

**Slots, events, notes.** default — the middle of the ring (a number, a word). taoChartTheme(el?) returns the theme colours as rgb() for a chart library: colors (6 series), text, textMuted, grid, axis, background, tooltip, tooltipText, danger / success / warning, fontFamily; watchTaoChartTheme(apply, el?) calls it now and on every theme, mode or palette change, and returns stop().

## TaoHeatmap

Showcase section: `#charts`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `values` | `(number \| null)[][]` | — | One array per row, one value per column; null is no data |
| `rows / cols` | `string[]` | — | The names of the rows («Mon») and the columns («12 am») |
| `steps` | `number[]` | by the data | The thresholds, ascending: a cell takes the colour of the highest one it reaches, below the first it is empty. By default round numbers at 10–80% of the largest value |
| `tone` | `TaoToneName` | 'accent' | The colour of the levels: from faint to the full tone |
| `label` | `string` | — | The accessible name of the grid |
| `legend` | `boolean` | true | The thresholds with their colours («500+») under the map |
| `hatch` | `number` | 1 | How many of the lowest levels are striped, so they read apart from empty cells without colour too |
| `labelEvery` | `number` | 1 | Show every n-th column name; all of them are still read |
| `colLabels` | `'top' \| 'bottom'` | 'bottom' | Where the column names stand |
| `cellHeight` | `number` | — | The cell height, px; square cells by default |
| `gap` | `number` | 3 | The gap between cells, px |
| `format` | `(value) => string` | by the locale | How a number is written in the tip, the cells and the legend |

**Slots, events, notes.** tip { row, col, value, text } — the tip over a cell. role="grid": one cell is in the tab order, the arrows, Home / End (Ctrl for the corners) and PageUp / PageDown move it; a screen reader reads the row, the column and the number. The map fits the width of its container.

## TaoTable

Showcase section: `#table`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `columns` | `TaoTableColumn[]` | — | Required. { key, label, sortable?, align?, width? } |
| `rows` | `object[]` | [] | The data |
| `v-model:sort` | `{ key, dir } \| null` | null | Sorting. dir: asc \| desc |
| `loading` | `boolean` | false | The loading overlay |
| `emptyText` | `string` | 'No data' | If rows is empty and not loading |
| `striped` | `boolean \| 'odd' \| 'even'` | false | Zebra. true/odd — from the first row, even — from the second |
| `hover` | `boolean` | true | Highlight the row on hover |
| `size` | `'small' \| 'medium' \| 'large'` | inherited | Paddings and text of cells (small = the former compact), and the size of controls in cells too |
| `head` | `boolean` | true | Highlight the header |
| `lines` | `boolean` | true | Lines between rows |
| `sticky` | `boolean` | false | A sticky header (needs maxHeight) |
| `rowKey` | `string \| fn` | 'id' | The row key |
| `maxHeight` | `number \| string` | — | Scroll. A number is px |

**Slots, events, notes.** Cell: #cell-{key}="{ row, value }". Events: change — the sorting changed, row-click, if clickable.

## TaoPagination

Showcase section: `#pagination`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `v-model:page` | `number` | 1 | The current page |
| `total` | `number` | 0 | Total records (not pages) |
| `pageSize` | `number` | 10 | Records per page |
| `jump` | `number` | 5 | A click on “…” jumps this many pages. 0 — “…” is decorative |
| `pageInput` | `boolean \| number` | false | A field to type a page in: true — always, a number — from this many pages on. Enter or leaving the field goes there (clamped to the range), Esc drops it |
| `pageSizes` | `number[]` | — | The page sizes to choose from: «Per page» next to the total, v-model:page-size. On a change the page moves so the first row on screen stays on screen |
| `siblingCount` | `number` | 1 | How many numbers around the current one |
| `showTotal` | `boolean` | true | The “1–10 of N” caption |
| `size` | `'small' \| 'medium' \| 'large'` | inherited | Buttons 26 / 36 / 44, like TaoButton. Without it — the size of the ancestors |
| `disabled` | `boolean` | false | Disabled |

## TaoEmpty

Showcase section: `#empty`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `title` | `string` | 'Nothing here' | The empty state title |

**Slots, events, notes.** default — an explanation. #icon — a picture/icon. #action — a button.

## TaoTree

Showcase section: `#tree`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `nodes` | `TaoTreeNode[]` | — | { id, label, icon?, children?, hasChildren?, disabled? }. hasChildren without children — the children come from load when it opens |
| `v-model:expanded` | `string[]` | own | Ids of the expanded nodes. Without a model the tree keeps them itself |
| `selection` | `'none' \| 'single' \| 'multiple'` | 'single' | Selection mode. none — a click on a folder toggles it |
| `v-model:selected` | `string \| string[] \| null` | own | An id (single) or a list of ids (multiple) |
| `checkable` | `boolean` | false | Checkboxes. A parent is checked, unchecked or mixed by its leaves; a click on a parent toggles the whole branch |
| `v-model:checked` | `string[]` | own | Ids of the checked nodes without children (leaves and folders not loaded yet). A checked lazy folder hands its check to its children once loaded |
| `load` | `(node) => Promise<TaoTreeNode[]>` | — | Loads the children of a node with hasChildren; a spinner and aria-busy meanwhile |
| `size` | `'small' \| 'medium' \| 'large'` | inherited | Row height, as for the controls; the density works too |
| `ariaLabel` | `string` | 'Tree' | Accessible name of the tree |
| `loadingLabel` | `string` | 'Loading…' | The hint of the spinner |

**Slots, events, notes.** #icon, #label, #actions — { node, level, expanded, selected }; the actions show on hover and focus (always on a touch screen). Events: update:expanded / selected / checked, select(node) — a click, Enter, Space without checkboxes; load-error(node, error) — the node stays closed. Keys: ↑ ↓, → opens or goes in, ← closes or goes to the parent, Home / End, * opens the siblings, letters search, Enter selects, Space checks.

## TaoList

Showcase section: `#list`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `size` | `'small' \| 'medium' \| 'large'` | inherited | Row height 26 / 36 / 44. An Item without its own size takes it from here |
| `bordered` | `boolean` | true | A border around the list |
| `divided` | `boolean` | true | Lines between rows |
| `maxHeight` | `number \| string` | — | Scroll. A number is pixels |
| `empty` | `boolean` | false | Show #empty instead of rows |
| `ariaLabel` | `string` | '' | The list name |

**Slots, events, notes.** default — TaoListItem. #empty — if empty.

## TaoListItem

Showcase section: `#list`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `title` | `string` | '' | The title. The default slot replaces it |
| `description` | `string` | '' | A caption under the title |
| `selected` | `boolean` | false | The selected row |
| `disabled` | `boolean` | false | Disabled |
| `active` | `boolean` | false | Highlight without selected |
| `clickable` | `boolean` | false | A button row, fires click |
| `size` | `'small' \| 'medium' \| 'large'` | from the list | Override the list size |
| `actionAlways` | `boolean` | false | #action is always visible, not only on hover |

**Slots, events, notes.** default — the title. #prefix, #description, #suffix, #action (on hover; always on touch).

## TaoTimeline

Showcase section: `#timeline`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `items` | `TaoTimelineItem[]` | — | { id, title, time?, datetime?, description?, icon?, tone? }. time is shown, datetime goes to <time datetime> |
| `active` | `string` | — | The id of the current event: the line is filled up to it, the next ones wait, it gets aria-current="step". Without active the feed is a log of the past |
| `align` | `'start' \| 'alternate'` | 'start' | alternate — the events on both sides of the line; below 480px of its own width it folds into start |
| `size` | `'small' \| 'medium' \| 'large'` | inherited | The marker and the text on the control scale; the density works too |

**Slots, events, notes.** #marker, #title, #content — { item, index, state, active }; state: done / current / upcoming. A marker tone: success / danger / warning / info / neutral, the accent without one. An <ol>: a screen reader hears the order, the line and the markers are hidden from it.

## TaoStages

Showcase section: `#stages`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `items` | `TaoStageItem[]` | [] | { key, label?, status?: wait \| work \| ok \| bad } |
| `direction` | `'row' \| 'column'` | 'column' | column — top to bottom, row — in a row. As in TaoFlex |
| `ariaLabel` | `string` | 'Stages' | The list name |

**Slots, events, notes.** default / #icon="{ item, index, status }" — replace the step text or icon.

## TaoSkeleton

Showcase section: `#skeleton`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `variant` | `'text' \| 'title' \| 'circle' \| 'rect'` | 'text' | The placeholder shape |
| `lines` | `number` | 1 | How many lines (text) |
| `width / height` | `string` | '' | A CSS size, if it has to be set explicitly |

## TaoCounter

Showcase section: `#counter`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `value` | `number` | 0 | A number on display. Not an input |
| `maxDigits` | `number` | 9 | The minimum width in digits (leading zeros are hidden visually) |

## TaoCarousel

Showcase section: `#carousel`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `v-model` | `number` | 0 | The index of the current snap |
| `perView` | `number` | 1 | How many slides are in the frame. 5 — a product strip |
| `peek` | `number` | 0 | How many px of the next card are visible on the right |
| `autoplay` | `number` | 0 | Time per slide in ms. 0 — off. The current indicator fills over this time and the slide changes when it is full (the clock is a CSS animation). Pauses on hover / keyboard focus / touch and drag / a hidden tab; off with prefers-reduced-motion |
| `loop` | `boolean` | false | Loop round in a circle |
| `indicator` | `'dots' \| 'bars' \| 'progress'` | — | Marks under the strip: dots (the current one stretches into a pill) / equal bars / one bar (the fill of the slide, the position without autoplay) |
| `pausable` | `boolean` | true | With autoplay: a button that stops and resumes it (autoplay that moves for more than 5 seconds must be stoppable) |
| `pauseLabel / playLabel` | `string` | 'Pause autoplay' / 'Start autoplay' | aria-label of the button |
| `controls` | `boolean` | true | Arrows. false hides both |

**Slots, events, notes.** default — slides. #prev / #next="{ go, disabled }" — custom buttons. #prev-icon / #next-icon — the icon only. #dots="{ index, count, go }" — your own indicator as a whole (an invisible fill then keeps the time), #dot — your own mark.

## TaoContainer

Showcase section: `#container`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `width` | `'wide' \| 'slim' \| 'ultra-slim'` | 'wide' | max-width: 1120 / 500 / 400 |
| `free` | `boolean` | false | No horizontal auto-centring |

**Slots, events, notes.** default — the content.

## TaoFlex

Showcase section: `#flex`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `justify` | `flex justify-content` | 'flex-start' | flex-start, center, space-between, space-around, space-evenly, flex-end, normal |
| `align` | `flex align-items` | 'stretch' | stretch, flex-start, center, flex-end, baseline |
| `direction` | `flex-direction` | 'row' | row, column and reverse |
| `wrap` | `flex-wrap` | 'nowrap' | nowrap, wrap, wrap-reverse |
| `gap` | `number \| string` | '0px' | The gap. A number is px, a string is CSS |
| `tag` | `string` | 'div' | Which HTML tag to render |

## TaoSpace

Showcase section: `#flex`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `direction` | `'row' \| 'column'` | 'row' | As in TaoFlex |
| `block` | `boolean` | false | display: flex without wrap |
| `expand` | `boolean` | false | 100% width |

**Slots, events, notes.** default — children with an even gap.

## TaoGrid

Showcase section: `#grid`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `min` | `string` | '220px' | The minimum tile width (auto-fill). A catalogue. Ignored with cols |
| `cols` | `number \| { compact, medium, expanded }` | 0 | Fixed columns (bento). A number: one column on compact, the number from medium on. An object: per width class of the grid itself (compact < 600px, medium < 840px, expanded), a missing class takes the smaller one. 0 — the min mode |
| `gap` | `number \| string` | token space-4 | The gap between cells. A number is px, a string is CSS |
| `rowHeight` | `number \| string` | — | The height of every row, as a mosaic wants: the grid keeps its proportions, a picture in a tile is cropped. Without it the rows follow the content |

**Slots, events, notes.** default — cards or TaoGridItem. Not masonry: the row follows the tallest. The width classes follow the width of the grid, not of the window (inside a TaoSplit pane too).

## TaoGridItem

Showcase section: `#grid`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `col` | `number \| 'full' \| { compact, medium, expanded }` | 1 | How many columns to take; 'full' is the whole row. Never more than there are. For cols, not for min |
| `row` | `number \| { compact, medium, expanded }` | 1 | How many rows to take. A number: 1 on compact, the number from medium on |
| `order` | `number \| { compact, medium, expanded }` | 0 | The place in the flow: { compact: 9 } sends a side block to the end on a phone |

**Slots, events, notes.** default — a tile. In a catalogue it can go without the wrapper.

## TaoDivider

Showcase section: `#divider`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `variant` | `'solid' \| 'dashed' \| 'colored' \| 'gap'` | 'solid' | solid — a regular border, dashed — dashes, colored — accent, gap — a gap |
| `text` | `string` | '' | An optional caption in the middle. Works with any variant |
| `fade` | `boolean` | false | Soft line edges. Does not affect gap |
| `size` | `'small' \| 'medium' \| 'large'` | 'medium' | For gap only — the height of the gap. Not inherited. |

**Slots, events, notes.** default — the same as text. If there is a slot, it wins over the prop.

## TaoSplit

Showcase section: `#split`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `v-model` | `number` | 50 | The size of the start pane in unit |
| `direction` | `'row' \| 'column'` | 'row' | As in Flex |
| `unit` | `'%' \| 'px'` | '%' | Percent or pixels |
| `min / max` | `number` | 0 / — | The bounds of the start pane |
| `minEnd` | `number` | 0 | The minimum of the second pane |
| `resizable` | `boolean` | true | false — the bar is there, but cannot be dragged |
| `step` | `number` | 1% or 8px | The arrow step when the bar is focused |
| `@change` | `value` | — | Finished dragging or an arrow was pressed. v-model fires on every move |

**Slots, events, notes.** #start and #end — the two panes. Three columns = two nested splits.

## TaoFieldset

Showcase section: `#fieldset`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `legend` | `string` | '' | A caption on the top frame |
| `align` | `'start' \| 'center' \| 'end'` | 'start' | Where to shift the legend |

**Slots, events, notes.** default — the fields. #legend — if the caption is not a string.

## TaoAnimatedBorder

Showcase section: `#animated-border`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `variant` | `'rainbow' \| 'tone'` | 'rainbow' | What the border is made of: the rainbow or the colours of a tone |
| `tone` | `TaoToneName` | 'accent' | The tone for variant="tone"; the theme accent without it |
| `colors` | `string[]` | — | Your own colours (any CSS colour), they win over variant |
| `radius` | `number \| string` | var(--tao-radius-panel) | Corner radius of the content; the border outside is that plus its width |
| `borderWidth` | `number` | 3 | The outline thickness in px |
| `speed` | `number` | 6 | The duration of one turn in seconds |
| `light` | `boolean` | false | A soft glow around the frame |
| `glow` | `number` | 16 | The glow radius in px. Makes sense with light |

**Slots, events, notes.** default — the content inside the frame. With prefers-reduced-motion the gradient stands still.

## TaoModal

Showcase section: `#modal`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `v-model` | `boolean` | — | Open. Required |
| `title` | `string` | '' | The title in the header |
| `closable` | `boolean` | true | The cross, Esc, a click on the backdrop |
| `closeLabel` | `string` | 'Close' | aria-label of the cross |
| `fullscreen` | `boolean \| 'narrow'` | false | true — the whole screen: square corners, the header and the footer stay while the content scrolls, the safe areas kept. narrow — only on a screen narrower than 600px: a dialog on a computer, a page on a phone |

**Slots, events, notes.** default — the body. #footer — buttons. #close-icon — the cross icon.

## TaoDrawer

Showcase section: `#drawer`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `v-model` | `boolean` | — | Open. Required |
| `title` | `string` | '' | The title |
| `side` | `'left' \| 'right' \| 'bottom'` | 'right' | Where it slides in from. bottom is a sheet: as wide as the screen up to 640px, as tall as its content up to 90% of the screen, rounded top, a grip, above the safe area |
| `closable` | `boolean` | true | Esc, the backdrop, the cross |
| `closeLabel` | `string` | 'Close' | aria-label of the cross |

**Slots, events, notes.** default — the body. #footer — buttons. #close-icon — the cross icon.

## confirm()

Showcase section: `#confirm`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `confirm()` | `() => Promise<boolean>` |  | A chain in a single tick. true — ok, false — cancel / Esc / backdrop |
| `confirm(message)` | `(string) => Promise<boolean>` |  | A short call with a text |
| `.title / .message` | `(string) => builder` |  | The title and text |
| `.ok / .cancel` | `(label) => builder` |  | Button captions |
| `.danger()` | `() => builder` |  | A red confirm button |
| `confirm.defaults` | `({ ok, cancel })` |  | Default captions for the whole app |

## TaoTooltip

Showcase section: `#tooltip`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `content` | `string` | — | The hint text. Required |
| `placement` | `TaoPlacement` | 'top' | Side and alignment: top / bottom / left / right and -start / -end. Flips at the screen edge |

**Slots, events, notes.** default — the trigger (a button, an icon…).

## TaoPopover

Showcase section: `#popover`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `v-model` | `boolean` | uncontrolled | Open state. Without v-model it holds its own |
| `placement` | `TaoPlacement` | 'bottom-start' | Side and alignment of the panel: top / bottom / left / right and -start / -end. Flips at the edge |
| `disabled` | `boolean` | false | Does not open |

**Slots, events, notes.** #trigger — the button. default — the panel content. Not a tooltip and not an action menu.

## TaoDropdownMenu

Showcase section: `#dropdown`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `items` | `TaoMenuItem[]` | [] | Entries: plain { id, label, icon?, shortcut?, disabled?, items? }, checkboxes { type: "checkbox", checked }, radios { type: "radio", group, checked }, { type: "label" }, { type: "separator" }. items inside an entry is a submenu |
| `placement` | `TaoPlacement` | 'bottom-end' | Where the list opens. Flips at the screen edge |
| `menuLabel` | `string` | 'Menu' | aria-label of the button and of the menu |
| `closeOnScroll` | `boolean` | false | Close when the page scrolls. Off: the menu follows its button |

**Slots, events, notes.** #icon — the trigger icon, #button — the whole button content, #item="{ item, id, label, icon }" — your own item face. The select event — the item id. shortcut is a ready string to show: the menu neither parses nor listens to it.

## TaoMenu

Showcase section: `#dropdown`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `items` | `TaoMenuItem[]` |  | The same entries |
| `open` | `boolean` |  | Whether it is open. The owner closes it on the close event |
| `anchor` | `HTMLElement \| null` |  | What the panel hangs from |
| `placement` | `TaoPlacement` | 'bottom-end' | Side and alignment |
| `label` | `string` | — | Accessible name of the menu |

**Slots, events, notes.** Event select — the item id, close(reason) — the menu asks to be closed (escape / select / outside / tab). The panel for your own shells: a button, a context menu, a menu bar.

## TaoToolbar

Showcase section: `#toolbar`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `label` | `string` | — | Accessible name of the bar: Formatting, Tools |
| `size` | `'small' \| 'medium' \| 'large'` | inherited | The size of the controls inside |
| `orientation` | `'horizontal' \| 'vertical'` | 'horizontal' | Which arrows walk it (← → or ↑ ↓); the separators lie across |
| `variant` | `'panel' \| 'plain'` | 'panel' | panel — a raised bar of its own with concentric corners; plain — only the layout, for a toolbar inside a header |

**Slots, events, notes.** default — any controls: TaoButton (toggles with v-model:pressed), TaoSegmented, a select, TaoToolbarGroup, TaoToolbarSeparator. Keys: the bar is one Tab stop and remembers the last item; ← → (↑ ↓ when vertical) walk it and wrap, Home / End go to the ends, disabled items are skipped. Inside a radio group (TaoSegmented) the arrows pick the option and go on from its edge; a text field keeps its arrows. The items wrap onto a new line on a narrow screen.

## TaoToolbarGroup

Showcase section: `#toolbar`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `label` | `string` | — | Accessible name of the group: Text style, Alignment |
| `inset` | `boolean` | false | A sunken pill behind the group: its buttons read as one set |

**Slots, events, notes.** default — the tools of one kind. role="group".

## TaoToolbarSeparator

Showcase section: `#toolbar`

**Slots, events, notes.** A thin line between the groups, across the bar: vertical in a horizontal toolbar. role="separator".

## TaoMenubar

Showcase section: `#menubar`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `items` | `TaoMenuItem[]` | — | The top entries: { id, label, items } is a menu, { id, label } a plain action. Inside a menu, everything TaoMenu can do (submenus, checkboxes, radios, shortcuts). Separators and labels at the top level are ignored |
| `size` | `'small' \| 'medium' \| 'large'` | inherited | The height of the bar, as for the controls |
| `ariaLabel` | `string` | 'Menu bar' | Accessible name of the bar |
| `closeOnScroll` | `boolean` | false | Close an open menu when the page scrolls. Off: it follows its entry |

**Slots, events, notes.** The select event — the id of the picked item (in a menu or a plain top entry). #item — your own item face in the menus. Keys: Tab enters the bar, ← → walk it, Home / End, ↓ / Enter / Space open, with a menu open ← → move to the neighbour menu, Esc closes and gives the focus back. No folding of entries into “…” on a narrow bar yet.

## TaoContextMenu

Showcase section: `#menubar`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `items` | `TaoMenuItem[]` | — | The entries, as in TaoMenu |
| `disabled` | `boolean` | false | Leave the browser menu alone |
| `menuLabel` | `string` | 'Context menu' | Accessible name of the menu |
| `closeOnScroll` | `boolean` | true | Close when the page or a scroll container scrolls (the point moves away from under the menu). false keeps it at the screen point. Scrolling inside the menu never closes it |

**Slots, events, notes.** default — the area where the right click (or the Menu key / Shift+F10) opens the menu; the wrapper does not take part in the layout (display: contents). #item — your own item face. Events select — the item id, open({ x, y }) — where it opened. On iOS a long press sends no contextmenu: give it a button there.

## TaoSpoiler

Showcase section: `#spoiler`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `v-model` | `boolean` | uncontrolled | Open / closed. Without a model — defaultOpen |
| `title` | `string` | '' | The button title |
| `name` | `string \| number` | — | The panel key inside TaoSpoilerGroup |
| `defaultOpen` | `boolean` | false | The initial state, if there is no v-model |
| `@change` | `value` | — | The user opened or closed it |

**Slots, events, notes.** default — the body. Neighbours do not close each other.

## TaoSpoilerGroup

Showcase section: `#spoiler`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `v-model` | `string \| number \| null` | uncontrolled | The key of the open panel. null — all closed. Without a model the group remembers the key itself |

**Slots, events, notes.** default — a set of TaoSpoiler with name.

## TaoNav

Showcase section: `#tao-nav`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `items` | `TaoNavItem[]` | — | { id, label, icon?, href?, badge?, disabled? }. With href the item is an <a> link, without it a button. badge: a number or a string is a count, true a dot |
| `v-model` | `string` | — | The id of the current section: aria-current="page" and the active look |
| `layout` | `'auto' \| 'bar' \| 'rail' \| 'drawer'` | 'auto' | bar — a bottom bar, rail — a rail with icons, drawer — a side panel with labels. auto — by the width of TaoNav itself: bar below 600px, rail below 840px, drawer from 840px (container queries, no JS) |
| `maxBarItems` | `number` | 5 | How many fit the bar. With more items maxBarItems − 1 stay, the rest go into «More» with a menu |
| `ariaLabel` | `string` | 'Navigation' | Accessible name of the navigation |
| `moreLabel` | `string` | 'More' | The label of «More» |
| `indicator` | `'pill' \| 'line'` | 'pill' | How the current section is marked: a tint behind the item, or the accent colour and a short line (under the item in the bar, along its start edge on the side; auto moves it) |
| `floating` | `boolean` | false | In the bar look, a detached pill above the page: inset from the edges and above the safe area, round, with a shadow; the active item is a pill too. The rail and the side panel do not change. The main action of the screen goes beside it as your own round button, not into the bar |
| `surface` | `'flat' \| 'glass' \| 'grain'` | 'flat' | What the panel is made of, as on TaoCard: glass lets the page show blurred through the bar as it scrolls under it (solid where blur is not supported or less transparency is asked) |

**Slots, events, notes.** default — the page: TaoNav lays it out next to the navigation (the bar sticks to the bottom, on the side the list sticks to the top; env(safe-area-inset-bottom) is kept). Without the slot it is a standalone panel with a border. #label — your own item label ({ item, active }). #action — the main action of the screen: a TaoButton with icon and its text in <span class="tao-nav__action-label">; the bar puts it round above itself at the end side (above the pill with floating), the rail round at the top, the side panel extended with the text at the top; in the round looks the text is hidden but stays the name of the button (a shortcut on it too). The side panel gives the button its own corners; --tao-nav-action-radius: var(--tao-radius-full) makes it a pill. --tao-nav-rail-width (80px) and --tao-nav-drawer-width (240px) set the widths. Events: update:modelValue, select(id, event) — event.preventDefault() keeps a link from navigating, to route it yourself.

## TaoTabs

Showcase section: `#tabs`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `v-model` | `string` | — | value of the active tab. Required |
| `items` | `TaoTabItem[]` | — | { value, label, disabled? } — like Select options |
| `@change` | `value` | — | The user picked another tab |
| `justify` | `TaoJustify` | — | Where the tabs sit in the row, as in TaoFlex: flex-start, center, flex-end, space-between, space-around, space-evenly. Without it, at the left |
| `size` | `'small' \| 'medium' \| 'large'` | inherited | The tab height as TaoButton (26 / 36 / 44). Without it — the size of the ancestors |

**Slots, events, notes.** default="{ key }" — the content of the active panel.

## TaoBreadcrumb

Showcase section: `#breadcrumb`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `items` | `{ label, to? }[]` | — | The crumbs. The last one is the current page, without a link. Required |
| `ariaLabel` | `string` | 'Breadcrumb' | The navigation name |

## TaoLink

Showcase section: `#link`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `to` | `string \| object` | — | The address. NuxtLink → RouterLink → <a> |
| `newTab` | `boolean` | false | target=_blank + rel=noopener |
| `private` | `boolean` | false | rel=noopener noreferrer |
| `exactPath` | `boolean` | false | An exact path match for active (vue-router) |

**Slots, events, notes.** default — the link text.

## TaoScrollTop

Showcase section: `#scrolltop`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `variant` | `'solid' \| 'ghost' \| 'text'` | 'solid' | The look: a filled circle, a light circle or a caption with an arrow |
| `side` | `'left' \| 'right'` | 'right' | Which edge of the page the button sits on |
| `offset` | `number \| string` | 24 | The offset from that edge (older name: right) |
| `label` | `string` | — | The caption: on mouse hover (not touch) for solid / ghost, always visible for text (the locale text by default); an empty string hides it |
| `labelSide` | `'left' \| 'right'` | — | Which side the caption goes; opposite to side by default |
| `boundary` | `number` | 300 | The threshold in px: it appears on a reverse scroll after it |
| `size` | `number` | 40 | The button size in px |
| `bottom` | `number \| string` | 24 | The offset from the bottom edge |
| `zIndex` | `number` | 1000 | The layer |
| `ariaLabel` | `string` | 'Back to top' | The accessible name |
| `outline` | `boolean` | true | The focus outline |

## toast()

Showcase section: `#toast`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `toast()` | `() => builder` |  | A chain in a single tick, shown on the next one |
| `toast.success(msg)` | `(string, options?) => builder` |  | A short call. Also error / warning / info / show |
| `.success() / .danger() / …` | `() => builder` |  | The type. show() is neutral |
| `.title / .message` | `(string) => builder` |  | The title and text |
| `.short() / .timeout(ms)` | `() => builder` |  | 1 s or your own time |
| `.byBottomRight() / …` | `() => builder` |  | The corner: top/bottom + left/right/center |
| `.action(label, fn)` | `(string, fn) => builder` |  | A button in the toast |
| `.loading()` | `() => builder` |  | Work in progress: a spinner, no timeout, aria-busy. Finish it with a toast of the same id and replace(): it takes its place |
| `toast.promise(p, texts)` | `(Promise, { loading, success, error }) => Promise` |  | Loading while the promise runs, then success or error in the same place; success / error can be functions of the result / the error |
| `.id(x).replace()` | `() => builder` |  | Replaces the toast with that id where it stands, and restarts its time |
| `toast.defaults` | `(partial) => toast` |  | Position, timeout, closeLabel for the whole app |

## TaoAlert

Showcase section: `#alert`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `tone` | `'success' \| 'danger' \| 'warning' \| 'info' \| 'neutral'` | 'info' | The status colour, as TaoButton |
| `title` | `string` | '' | The title. Can be omitted |
| `closable` | `boolean` | false | The cross. It does not unmount itself — it fires close |
| `closeLabel` | `string` | 'Close' | aria-label of the cross |
| `collapsible` | `boolean` | false | The body folds under the title (the title is the toggle, aria-expanded); the tone stays. Folded text stays in the DOM, find-in-page opens it |
| `v-model:collapsed` | `boolean` | own | Folded or not; v-model:collapsed="true" starts folded. Better open for an error |
| `detailsLabel` | `string` | 'Details' | The toggle text when there is no title |

**Slots, events, notes.** default — the text. #close-icon. v-if + @close — to hide it.

## TaoTag

Showcase section: `#tag`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `tone` | `'neutral' \| 'success' \| 'danger' \| 'warning' \| 'info' \| ''` | '' | The status colour, as TaoButton |
| `flat` | `boolean` | false | No border, the fill stays |
| `size` | `'small' \| 'medium' \| 'large'` | inherited | Height 18 / 20 / 24. Without it — the size of the ancestors |
| `closable` | `boolean` | false | The cross. Fires close, does not touch the array itself |
| `clickable` | `boolean` | false | A pointer cursor (a clickable chip), as TaoListItem / TaoTable |
| `color / background / borderColor` | `string` | — | Override the tokens by hand |

**Slots, events, notes.** default — the text. #prefix — an avatar or an icon on the left.

## TaoLoader

Showcase section: `#loader`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `size` | `number \| string` | 80 | The size. A number is px |
| `color` | `string` | accent token | The dot colour |
| `inline` | `boolean` | false | Inline, without block centring |

## TaoImage

Showcase section: `#image`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `src` | `string` | '' | The image address |
| `alt` | `string` | '' | The alternative text |
| `lazy` | `boolean` | false | The native loading="lazy" |
| `pixelated` | `boolean` | false | image-rendering: pixelated |
| `placeholderText` | `string` | 'No image available' | The text if src is empty or fails |

## TaoAvatar

Showcase section: `#avatar`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `src` | `string` | '' | A photo. If empty — initials from name |
| `name` | `string` | '' | For the initials and alt |
| `size` | `'small' \| 'medium' \| 'large'` | 'medium' | 24 / 32 / 48px. Content, does not inherit the size of ancestors. |
| `dot` | `boolean \| tone` | false | The status dot. true = success |
| `count` | `number \| string` | — | A badge. 0 and empty are not drawn, >99 → 99+ |

## TaoIcon

Showcase section: `#icon`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `name` | `string` | — | tao-… is a built-in SVG; a name from registerTaoIcons; any other name is the class icon-{name} of your font. Required |
| `size` | `number` | — | Pixels. Without it an SVG icon is 1em (follows the font size) |
| `margin` | `string` | '0px' | The outer margin |
| `invert` | `boolean` | false | Invert the colour |

**Slots, events, notes.** #prefix / #postfix — next to the icon. registerTaoIcons({ name: { body, viewBox? } }) adds your own SVGs; the prefix tao- is reserved.
