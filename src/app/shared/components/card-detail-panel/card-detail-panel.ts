import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { CardPrinting, printingDisplayName, printingKey } from '../../../core/models/collection';
import { cardImageUrl } from '../../../core/services/cards';
import { I18nService } from '../../../core/services/i18n';

@Component({
  selector: 'app-card-detail-panel',
  imports: [ReactiveFormsModule],
  templateUrl: './card-detail-panel.html',
  styleUrl: './card-detail-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardDetailPanel {
  private readonly fb = inject(FormBuilder);
  protected readonly i18n = inject(I18nService);

  readonly printing = input.required<CardPrinting>();
  readonly initialQuantity = input<number | null>(null);
  readonly initialPrice = input<number | null>(null);

  readonly added = output<{ quantity: number; price: number }>();
  readonly removed = output<void>();
  readonly closed = output<void>();

  protected readonly displayName = computed(() => printingDisplayName(this.printing()));
  protected readonly imgUrl = computed(() => cardImageUrl(this.printing().imgLink));
  protected readonly isExisting = computed(() => this.initialQuantity() !== null);

  readonly form: FormGroup = this.fb.group({
    quantity: [1, [Validators.required, Validators.min(1)]],
    price: [0, [Validators.required, Validators.min(0)]],
  });

  constructor() {
    let lastKey: string | null = null;
    effect(() => {
      const key = printingKey(this.printing());
      const qty = this.initialQuantity();
      const price = this.initialPrice();
      // Only re-hydrate when the selected card itself changes — not on every
      // quantity/price signal read — so a sibling UI element (e.g. a row's
      // own quantity steppers) mutating the same item's data while this panel
      // is open doesn't clobber an in-progress edit, and switching directly
      // between two different cards (without the panel ever closing) always
      // resets the form instead of leaving stale values behind.
      if (key !== lastKey) {
        lastKey = key;
        this.form.patchValue({ quantity: qty ?? 1, price: price ?? 0 }, { emitEvent: false });
      }
    });
  }

  add(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.added.emit({
      quantity: Number(this.form.value.quantity),
      price: Number(this.form.value.price),
    });
  }

  remove(): void {
    this.removed.emit();
  }

  protected close(): void {
    this.closed.emit();
  }
}
