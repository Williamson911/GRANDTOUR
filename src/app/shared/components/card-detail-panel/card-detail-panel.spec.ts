import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { CardPrinting } from '../../../core/models/collection';
import { CardDetailPanel } from './card-detail-panel';

const GOKU: CardPrinting = {
  cardId: 'card-1',
  variantId: null,
  name: 'Son Goku',
  backName: null,
  cardType: 'LEADER',
  color: 'Red',
  cardNumber: 'BT18-030',
  series: 'BT18',
  rarity: 'Common[C]',
  imgLink: 'BT18-030',
};
const VEGETA: CardPrinting = { ...GOKU, cardId: 'card-2', name: 'Vegeta', cardNumber: 'BT18-031' };

describe('CardDetailPanel', () => {
  let fixture: ComponentFixture<CardDetailPanel>;
  let component: CardDetailPanel;

  async function setup(initialQuantity: number | null, initialPrice: number | null): Promise<void> {
    await TestBed.configureTestingModule({ imports: [CardDetailPanel] }).compileComponents();
    fixture = TestBed.createComponent(CardDetailPanel);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('printing', GOKU);
    fixture.componentRef.setInput('initialQuantity', initialQuantity);
    fixture.componentRef.setInput('initialPrice', initialPrice);
    fixture.detectChanges();
  }

  it('should create', async () => {
    await setup(null, null);
    expect(component).toBeTruthy();
  });

  it('defaults the form to quantity 1 / price 0 for a new item', async () => {
    await setup(null, null);
    expect(component.form.value).toEqual({ quantity: 1, price: 0 });
  });

  it('prefills the form when editing an existing item', async () => {
    await setup(3, 12.5);
    expect(component.form.value).toEqual({ quantity: 3, price: 12.5 });
  });

  it('emits quantity and price on add()', async () => {
    await setup(null, null);
    const spy = vi.fn();
    component.added.subscribe(spy);
    component.form.setValue({ quantity: 2, price: 5 });

    component.add();

    expect(spy).toHaveBeenCalledWith({ quantity: 2, price: 5 });
  });

  it('does not emit added() when the form is invalid', async () => {
    await setup(null, null);
    const spy = vi.fn();
    component.added.subscribe(spy);
    component.form.setValue({ quantity: 0, price: -1 });

    component.add();

    expect(spy).not.toHaveBeenCalled();
  });

  it('emits removed() on remove()', async () => {
    await setup(3, 12.5);
    const spy = vi.fn();
    component.removed.subscribe(spy);

    component.remove();

    expect(spy).toHaveBeenCalled();
  });

  it('resets the form when switching directly to a different card without closing the panel', async () => {
    await setup(null, null);
    component.form.setValue({ quantity: 5, price: 20 });

    fixture.componentRef.setInput('printing', VEGETA);
    fixture.componentRef.setInput('initialQuantity', null);
    fixture.componentRef.setInput('initialPrice', null);
    fixture.detectChanges();

    expect(component.form.value).toEqual({ quantity: 1, price: 0 });
  });

  it('does not clobber an in-progress edit when a sibling element changes the same card\'s stored quantity', async () => {
    await setup(3, 12.5);
    component.form.setValue({ quantity: 3, price: 99 });

    // Simulate CollectionItemRow's own quantity stepper mutating draft state
    // for the same card while this panel is still open for it.
    fixture.componentRef.setInput('initialQuantity', 4);
    fixture.detectChanges();

    expect(component.form.value).toEqual({ quantity: 3, price: 99 });
  });
});
