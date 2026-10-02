# Obsidian Check — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Плагин Obsidian, генерирующий swipe-колоду карточек из заметок через Kimi API и отдающий её по локальному HTTP, плюс мобильное приложение Expo с Tinder-свайпами «верно/неверно».

**Architecture:** «Толстый» плагин (генерация, кеш, API на десктопе) + тонкий RN-клиент (выбор колоды → свайп-сессия офлайн → результат). Два подпроекта в одном репо: `plugin/` и `app/`.

**Tech Stack:** TypeScript, Obsidian API, esbuild, Vitest, node:http; React Native (Expo), react-native-deck-swiper, AsyncStorage, Jest.

**Spec:** `docs/superpowers/specs/2026-10-02-obsidian-check-design.md`

## Global Constraints

- Карточка: `{id: string, statement: string, isTrue: boolean, note: string, notePath: string}` — везде одинаково.
- 10–20 карточек на заметку, ~половина `isTrue: true`, половина — правдоподобные искажения.
- Кеш: `<vault>/.obsidian-check/decks.json`, атомарная перезапись (tmp + rename).
- Порт сервера по умолчанию: **27124**.
- Kimi: OpenAI-совместимый `POST {baseUrl}/chat/completions`; baseUrl по умолчанию `https://api.moonshot.ai/v1`, модель по умолчанию `moonshot-v1-8k`; оба значения — в настройках плагина.
- Эндпоинты: `GET /decks`, `GET /decks/:path`, `POST /decks/:path/regenerate`.
- Язык карточек = язык заметки (инструкция в промпте).
- Сообщения коммитов — conventional, короткие, без body.

## Review Focus

1. **Кириллические/пробельные пути vault** — `GET /decks/История%2F` должен корректно декодироваться (тест в Task 5).
2. **Kimi возвращает JSON в markdown-обёртке** (```json … ```) — парсер должен снимать обёртку (тест в Task 2).
3. **Kimi вернул невалидный JSON** — один ретрай с уточняющим промптом, затем заметка пропускается с записью в лог (тест в Task 3).
4. **Пустой отслеживаемый путь (нет .md)** — колода создаётся пустой, без ошибки; приложение показывает «нет карточек» (тесты в Task 3 и Task 8).
5. **Первая генерация без существующего кеша** — store стартует с пустого состояния, не падает на отсутствующем `decks.json` (тест в Task 4).

---

## Часть 1. Плагин Obsidian (`plugin/`)

### Task 1: Скелет плагина + типы настроек

**Files:**
- Create: `plugin/package.json`, `plugin/manifest.json`, `plugin/esbuild.config.mjs`, `plugin/tsconfig.json`
- Create: `plugin/src/settings.ts`
- Create: `plugin/src/types.ts`

**Interfaces:**
- Produces:
  - `types.ts`: `interface Card { id: string; statement: string; isTrue: boolean; note: string; notePath: string }`
  - `types.ts`: `interface Deck { path: string; generatedAt: number; stale: boolean; notes: Record<string, number>; cards: Card[] }` (`notes` = notePath → mtime)
  - `settings.ts`: `interface PluginSettings { apiKey: string; baseUrl: string; model: string; port: number; trackedPaths: string[] }`
  - `settings.ts`: `const DEFAULT_SETTINGS: PluginSettings` — baseUrl `https://api.moonshot.ai/v1`, model `moonshot-v1-8k`, port `27124`, trackedPaths `[]`

- [ ] **Step 1: Scaffold**

`npm init`, зависимости: `obsidian` (dev), `esbuild`, `typescript`, `vitest`, `@types/node`. esbuild бандлит `src/main.ts` → `main.js` (external: `obsidian`, `electron`, node builtins). `manifest.json`: id `obsidian-check`, minAppVersion `1.5.0`.

- [ ] **Step 2: Написать `types.ts` и `settings.ts`** — ровно интерфейсы выше, без логики.

- [ ] **Step 3: Verify build**

Run: `cd plugin && npm run build && npx tsc --noEmit`
Expected: exit 0, создан `main.js` (пока из пустого `main.ts`-заглушки `export default class {}`)

- [ ] **Step 4: Commit**

```bash
git add plugin && git commit -m "chore: скелет плагина"
```

### Task 2: Kimi-клиент — парсинг ответа в карточки

