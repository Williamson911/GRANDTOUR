import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { CardLanguage, CardPrinting, printingDisplayName } from '../../../core/models/collection';
import { awakenedAwareImageUrl } from '../../../core/services/cards';

@Component({
  selector: 'app-collection-item-row',
  imports: [DecimalPipe],
  templateUrl: './collection-item-row.html',
  styleUrl: './collection-item-row.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectionItemRow {
  readonly card = input.required<CardPrinting>();
  readonly quantity = input.required<number>();
  readonly price = input.required<number>();
  readonly language = input<CardLanguage | null>(null);

  readonly clicked = output<void>();
  readonly quantityChanged = output<number>();
  readonly removed = output<void>();

  protected readonly displayName = computed(() => printingDisplayName(this.card()));
  protected readonly imgUrl = computed(() => awakenedAwareImageUrl(this.card()));
  readonly lineTotal = computed(() => this.quantity() * this.price());

  increment(): void {
    this.quantityChanged.emit(this.quantity() + 1);
  }

  decrement(): void {
    if (this.quantity() <= 1) return;
    this.quantityChanged.emit(this.quantity() - 1);
  }

  protected select(): void {
    this.clicked.emit();
  }

  remove(event: Event): void {
    event.stopPropagation();
    this.removed.emit();
  }
}
