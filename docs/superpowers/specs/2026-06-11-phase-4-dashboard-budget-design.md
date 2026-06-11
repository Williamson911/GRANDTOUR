# Phase 4 — Dashboard & Budget agrégé — Design

**Date** : 2026-06-11
**Périmètre** : compléter `/dashboard` (placeholder) et `/budget` (placeholder) avec leurs vues agrégées respectives, pour clore la Phase 4 de la roadmap `dbscg-circuit-planner`.

## 1. Objectifs

- **`/dashboard`** : 6 widgets bento — Win Rate global, Best placement, Carte villes visitées, Matchup breakdown (filtrable par deck joué), Win Rate par deck, Bilan financier, Prochains events.
- **`/budget`** : 3 grands totaux saison + breakdown par catégorie + tableau triable par événement.
- **Filtre temporel** : sélecteur d'année par défaut sur l'année courante (2026). Pas de filtre wave.

## 2. Architecture

### 2.1 Fichiers

```
src/app/core/stats/
  season-stats.ts            ← module de fonctions pures (nouveau)
  season-stats.spec.ts       ← tests unitaires exhaustifs (nouveau)
src/app/core/utils/
  leaflet-tile.ts            ← URL + factory tile layer CARTO dark (nouveau, extrait de map.ts)
src/app/features/dashboard/
  dashboard.ts/.html/.scss   ← remplace placeholder
src/app/features/budget/
  budget.ts/.html/.scss      ← remplace placeholder
src/app/features/map/
  map.ts                     ← refactor pour utiliser leaflet-tile.ts
src/app/core/services/
  i18n.ts                    ← nouvelles clés FR/EN
```

### 2.2 Principe

- **Aucun nouveau service, aucun state additionnel.** Toutes les agrégations sont des fonctions pures dans `core/stats/season-stats.ts`.
- Les pages injectent `SeasonService`, `BudgetService`, `EventService` existants et passent `allResults()`, `expenses()`, `events()` aux fonctions de stats via des `computed()`.
- Le sélecteur d'année est un `signal<number>` local à chaque page. Pas de composant partagé pour 2 pages.

### 2.3 Modèle de données

**Aucun changement.** `MatchResult` garde `Draw` (un draw est possible en top BO3 sur fin de temps). Pas de champ `wave` ajouté à `Event`.

## 3. Module `season-stats.ts`

### 3.1 Types

```ts
export interface MatchRecord {
  w: number;
  l: number;
  d: number;
  b: number;
}

export interface WinRateStats {
  played: number;
  record: MatchRecord;
  winRate: number; // 0..1
}

export interface DeckStatsRow {
  deckName: string;
  played: number;
  record: MatchRecord;
  winRate: number;
}

export interface MatchupRow {
  opponentLeader: string;
  played: number;
  record: MatchRecord;
  winRate: number;
}

export interface BestPlacement {
  eventId: string;
  eventName: string;
  placement: number;
  totalPlayers: number;
}

export interface CityVisit {
  city: string;
  country: string;
  lat: number;
  lng: number;
  count: number;
}

export interface BudgetCategoryRow {
  category: ExpenseCategory;
  amount: number;
  share: number; // 0..1
}

export interface BudgetEventRow {
  eventId: string;
  eventName: string;
  date: Date;
  spent: number;
  prizes: number;
  net: number;
}

export interface BudgetTotals {
  spent: number;
  prizes: number;
  net: number;
}
```

### 3.2 Fonctions exportées