**Files:**
- Create: `plugin/src/kimi.ts`
- Test: `plugin/tests/kimi.test.ts`

**Interfaces:**
- Consumes: `Card` из Task 1.
- Produces: `parseCards(raw: string, note: {title: string; path: string}): Card[]` — снимает ```json-обёртку, `JSON.parse`, фильтрует элементы без `statement`/`isTrue` (boolean), проставляет `id` ( `${notePath}#${index}`), `note`, `notePath`. Бросает `Error` на невалидном JSON.
- Produces: `async function chatCompletion(settings: PluginSettings, prompt: string): Promise<string>` — POST на `{baseUrl}/chat/completions`, header `Authorization: Bearer {apiKey}`, body `{model, messages: [{role:"user", content: prompt}], temperature: 0.7}`, возвращает `choices[0].message.content`; на HTTP != 200 бросает `Error` с кодом ответа.

- [ ] **Step 1: Failing test**

```ts
// tests/kimi.test.ts
test('снимает markdown-обёртку и парсит карточки', () => {
  const raw = '```json\n[{"statement":"Земля плоская","isTrue":false}]\n```';
  const cards = parseCards(raw, { title: 'География', path: 'География.md' });
  expect(cards).toEqual([
    { id: 'География.md#0', statement: 'Земля плоская', isTrue: false, note: 'География', notePath: 'География.md' },
  ]);
});
test('фильтрует элементы без isTrue boolean', () => {
  const cards = parseCards('[{"statement":"a","isTrue":"да"},{"statement":"b","isTrue":true}]', { title: 'T', path: 'T.md' });
  expect(cards).toHaveLength(1);
});
test('бросает на невалидном JSON', () => {
  expect(() => parseCards('не json', { title: 'T', path: 'T.md' })).toThrow();
});
```

- [ ] **Step 2: Run fail** — `cd plugin && npx vitest run tests/kimi.test.ts` → FAIL (модуль не существует).

- [ ] **Step 3: Implement `parseCards` и `chatCompletion`** в `plugin/src/kimi.ts` по сигнатурам из Interfaces.

- [ ] **Step 4: Run pass** — та же команда → 3 PASS.

- [ ] **Step 5: Commit** — `git add plugin && git commit -m "feat: kimi-клиент и парсер карточек"`

### Task 3: Generator — промпт, валидация, ретрай, пустые пути

**Files:**
- Create: `plugin/src/generator.ts`
- Test: `plugin/tests/generator.test.ts`

**Interfaces:**
- Consumes: `parseCards`, `chatCompletion` (Task 2); `Card`, `PluginSettings` (Task 1).
- Produces: `async function generateForNote(settings: PluginSettings, note: {title: string; path: string; content: string}, chat: typeof chatCompletion = chatCompletion): Promise<Card[]>` — строит промпт (ниже), вызывает `chat`, парсит; на `Error` от parse — один ретрай с промптом «Верни только валидный JSON без пояснений»; на повторной ошибке возвращает `[]` и пишет в `console.warn`. Пустой `content` → сразу `[]` без вызова API.
- Produces: `function buildPrompt(note: {title: string; content: string}): string` — инструкция: «Составь 10–20 утверждений по заметке на её языке; половина верные, половина — правдоподобные, но неверные; верни JSON-массив [{statement, isTrue}] без пояснений».

- [ ] **Step 1: Failing test** (мок `chat`):

```ts
const note = { title: 'История', path: 'История/Даты.md', content: '1812 — Отечественная война.' };
test('возвращает карточки из ответа API', async () => {
  const chat = async () => '[{"statement":"1812 — война","isTrue":true}]';
  expect(await generateForNote(SETTINGS, note, chat)).toHaveLength(1);
});
test('ретрай при невалидном JSON, затем успех', async () => {
  let calls = 0;
  const chat = async () => (++calls === 1 ? 'мусор' : '[]');
  await generateForNote(SETTINGS, note, chat);
  expect(calls).toBe(2);
});
test('двойной провал → пустой массив', async () => {
  const chat = async () => { throw new Error('bad'); };
  expect(await generateForNote(SETTINGS, note, chat)).toEqual([]);
});
test('пустая заметка → без вызова API', async () => {
  let called = false;
  const chat = async () => { called = true; return '[]'; };
  expect(await generateForNote(SETTINGS, { ...note, content: '' }, chat)).toEqual([]);
  expect(called).toBe(false);
});
```

