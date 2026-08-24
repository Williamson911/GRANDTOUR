import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { CardPrinting } from '../../../core/models/collection';
import { CardsService, PrintingsPage } from '../../../core/services/cards';
import { CardGrid } from './card-grid';

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

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('CardGrid', () => {
  let fixture: ComponentFixture<CardGrid>;
  let component: CardGrid;
  let searchPrintings: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    searchPrintings = vi.fn().mockResolvedValue({
      content: [GOKU],
      totalElements: 1,
      totalPages: 1,
    } satisfies PrintingsPage);

    await TestBed.configureTestingModule({
      imports: [CardGrid],
      providers: [{ provide: CardsService, useValue: { searchPrintings } }],
    }).compileComponents();

    fixture = TestBed.createComponent(CardGrid);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads the first page of printings on init', async () => {
    await wait(400);
    expect(searchPrintings).toHaveBeenCalledWith({
      search: undefined,
      type: undefined,
      color: undefined,
      series: undefined,
      page: 0,
      size: 24,
    });
    expect(component.results()).toEqual([GOKU]);
    expect(component.totalPages()).toBe(1);
  });

  it('debounces search text and resets to page 0', async () => {
    await wait(400);
    searchPrintings.mockClear();

    component.onSearchInput('goku');
    expect(searchPrintings).not.toHaveBeenCalled();

    await wait(400);
    expect(searchPrintings).toHaveBeenCalledWith({
      search: 'goku',
      type: undefined,
      color: undefined,
      series: undefined,
      page: 0,
      size: 24,
    });
  });

  it('emits printingSelected when a result is clicked', async () => {
    await wait(400);
    const spy = vi.fn();
    component.printingSelected.subscribe(spy);

    component.select(GOKU);

    expect(spy).toHaveBeenCalledWith(GOKU);
  });
});
