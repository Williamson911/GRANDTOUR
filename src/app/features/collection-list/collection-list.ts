import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CollectionSummary } from '../../core/models/collection';
import { cardBackImageUrl, cardImageUrl } from '../../core/services/cards';
import { CollectionsService } from '../../core/services/collections';
import { I18nService } from '../../core/services/i18n';

@Component({
  selector: 'app-collection-list',
  imports: [RouterLink, CurrencyPipe],
  templateUrl: './collection-list.html',
  styleUrl: './collection-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectionList {
  private readonly collections = inject(CollectionsService);
  protected readonly i18n = inject(I18nService);

  readonly items = signal<CollectionSummary[]>([]);
  protected readonly loading = signal(true);

  constructor() {
    void this.collections.list().then((rows) => {
      this.items.set(rows);
      this.loading.set(false);
    });
  }

  protected thumbnailUrl(item: CollectionSummary): string | null {
    return cardBackImageUrl(item.thumbnailImgLink) ?? cardImageUrl(item.thumbnailImgLink);
  }

  protected onThumbnailError(event: Event, item: CollectionSummary): void {
    const img = event.target as HTMLImageElement;
    const fallback = cardImageUrl(item.thumbnailImgLink);
    if (fallback && img.src !== fallback) {
      img.src = fallback;
    }
  }
}