(`SETTINGS` — фикстура `PluginSettings` из DEFAULT_SETTINGS.)

- [ ] **Step 2: Run fail** — `npx vitest run tests/generator.test.ts` → FAIL.

- [ ] **Step 3: Implement** `buildPrompt` и `generateForNote` в `plugin/src/generator.ts`.

- [ ] **Step 4: Run pass** → 4 PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat: генератор карточек с ретраем"`

### Task 4: Store — кеш колод, stale по mtime, атомарная запись

**Files:**
- Create: `plugin/src/store.ts`
- Test: `plugin/tests/store.test.ts` (tmp-директория как «vault»)

**Interfaces:**
- Consumes: `Deck`, `Card` (Task 1).
- Produces: `class DeckStore { constructor(vaultDir: string); load(): Promise<void>; getDecks(): Deck[]; getDeck(path: string): Deck | undefined; async saveDeck(deck: Deck): Promise<void>; async markStale(currentMtimes: Record<string, Record<string, number>>): Promise<void> }`
  - файл: `<vaultDir>/.obsidian-check/decks.json`, формат `{ decks: Deck[] }`;
  - `load()` на отсутствующем файле → пустое состояние, без ошибки;
  - `saveDeck` — атомарно: запись в `decks.json.tmp`, затем rename;
  - `markStale(currentMtimes)` — для каждой колоды: `stale = true`, если mtime хоть одной её заметки изменился или заметка удалена/добавлена в путь.

- [ ] **Step 1: Failing test**

```ts
test('старт без decks.json → пусто', async () => {
  const s = new DeckStore(tmp); await s.load();
  expect(s.getDecks()).toEqual([]);
});
test('saveDeck + getDeck round-trip и атомарность (нет .tmp после записи)', async () => {
  const s = new DeckStore(tmp); await s.load();
  await s.saveDeck(DECK);
  const s2 = new DeckStore(tmp); await s2.load();
  expect(s2.getDeck('История')!.cards).toEqual(DECK.cards);
  expect(fs.existsSync(join(tmp, '.obsidian-check/decks.json.tmp'))).toBe(false);
});
test('markStale: изменённый mtime → stale', async () => {
  const s = new DeckStore(tmp); await s.load();
  await s.saveDeck({ ...DECK, notes: { 'a.md': 1 } });
  await s.markStale({ 'История': { 'a.md': 2 } });
  expect(s.getDeck('История')!.stale).toBe(true);
});
test('markStale: без изменений → не stale', async () => { /* mtime совпадает → stale === false */ });
```

(`DECK` — фикстура с кириллическим `path: 'История'`.)

- [ ] **Step 2: Run fail** — `npx vitest run tests/store.test.ts` → FAIL.

- [ ] **Step 3: Implement** `DeckStore` в `plugin/src/store.ts` (node `fs/promises`).

- [ ] **Step 4: Run pass** → 4 PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat: кеш колод с mtime-трекингом"`

### Task 5: HTTP-сервер — три эндпоинта, кириллица в путях

**Files:**
- Create: `plugin/src/server.ts`
- Test: `plugin/tests/server.test.ts` (реальные запросы на случайный порт)

**Interfaces:**
- Consumes: `DeckStore` (Task 4), `regenerateDeck` (Task 6 — в Task 5 используется через инъекцию колбэка).
- Produces: `function startServer(opts: { port: number; store: DeckStore; regenerate: (path: string) => Promise<void> }): http.Server`
  - `GET /decks` → `200`, `[{path, cardCount, stale}]`;
  - `GET /decks/:path` → `200` `Deck` | `404 {error}`; `:path` декодируется через `decodeURIComponent`;
  - `POST /decks/:path/regenerate` → вызывает `regenerate(path)`, `200 {ok: true}` | `404`;
  - прочие пути → `404`; JSON `content-type` везде.

- [ ] **Step 1: Failing test**

```ts
test('GET /decks → список с cardCount и stale', async () => { /* store с DECK → [{path:'История', cardCount:2, stale:false}] */ });
test('GET /decks/:path с URL-encoded кириллицей', async () => {
  const res = await fetch(`${base}/decks/${encodeURIComponent('История')}`);
  expect(res.status).toBe(200);
  expect((await res.json()).cards).toHaveLength(2);
});
test('GET /decks/нет-такой → 404', async () => { /* status 404 */ });
test('POST regenerate вызывает колбэк с декодированным путём', async () => {
  await fetch(`${base}/decks/${encodeURIComponent('История')}/regenerate`, { method: 'POST' });
  expect(calledWith).toBe('История');
});
```

