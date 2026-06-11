# Migration localStorage → json-server — Design

**Date** : 2026-06-11
**Motivation** : le localStorage est vidé par CCleaner (et plus généralement par toute opération de nettoyage navigateur), ce qui efface comptes et données. Migration vers un stockage **fichier sur disque** via `json-server` pour assurer la persistance.

## 1. Objectifs

- Persistance robuste : les données vivent dans `json-server/db.json` (fichier disque), pas dans le navigateur.
- Aucune perte de fonctionnalité existante.
- API publique des services **inchangée** : zéro modification dans les composants.
- Architecture compatible avec une migration future vers un vrai backend (Supabase / Express / etc.).

## 2. Architecture

### 2.1 Fichiers à créer / modifier

```
src/app/core/config/
  api.config.ts                 ← nouveau : URL de base de l'API
src/app/core/services/
  data-availability.ts          ← nouveau : probe au démarrage + signal online
  auth.ts                       ← refactor HTTP
  registrations.ts              ← refactor HTTP
  season.ts                     ← refactor HTTP
  budget.ts                     ← refactor HTTP
src/app/features/server-down/
  server-down.ts/.html/.scss    ← nouveau : page d'erreur globale
  server-down.spec.ts
src/app/app.ts / .html          ← affiche server-down si !online
src/app/app.config.ts           ← provideAppInitializer pour probe au boot
src/app/core/services/i18n.ts   ← 3 clés FR/EN
json-server/db.json             ← schéma initial (collections vides)
json-server/fakeDb.json         ← supprimé
package.json                    ← script "db"
```

### 2.2 Principes

- **Pas de fallback localStorage** : si `:3000` est down, l'app affiche un écran d'erreur global et bloque toute interaction. Pas de mode dégradé.
- **Session locale uniquement** : `grandtour.session.v1` reste en local/sessionStorage. C'est un `{userId, expiresAt}` — perdre la session = re-login, pas perte de compte.
- **IDs client-side** : `crypto.randomUUID()` reste utilisé pour tous les `id`. json-server accepte les IDs custom.
- **Hash client-side** : SHA-256(password + salt) reste calculé dans `AuthService`. Le hash circule sur HTTP (acceptable en localhost, sera repensé lors du vrai déploiement).
- **Updates optimistes** : le signal local est mis à jour immédiatement, le HTTP suit. Aucun spinner sur les actions simples.
- **Erreurs HTTP** : log console + signal local conservé (pas de rollback complexe). L'erreur "serveur totalement down" est gérée séparément via `DataAvailabilityService`.

## 3. Schéma `db.json`

Quatre collections, plates. Les `matches` restent imbriqués dans `results` (évite une jointure manuelle, pas de requête analytique inter-rounds).

```json
{
  "users": [
    {
      "id": "uuid-v4",
      "username": "william",
      "email": "william@example.com",
      "bandaiId": "12345678",
      "passwordHash": "sha256-hex",
      "salt": "hex-16-bytes",
      "recoveryCodeHash": "sha256-hex",
      "recoveryCodeUpdatedAt": 1717100000000,
      "createdAt": 1717000000000
    }
  ],
  "registrations": [
    {
      "id": "uuid",
      "userId": "uuid",
      "eventId": "regional-paris-2026",
      "createdAt": 1717000000000
    }
  ],
  "results": [
    {
      "id": "uuid",
      "userId": "uuid",
      "eventId": "regional-paris-2026",
      "deckName": "Goku Black",
      "leaderPlayed": "Goku Black",
      "placement": 4,
      "totalPlayers": 128,
      "prizes": 80,
      "notes": "...",
      "matches": [
        { "round": 1, "opponentLeader": "Vegeta", "result": "Win" }
      ],
      "createdAt": 1717000000000,
      "updatedAt": 1717100000000
    }
  ],
  "expenses": [
    {
      "id": "uuid",
      "userId": "uuid",
      "eventId": "regional-paris-2026",
      "category": "Transport",
      "amount": 80,
      "currency": "EUR",
      "notes": "TER",
      "createdAt": 1717000000000
    }
  ]
}
```

### 3.1 Différences vs schéma localStorage actuel

| Domaine | Avant (localStorage) | Après (json-server) |
|---|---|---|
| `users` | clé `grandtour.users.v1` = `User[]` partagé | collection `/users` |
| `registrations` | clé `grandtour.registrations.v1.{userId}` = `string[]` | collection `/registrations` (1 ligne par inscription, `id` propre) |
| `results` | clé `grandtour.results.v1.{userId}` = `Record<eventId, PlayerResult>` | collection `/results` (array flat avec `userId`) |
| `expenses` | clé `grandtour.expenses.v1.{userId}` = `Expense[]` | collection `/expenses` (champ `userId` ajouté) |

### 3.2 Filtrage user-scoped

