import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { CardPrinting } from '../../../core/models/collection';
import { CollectionItemRow } from './collection-item-row';

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

describe('CollectionItemRow', () => {
  let fixture: ComponentFixture<CollectionItemRow>;
  let component: CollectionItemRow;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CollectionItemRow] }).compileComponents();
    fixture = TestBed.createComponent(CollectionItemRow);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('card', GOKU);
    fixture.componentRef.setInput('quantity', 3);
    fixture.componentRef.setInput('price', 12.5);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('computes line total as quantity times price', () => {
    expect(component.lineTotal()).toBeCloseTo(37.5);
  });

  it('emits an incremented quantity on increment()', () => {
    const spy = vi.fn();
    component.quantityChanged.subscribe(spy);

    component.increment();

    expect(spy).toHaveBeenCalledWith(4);
  });

  it('emits a decremented quantity on decrement(), but never below 1', () => {
    const spy = vi.fn();
    component.quantityChanged.subscribe(spy);

    component.decrement();
    expect(spy).toHaveBeenCalledWith(2);

    fixture.componentRef.setInput('quantity', 1);
    fixture.detectChanges();
    spy.mockClear();
    component.decrement();
    expect(spy).not.toHaveBeenCalled();
  });

  it('emits removed on remove()', () => {
    const spy = vi.fn();
    component.removed.subscribe(spy);

    component.remove(new Event('click'));

    expect(spy).toHaveBeenCalled();
  });
});