- [ ] **Step 2: Run fail** — `npx vitest run tests/server.test.ts` → FAIL.

- [ ] **Step 3: Implement** `startServer` в `plugin/src/server.ts` на `node:http` (без express — в Obsidian нельзя тянуть тяжёлые deps).

- [ ] **Step 4: Run pass** → 4 PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat: локальный HTTP API колод"`

### Task 6: Сборка плагина — main.ts, регенерация, вкладка настроек

**Files:**
- Create: `plugin/src/main.ts`, `plugin/src/settings-tab.ts`
- Modify: `plugin/src/settings.ts`

**Interfaces:**
- Consumes: всё из Tasks 1–5.
- Produces: `async function regenerateDeck(path: string): Promise<void>` (экспорт из `main.ts`-модуля для тестовой проверки вручную): собирает `.md` файлы пути через `app.vault.getMarkdownFiles()`, фильтрует по префиксу `path`, для каждой — `generateForNote`, склеивает карточки, `store.saveDeck({path, generatedAt: Date.now(), stale: false, notes: {path→mtime}, cards})`.
- Плагин: `onload` — `store.load()`, `startServer`, ribbon-команда «Regenerate all decks»; `onunload` — `server.close()`. Вкладка настроек: apiKey (password), baseUrl, model, port, trackedPaths (textarea, по строке на путь).

- [ ] **Step 1: Implement** `settings-tab.ts` (стандартный `PluginSettingTab`) и `main.ts` (класс `ObsidianCheckPlugin extends Plugin`).

- [ ] **Step 2: Verify build**

Run: `cd plugin && npm run build && npx tsc --noEmit && npx vitest run`
Expected: exit 0, все тесты зелёные.

- [ ] **Step 3: Ручная проверка** — скопировать `main.js`, `manifest.json` в `<vault>/.obsidian/plugins/obsidian-check/`, включить плагин, задать ключ Kimi и путь, выполнить «Regenerate all decks», `curl localhost:27124/decks` → список колод.

- [ ] **Step 4: Commit** — `git commit -m "feat: сборка плагина и вкладка настроек"`

---

## Часть 2. Мобильное приложение (`app/`)

### Task 7: Скелет Expo + API-клиент

**Files:**
- Create: `app/` (expo-template-blank-typescript), `app/src/api.ts`
- Test: `app/src/__tests__/api.test.ts`

**Interfaces:**
- Consumes: эндпоинты плагина (Task 5); тип `Card` — дублируется в `app/src/types.ts` (копия из plugin Task 1).
- Produces: `api.ts`: `async function fetchDecks(baseUrl: string): Promise<DeckSummary[]>` (`DeckSummary = {path: string; cardCount: number; stale: boolean}`) и `async function fetchDeck(baseUrl: string, path: string): Promise<Card[]>` (encodeURIComponent на path). Сетевая ошибка → бросает `Error('Obsidian недоступен')`.

- [ ] **Step 1: Scaffold** — `npx create-expo-app app --template blank-typescript`, deps: `react-native-deck-swiper`, `@react-native-async-storage/async-storage`, dev: `jest-expo`.

- [ ] **Step 2: Failing test**

```ts
test('fetchDecks маппит ответ', async () => {
  global.fetch = async () => ({ ok: true, json: async () => [{ path: 'История', cardCount: 2, stale: false }] }) as any;
  expect(await fetchDecks('http://192.168.1.5:27124')).toEqual([{ path: 'История', cardCount: 2, stale: false }]);
});
test('fetchDeck кодирует кириллический путь', async () => {
  let url = '';
  global.fetch = async (u: any) => { url = u; return { ok: true, json: async () => ({ cards: [] }) } as any; };
  await fetchDeck('http://x', 'История');
  expect(url).toBe('http://x/decks/%D0%98%D1%81%D1%82%D0%BE%D1%80%D0%B8%D1%8F');
});
test('сетевая ошибка → "Obsidian недоступен"', async () => {
  global.fetch = async () => { throw new TypeError('network'); };
  await expect(fetchDecks('http://x')).rejects.toThrow('Obsidian недоступен');
});
```