Tous les GET portent `?userId={id}` (filtre natif json-server). Exemple :
```
GET /results?userId=abc
GET /expenses?userId=abc
GET /registrations?userId=abc
```

`AuthService` reste différent : `GET /users?username=X` ou `GET /users?email=Y` pour login + unicité.

## 4. `api.config.ts`

```ts
export const API_BASE_URL = 'http://localhost:3000';
```

Tous les services importent cette constante. Migration prod future = changer cette URL (ou la lire depuis `environment.ts`).

## 5. Pattern de refactor des services

Tous les services suivent la même structure :
1. Signal interne hydraté depuis le serveur au démarrage (via `effect(currentUserId)`).
2. Mutations optimistes : `signal.update()` immédiat + HTTP `POST/PATCH/DELETE` async.
3. API publique inchangée pour les composants.

### 5.1 Exemple détaillé — `RegistrationsService`

```ts
@Injectable({ providedIn: 'root' })
export class RegistrationsService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly _ids = signal<Set<string>>(new Set());
  readonly ids = this._ids.asReadonly();

  // Map { eventId → row.id } pour pouvoir DELETE
  private rowIdByEvent = new Map<string, string>();

  constructor() {
    effect(async () => {
      const userId = this.auth.currentUserId();
      if (!userId) {
        this._ids.set(new Set());
        this.rowIdByEvent.clear();
        return;
      }
      const rows = await firstValueFrom(
        this.http.get<RegistrationRow[]>(
          `${API_BASE_URL}/registrations`,
          { params: { userId } },
        ),
      );
      this.rowIdByEvent = new Map(rows.map((r) => [r.eventId, r.id]));
      this._ids.set(new Set(rows.map((r) => r.eventId)));
    });
  }

  async set(eventId: string, registered: boolean): Promise<void> {
    const userId = this.auth.currentUserId();
    if (!userId) return;

    if (registered && !this._ids().has(eventId)) {
      const row = {
        id: crypto.randomUUID(),
        userId,
        eventId,
        createdAt: Date.now(),
      };
      this._ids.update((s) => new Set(s).add(eventId));
      this.rowIdByEvent.set(eventId, row.id);
      try {
        await firstValueFrom(
          this.http.post(`${API_BASE_URL}/registrations`, row),
        );
      } catch (err) {
        console.error('register failed', err);
      }
    } else if (!registered && this._ids().has(eventId)) {
      const rowId = this.rowIdByEvent.get(eventId);
      if (!rowId) return;
      this._ids.update((s) => {
        const n = new Set(s);
        n.delete(eventId);
        return n;
      });
      this.rowIdByEvent.delete(eventId);
      try {
        await firstValueFrom(
          this.http.delete(`${API_BASE_URL}/registrations/${rowId}`),
        );
      } catch (err) {
        console.error('unregister failed', err);
      }
    }
  }
}
```

### 5.2 `AuthService`

Plus complexe parce qu'il fait du read-before-write.