| Signature | Comportement |
|---|---|
| `filterResultsByYear(results, events, year): PlayerResult[]` | Garde les results dont l'event correspondant a `date.getFullYear() === year`. |
| `filterExpensesByYear(expenses, events, year): Expense[]` | Idem côté expenses. |
| `aggregateRecord(matches): MatchRecord` | Compte W/L/D/B. |
| `computeWinRate(record): number` | `(W + B + 0.5·D) / (W + L + B + D)`. Renvoie `0` si dénominateur vaut 0. |
| `globalWinRate(results): WinRateStats` | Agrège tous les matchs de tous les results. |
| `winRateByDeck(results): DeckStatsRow[]` | Groupé par `deckName`, trié par `played` desc. |
| `matchupBreakdown(results, deckFilter?): MatchupRow[]` | Groupé par `opponentLeader`, optionnellement filtré sur le `leaderPlayed` du result. Trié par `played` desc. |
| `bestPlacement(results, events): BestPlacement \| null` | Result avec `placement` minimum absolu. `null` si aucun result. |
| `citiesVisited(results, events): CityVisit[]` | Groupé par `event.location.city` ; n'inclut que les events avec `matches.length > 0`. |
| `budgetByCategory(expenses): BudgetCategoryRow[]` | Trié par `amount` desc, n'inclut que les catégories présentes. |
| `budgetByEvent(expenses, results, events): BudgetEventRow[]` | Une ligne par event ayant ≥ 1 dépense OU ≥ 1 gain. Trié par `date` desc. |
| `budgetTotals(expenses, results): BudgetTotals` | `spent`, `prizes`, `net = prizes - spent`. |
| `computeAvailableYears(events, results, expenses): number[]` | Union des années présentes dans les events référencés par results/expenses + année courante. Trié desc. |

### 3.3 Conventions

- **Bucketisation année** : `event.date.getFullYear()`.
- **Tableaux vides en entrée** → `[]`, `null`, ou record/totals à zéro selon le type de retour.
- **Division par zéro** dans `computeWinRate({0,0,0,0})` → `0`.
- **Ordre stable** : tri secondaire par clé alphabétique en cas d'égalité (pour avoir des tests déterministes).

## 4. Page `/budget`

### 4.1 Structure visuelle

```
┌──────────────────────────────────────────────────────────┐
│  Budget                                  Année [2026 ▾] │
├──────────────────────────────────────────────────────────┤
│  [DÉPENSÉ]  [GAINS]  [NET coloré]                        │
├──────────────────────────────────────────────────────────┤
│  Par catégorie  (barres CSS, masque les catégories vides)│
├──────────────────────────────────────────────────────────┤
│  Par événement  (table triable Event/Date/Spent/Prizes/Net)
└──────────────────────────────────────────────────────────┘
```

### 4.2 Computeds

```ts
selectedYear = signal(new Date().getFullYear())
events = computed(() => this.eventService.events())
results = computed(() => this.season.allResults())
expenses = computed(() => this.budget.expenses())

availableYears = computed(() => computeAvailableYears(events(), results(), expenses()))
filteredResults = computed(() => filterResultsByYear(results(), events(), selectedYear()))
filteredExpenses = computed(() => filterExpensesByYear(expenses(), events(), selectedYear()))

totals = computed(() => budgetTotals(filteredExpenses(), filteredResults()))
byCategory = computed(() => budgetByCategory(filteredExpenses()))
byEvent = computed(() => budgetByEvent(filteredExpenses(), filteredResults(), events()))

sortKey = signal<'event' | 'date' | 'spent' | 'prizes' | 'net'>('date')
sortDir = signal<'asc' | 'desc'>('desc')
sortedByEvent = computed(() => /* tri pur de byEvent() */)
```

### 4.3 Style

- Net coloré : `--color-primary` (rouge) si `< 0`, `--color-accent` (doré) si `≥ 0`.
- Barres CSS : `width: calc(share * 100%)`, fill `--color-accent`.
- Empty states : par section, texte i18n.

## 5. Page `/dashboard`

### 5.1 Layout bento

```scss
.bento {
  display: grid;
  grid-template-columns: 2fr 1fr;
  grid-template-areas:
    "wr   best"
    "map  map"
    "matchup deck"
    "money next";
  gap: 1rem;
}
@media (max-width: 720px) {
  .bento {
    grid-template-columns: 1fr;
    grid-template-areas: "wr" "best" "map" "matchup" "deck" "money" "next";
  }
}
```

### 5.2 Widgets