- [ ] **Step 3: Run fail** → **Step 4: Implement** `api.ts`, `types.ts` → **Step 5: Run pass** — `cd app && npx jest src/__tests__/api.test.ts`.

- [ ] **Step 6: Commit** — `git commit -m "feat: скелет приложения и api-клиент"`

### Task 8: Логика сессии

**Files:**
- Create: `app/src/session.ts`
- Test: `app/src/__tests__/session.test.ts`

**Interfaces:**
- Consumes: `Card` (Task 7).
- Produces: `createSession(cards: Card[]): Session` — перемешивает карточки (seed не нужен); `answer(session, swipe: 'right' | 'left'): { correct: boolean; session: Session }` (right = «верно»); `isFinished(session): boolean`; `results(session): { score: number; total: number; mistakes: Card[] }`. Пустая колода → `isFinished` сразу `true`.

- [ ] **Step 1: Failing test**

```ts
test('правильный свайп засчитывается', () => {
  const s = createSession([CARD_TRUE]); // isTrue: true
  const { correct } = answer(s, 'right');
  expect(correct).toBe(true);
});
test('неверный свайп → ошибка попадает в mistakes', () => { /* answer(s,'left') по isTrue:true → results().mistakes = [CARD_TRUE] */ });
test('score и total после сессии из 2 карточек', () => { /* 1 верный + 1 неверный → {score:1, total:2} */ });
test('пустая колода сразу завершена', () => {
  expect(isFinished(createSession([]))).toBe(true);
});
```

- [ ] **Step 2–5:** run fail → implement `session.ts` (чистые функции, без RN) → run pass → commit `feat: логика сессии`.

### Task 9: Экраны — настройки, список колод, результат

**Files:**
- Create: `app/src/screens/SettingsScreen.tsx`, `app/src/screens/DeckListScreen.tsx`, `app/src/screens/ResultScreen.tsx`
- Create: `app/src/config.ts`
- Modify: `app/App.tsx` — простой state-router (`settings` → `decks` → `session` → `result`), без react-navigation.

**Interfaces:**
- Consumes: `fetchDecks`, `fetchDeck` (Task 7), `results` (Task 8).
- Produces: `config.ts`: `async function getBaseUrl(): Promise<string | null>` / `async function setBaseUrl(url: string): Promise<void>` (AsyncStorage, ключ `obsidian-check:baseUrl`).
- Экраны: Settings — поле IP:порт + «Сохранить»; DeckList — список из `fetchDecks`, значок «обновить» у `stale`, ошибка → текст «Obsidian недоступен…» + кнопка повтора, пустая колода → «нет карточек» (не кликабельна); Result — `score/total` и список mistakes (statement + note).

- [ ] **Step 1: Implement** все три экрана + `config.ts` + роутер в `App.tsx`.

- [ ] **Step 2: Verify** — `cd app && npx tsc --noEmit && npx jest` → зелёно.

- [ ] **Step 3: Commit** — `git commit -m "feat: экраны настроек, колод и результата"`

### Task 10: Экран сессии со свайпами

**Files:**
- Create: `app/src/screens/SessionScreen.tsx`
- Modify: `app/App.tsx` (подключить)

**Interfaces:**
- Consumes: `createSession`, `answer`, `isFinished`, `results` (Task 8); `Card` (Task 7).
- Produces: `SessionScreen({ cards, onDone }: { cards: Card[]; onDone: (r: {score: number; total: number; mistakes: Card[]}) => void })` — `Swiper` из react-native-deck-swiper: `onSwipedRight` → `answer(s,'right')`, `onSwipedLeft` → `answer(s,'left')`; фон карточки мигает зелёным/красным по `correct`; `onSwipedAll` → `onDone(results(session))`. На карточке: `statement` крупно, подсказка «→ верно / ← неверно».

- [ ] **Step 1: Implement** экран.

- [ ] **Step 2: Verify** — `npx tsc --noEmit` → 0 ошибок.

- [ ] **Step 3: Ручная проверка end-to-end** — Obsidian с плагином запущен, `npx expo start`, в Expo Go: ввести IP:порт → выбрать колоду → пройти сессию свайпами → экран результата со счётом и ошибками.

- [ ] **Step 4: Commit** — `git commit -m "feat: свайп-сессия и e2e-связка"`