| Méthode | Avant | Après |
|---|---|---|
| `register(input)` | check unicité in-memory, push, persist | `GET /users?username=X` + `GET /users?email=Y` pour unicité, puis `POST /users` |
| `login(identifier, password, remember)` | find in-memory, hash, compare | `GET /users?username=X` (ou `?email=X`) → hash input avec le salt reçu → compare → session locale |
| `forgotPassword(identifier, code, newPassword)` | find, valider recoveryCodeHash, update | `GET /users?…` → valider hash → `PATCH /users/:id` |
| `updateProfile(patch)` | mute in-memory + persist | `PATCH /users/:id` (avec check d'unicité préalable si username/email changent) |
| `deleteAccount()` | splice in-memory + persist | DELETE en cascade : `DELETE /registrations?userId=X`, `…/results?userId=X`, `…/expenses?userId=X` (boucle), puis `DELETE /users/:id` |
| `logout()` | clear session storage | inchangé |
| Recovery code | identique | identique, juste async |

La **session** (`{userId, expiresAt}`) reste en local/sessionStorage. `currentUserId()` reste un signal sync lu sur cette clé.

### 5.3 `SeasonService`

| Méthode | Avant | Après |
|---|---|---|
| `effect(currentUserId)` reload | `read(localStorage)` | `GET /results?userId=X` → reconstruit `Record<eventId, PlayerResult>` en mémoire |
| `forEvent(eventId)` | lookup in-memory | inchangé (signal local) |
| `upsertResult(eventId, patch)` | mute + persist | optimistic mute + `POST /results` (création) ou `PATCH /results/:id` (update) |
| `deleteResult(eventId)` | splice + persist | optimistic mute + `DELETE /results/:id` |
| `addMatch(eventId, match)` | append in nested array + persist | optimistic mute + `PATCH /results/:id` avec le nouveau tableau `matches` complet |
| `deleteMatch(eventId, round)` | splice + renumber + persist | optimistic mute + `PATCH /results/:id` |

### 5.4 `BudgetService`

| Méthode | Avant | Après |
|---|---|---|
| reload | `read(localStorage)` | `GET /expenses?userId=X` |
| `add(input)` | push + persist | optimistic push + `POST /expenses` |
| `remove(id)` | filter + persist | optimistic filter + `DELETE /expenses/:id` |

## 6. `DataAvailabilityService` + page Server Down

### 6.1 Service

```ts
@Injectable({ providedIn: 'root' })
export class DataAvailabilityService {
  private readonly http = inject(HttpClient);
  private readonly _online = signal<boolean | null>(null);
  readonly online = this._online.asReadonly();

  async probe(): Promise<void> {
    try {
      await firstValueFrom(
        this.http.get(`${API_BASE_URL}/users`, { params: { _limit: '1' } }),
      );
      this._online.set(true);
    } catch {
      this._online.set(false);
    }
  }

  async retry(): Promise<void> {
    this._online.set(null);
    await this.probe();
  }
}
```

### 6.2 Probe au boot

Dans `app.config.ts` :

```ts
provideAppInitializer(async () => {
  await inject(DataAvailabilityService).probe();
}),
```

### 6.3 `app.html`

```html
@if (availability.online() === false) {
  <app-server-down />
} @else if (availability.online() === true) {
  <!-- topbar + router-outlet existants -->
}
```

`null` = état pendant la probe (≤ 200 ms) → écran blanc imperceptible.

### 6.4 Composant `ServerDown`

Carte centrée full-page, surface sombre, icône warning ambrée, snippet code `npm run db`, bouton "Réessayer" appelant `availability.retry()`.

Aucune route — c'est un composant inline dans l'app shell. Pas de `canActivate` global nécessaire.

### 6.5 i18n

Trois clés FR/EN :
- `serverDown.title`
- `serverDown.body` (mentionne `npm run db`)
- `serverDown.cta`

## 7. `package.json`

```json
"scripts": {
  "ng": "ng",
  "start": "ng serve",
  "db": "json-server --watch json-server/db.json --port 3000",
  "build": "ng build",
  "test": "ng test"
}
```

`--routes` retiré (les routes par défaut suffisent).

## 8. Tests

### 8.1 Services

Pattern Angular standard avec `HttpTestingController` :
- Vérifier que `set(eventId, true)` émet un `POST /registrations` avec le bon body.
- Vérifier que le signal local a déjà bougé **avant** la résolution du POST (optimistic update).
- Vérifier que `set(false)` émet un `DELETE /registrations/:id` avec le bon `id`.
- Cas erreur HTTP : signal reste à jour, console.error appelé.

Refactoriser les specs existantes (`auth.spec.ts`, `registrations.spec.ts`, `season.spec.ts`, `budget.spec.ts`) pour utiliser `provideHttpClientTesting()` au lieu de l'environnement actuel.

### 8.2 Composants

Pas de changement requis. Les composants n'appellent que l'API publique des services, qui reste identique (modulo `Promise<void>` au lieu de `void` mais ils n'utilisent pas le retour).

### 8.3 `DataAvailability` + `ServerDown`

- Smoke test du composant `ServerDown`.
- Test du service : probe succès → `online() === true`. Probe échec → `online() === false`. `retry()` repart à `null` puis re-probe.

## 9. Plan d'exécution

1. **Infra** : créer `json-server/db.json`, ajouter script `npm run db`, créer `api.config.ts`. Supprimer `fakeDb.json` et la mention de `--routes` dans le script.
2. **`DataAvailabilityService`** + **`ServerDownComponent`** + intégration dans `app.ts` + clés i18n FR/EN.
3. **Refactor `AuthService`** (le plus volumineux) + ses tests.
4. **Refactor `RegistrationsService`** + tests.
5. **Refactor `SeasonService`** + tests.
6. **Refactor `BudgetService`** + tests.
7. **Cleanup** : retrait du code localStorage des 4 services, suppression de `fakeDb.json`.
8. **Build + tests verts**.
9. **Smoke navigateur** : lancer `npm run db` + `npm start`, créer un compte, marquer "Je participe", ajouter un résultat, vérifier `db.json` à la main.
10. **Mémoire** : mettre à jour `project_architecture.md` (localStorage → json-server).

## 10. Non-objectifs (YAGNI)

- Pas de retry automatique HTTP côté services.
- Pas de gestion de conflits / collisions d'ID.
- Pas de loaders/spinners (UI optimiste).
- Pas de cache de réponses HTTP (signals suffisent).
- Pas de pagination json-server (volumes < 1000 lignes).
- Pas de migration des données localStorage existantes (option C confirmée).
- Pas de middleware json-server (bcrypt, auth, etc.) — ce sera un vrai backend quand prod.
- Pas de tests E2E supplémentaires.
