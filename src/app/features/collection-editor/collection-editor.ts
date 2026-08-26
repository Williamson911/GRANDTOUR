import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import {
  CardLanguage,
  CardPrinting,
  CollectionDraft,
  CollectionItem,
  printingKey,
} from '../../core/models/collection';
import { CollectionsService } from '../../core/services/collections';
import { I18nService } from '../../core/services/i18n';
import { CardDetailPanel } from '../../shared/components/card-detail-panel/card-detail-panel';
import { CardGrid } from '../../shared/components/card-grid/card-grid';
import { CollectionItemRow } from '../../shared/components/collection-item-row/collection-item-row';

function emptyDraft(): CollectionDraft {
  return { id: null, name: '', items: [] };
}

@Component({
  selector: 'app-collection-editor',
  imports: [RouterLink, CardGrid, CardDetailPanel, CollectionItemRow],
  templateUrl: './collection-editor.html',
  styleUrl: './collection-editor.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectionEditor {
  private readonly collections = inject(CollectionsService);
  private readonly router = inject(Router);
  protected readonly i18n = inject(I18nService);

  readonly collectionId = input<string | undefined>(undefined);

  readonly draft = signal<CollectionDraft>(emptyDraft());
  protected readonly selectedPrinting = signal<CardPrinting | null>(null);
  protected readonly saving = signal(false);
  readonly saveError = signal('');
  protected readonly loading = signal(false);

  protected readonly items = computed(() => this.draft().items);
  protected readonly totalPrice = computed(() =>
    this.items().reduce((sum, item) => sum + item.quantity * item.price, 0),
  );
  protected readonly cardCount = computed(() =>
    this.items().reduce((sum, item) => sum + item.quantity, 0),
  );
  protected readonly selectedExisting = computed(() => {
    const printing = this.selectedPrinting();
    if (!printing) return undefined;
    return this.items().find((item) => printingKey(item.card) === printingKey(printing));
  });
  protected readonly backLink = computed(() => {
    const id = this.collectionId();
    return id ? ['/collection', id] : ['/collection'];
  });

  constructor() {
    // Signal inputs set via `setInput()` (as tests do) are only applied
    // after this constructor already ran, so a plain synchronous read here
    // would always see the default value. Use `effect()` instead so the
    // load kicks off once the input's real value is in place. This also
    // means the effect can legitimately re-run later if `collectionId`
    // changes on a reused instance (e.g. navigating between two
    // `/collection/:id` routes) — the `requestId` guard below makes sure
    // a slower, now-stale fetch for a previous id can never overwrite the
    // draft after a newer fetch has already resolved.
    let requestId = 0;
    effect(() => {
      const id = this.collectionId();
      if (!id) return;
      const thisRequest = ++requestId;
      this.loading.set(true);
      void this.collections.getById(id).then((loaded) => {
        if (thisRequest !== requestId) return;
        this.loading.set(false);
        if (loaded) this.draft.set(loaded);
      });
    });
  }

  onNameInput(value: string): void {
    this.draft.update((d) => ({ ...d, name: value }));
  }

  selectPrinting(printing: CardPrinting): void {
    this.selectedPrinting.set(printing);
  }

  protected selectExistingItem(item: CollectionItem): void {
    this.selectedPrinting.set(item.card);
  }

  protected closeDetail(): void {
    this.selectedPrinting.set(null);
  }

  addOrUpdateItem(values: { quantity: number; price: number; language: CardLanguage | null }): void {
    const printing = this.selectedPrinting();
    if (!printing) return;
    const key = printingKey(printing);
    this.draft.update((d) => {
      const index = d.items.findIndex((item) => printingKey(item.card) === key);
      const newItem: CollectionItem = {
        quantity: values.quantity,
        price: values.price,
        language: values.language,
        card: printing,
      };
      const items =
        index === -1
          ? [...d.items, newItem]
          : d.items.map((item, i) => (i === index ? newItem : item));
      return { ...d, items };
    });
    this.selectedPrinting.set(null);
  }

  protected removeSelectedItem(): void {
    const printing = this.selectedPrinting();
    if (!printing) return;
    this.removeItem(printing);
    this.selectedPrinting.set(null);
  }

  removeItem(card: CardPrinting): void {
    const key = printingKey(card);
    this.draft.update((d) => ({
      ...d,
      items: d.items.filter((item) => printingKey(item.card) !== key),
    }));
  }

  changeQuantity(card: CardPrinting, quantity: number): void {
    const key = printingKey(card);
    this.draft.update((d) => ({
      ...d,
      items: d.items.map((item) => (printingKey(item.card) === key ? { ...item, quantity } : item)),
    }));
  }

  async save(): Promise<void> {
    if (!this.draft().name.trim()) {
      this.saveError.set(this.i18n.t('collection.errors.nameRequired'));
      return;
    }
    this.saving.set(true);
    this.saveError.set('');
    const draft = this.draft();
    let savedId: string;
    if (draft.id) {
      const result = await this.collections.update(draft.id, draft);
      this.saving.set(false);
      if (!result.ok) {
        this.saveError.set(this.i18n.t('collection.errors.saveFailed'));
        return;
      }
      savedId = draft.id;
    } else {
      const result = await this.collections.create(draft);
      this.saving.set(false);
      if (!result.ok) {
        this.saveError.set(this.i18n.t('collection.errors.saveFailed'));
        return;
      }
      savedId = result.id;
    }
    // Swallow navigation failures (e.g. the target route not being
    // registered yet) rather than leaving an unhandled rejection.
    void this.router.navigate(['/collection', savedId]).catch(() => {});
  }
}