| Zone | Contenu |
|---|---|
| `wr` | Gros chiffre `XX %` + ligne secondaire `W-L-D-B` + nb matchs joués. |
| `best` | Medal SVG inline + `#N sur totalPlayers` + nom event. Empty si `null`. |
| `map` | Compteur `X villes · Y pays` + mini-Leaflet 250px CARTO dark, markers dorés (pas de pulse), pas de popup. |
| `matchup` | `<select>` deckFilter peuplé par `winRateByDeck().map(d => d.deckName)` + option "Tous". Table compacte triée par `played` desc. |
| `deck` | Table compacte (deck, N, WR). |
| `money` | 3 chiffres (Dépensé/Gains/Net) + `RouterLink → /budget`. |
| `next` | `EventService.events().filter(e => e.registered && e.date >= now).slice(0, 3)`. **Non filtré par année** (toujours le prochain horizon). |

### 5.3 Computeds

Pattern identique à Budget : `selectedYear`, `filteredResults` puis chaque widget reçoit le bon sous-ensemble. Ajout :
```ts
selectedDeck = signal<string>('') // '' = tous
matchups = computed(() => matchupBreakdown(filteredResults(), selectedDeck() || undefined))
```

### 5.4 Mini-Leaflet

- Init dans `afterNextRender`.
- `createDarkTileLayer()` partagé avec `/map`.
- `createGoldMarker(lat, lng)` : factorisation du marker Regional existant **sans** l'animation pulse.
- Bounds auto via `L.featureGroup(markers).getBounds()` avec padding.
- Re-init si la liste de villes change (pour gérer le changement d'année).

## 6. i18n

Nouvelles clés à ajouter dans `core/services/i18n.ts` (FR/EN) :

```
budget.title
budget.year
budget.totals.spent / .prizes / .net
budget.byCategory.title / .empty
budget.byEvent.title / .empty
budget.byEvent.col.event / .date / .spent / .prizes / .net

dashboard.title
dashboard.year
dashboard.wr.title / .played / .record
dashboard.best.title / .empty / .outOf
dashboard.cities.title / .count  (interpolation {cities}, {countries})
dashboard.matchup.title / .deckFilter / .all / .empty
dashboard.matchup.col.opp / .n / .wr
dashboard.deck.title / .empty
dashboard.deck.col.deck / .n / .wr
dashboard.money.title / .seeDetail
dashboard.next.title / .empty
```

## 7. Tests

### 7.1 `season-stats.spec.ts`

Un `describe` par fonction, chaque suite couvre :
- Cas vide (`[]` partout).
- Cas single (1 match, 1 result, 1 event).
- Cas nominal multi-events multi-decks multi-années.
- Edge cases :
  - `computeWinRate` avec record vide → `0`.
  - `computeWinRate` avec uniquement byes → `1`.
  - `computeWinRate` avec uniquement draws → `0.5`.
  - `filterResultsByYear` exclut bien les events d'une autre année.
  - `citiesVisited` exclut les events `matches.length === 0`.
  - `bestPlacement` sur résultats vides → `null`.
  - `matchupBreakdown(deckFilter)` exclut les matchs hors du deck.

### 7.2 Composants

- `dashboard.spec.ts` : smoke conservé + 1 test "renders WR header text with seeded data".
- `budget.spec.ts` : smoke conservé + 1 test "renders totals row with seeded data".

Pas de test E2E.

## 8. Plan d'exécution suggéré

1. Extraire `core/utils/leaflet-tile.ts` + refactor `features/map/map.ts` pour l'utiliser.
2. Créer `core/stats/season-stats.ts` (types uniquement).
3. Écrire `season-stats.spec.ts` (TDD : tests d'abord pour chaque fonction).
4. Implémenter les fonctions une par une jusqu'au vert.
5. Ajouter les clés i18n FR/EN.
6. Refaire `/budget` (component + template + style + spec).
7. Refaire `/dashboard` (component + template + style bento + mini-leaflet + spec).
8. Lancer lint + tests → tout vert.
9. Mettre à jour `memory/project_progress.md` (Phase 4 → ✅).

## 9. Non-objectifs (YAGNI)

- Pas de bibliothèque de charts.
- Pas d'export CSV ni de partage.
- Pas de filtre par wave (modèle Event sans wave).
- Pas de comparaison année N vs N−1.
- Pas de cache des computeds (signals d'Angular suffisent).
- Pas de bascule json-server (architecture localStorage conservée).
