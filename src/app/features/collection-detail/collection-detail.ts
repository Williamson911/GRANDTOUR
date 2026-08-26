import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { CardPrinting, CollectionDraft, printingDisplayName, printingKey } from '../../core/models/collection';
import {
  awakenedAwareImageUrl,
  colorSwatch as sharedColorSwatch,
  rarityCode as sharedRarityCode,
} from '../../core/services/cards';
import { CollectionsService } from '../../core/services/collections';
import { I18nService } from '../../core/services/i18n';

@Component({
  selector: 'app-collection-detail',
  imports: [RouterLink, DecimalPipe],
  templateUrl: './collection-detail.html',
  styleUrl: './collection-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectionDetail {
  private readonly collections = inject(CollectionsService);
  private readonly router = inject(Router);
  protected readonly i18n = inject(I18nService);

  readonly collectionId = input.required<string>();

  protected readonly draft = signal<CollectionDraft | null>(null);
  protected readonly loading = signal(true);
  protected readonly notFound = signal(false);
  protected readonly deleting = signal(false);

  protected readonly items = computed(() => this.draft()?.items ?? []);
  protected readonly cardCount = computed(() =>
    this.items().reduce((sum, item) => sum + item.quantity, 0),
  );
  protected readonly totalPrice = computed(() =>
    this.items().reduce((sum, item) => sum + item.quantity * item.price, 0),
  );

  constructor() {
    let requestId = 0;
    effect(() => {
      const id = this.collectionId();
      if (!id) return;
      const thisRequest = ++requestId;
      this.loading.set(true);
      this.notFound.set(false);
      void this.collections.getById(id).then((loaded) => {
        if (thisRequest !== requestId) return;
        this.loading.set(false);
        if (!loaded) {
          this.notFound.set(true);
          return;
        }
        this.draft.set(loaded);
      });
    });
  }

  protected imageUrl(printing: CardPrinting): string | null {
    return awakenedAwareImageUrl(printing);
  }

  protected displayName(printing: CardPrinting): string {
    return printingDisplayName(printing);
  }

  protected trackByPrinting(_index: number, item: { card: CardPrinting }): string {
    return printingKey(item.card);
  }

  protected colorSwatch(color: string): string {
    return sharedColorSwatch(color);
  }

  protected rarityCode(rarity: string): string {
    return sharedRarityCode(rarity);
  }

  protected async deleteCollection(): Promise<void> {
    if (!confirm(this.i18n.t('collection.detail.deleteConfirm'))) return;
    this.deleting.set(true);
    const result = await this.collections.remove(this.collectionId());
    this.deleting.set(false);
    if (result.ok) {
      void this.router.navigate(['/collection']).catch(() => {});
    }
  }
}
