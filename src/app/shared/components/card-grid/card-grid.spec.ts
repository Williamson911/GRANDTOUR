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

const TIEN_SHINHAN: CardPrinting = {
  cardId: 'card-2',
  variantId: null,
  name: 'Tien Shinhan',
  backName: 'Tien Shinhan, Return of the Mysterious Technique',
  cardType: 'LEADER',
  color: 'Green',
  cardNumber: 'BT28-056',
  series: 'BT28',
  rarity: 'Uncommon[UC]',
  imgLink: 'BT28-056',
};

const VEGETA: CardPrinting = {
  cardId: 'card-3',
  variantId: null,
  name: 'Vegeta',
  backName: null,
  cardType: 'LEADER',
  color: null,
  cardNumber: 'BT18-031',
  series: 'BT18',
  rarity: null,
  imgLink: 'BT18-031',
};

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('CardGrid', () => {
  let fixture: ComponentFixture<CardGrid>;
  let component: CardGrid;
  let searchPrintings: ReturnType<typeof vi.fn>;
  let getFacets: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    searchPrintings = vi.fn().mockResolvedValue({
      content: [GOKU],
      totalElements: 1,
      totalPages: 1,
    } satisfies PrintingsPage);
    getFacets = vi.fn().mockResolvedValue({
      colors: ['Red', 'Blue'],
      series: ['BT1', 'BT2'],
      rarities: ['Common[C]', 'Uncommon[UC]'],
    });

    await TestBed.configureTestingModule({
      imports: [CardGrid],
      providers: [{ provide: CardsService, useValue: { searchPrintings, getFacets } }],
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
      rarity: undefined,
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
      rarity: undefined,
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

  it('loads color, series, and rarity facets on init', async () => {
    await wait(400);
    expect(getFacets).toHaveBeenCalled();
    expect(component.colorOptions()).toEqual(['Red', 'Blue']);
    expect(component.seriesOptions()).toEqual(['BT1', 'BT2']);
    expect(component.rarityOptions()).toEqual(['Common[C]', 'Uncommon[UC]']);
  });

  it('renders rarity filter options with a readable label, not the raw bracketed value', async () => {
    await wait(400);
    fixture.detectChanges();

    const options = fixture.nativeElement.querySelectorAll(
      'select:nth-of-type(4) option',
    ) as NodeListOf<HTMLOptionElement>;
    const labels = Array.from(options).map((o) => o.textContent?.trim());
    expect(labels).toContain('Common (C)');
    expect(labels).toContain('Uncommon (UC)');
    expect(labels).not.toContain('Common[C]');
  });

  it('onColorChange sets the color filter, resets to page 0, and refetches', async () => {
    await wait(400);
    searchPrintings.mockClear();

    component.onColorChange('Red');
    expect(component['color']()).toBe('Red');

    await wait(400);
    expect(searchPrintings).toHaveBeenCalledWith({
      search: undefined,
      type: undefined,
      color: 'Red',
      series: undefined,
      rarity: undefined,
      page: 0,
      size: 24,
    });
  });

  it('onSeriesChange sets the series filter, resets to page 0, and refetches', async () => {
    await wait(400);
    searchPrintings.mockClear();

    component.onSeriesChange('BT1');
    expect(component['series']()).toBe('BT1');

    await wait(400);
    expect(searchPrintings).toHaveBeenCalledWith({
      search: undefined,
      type: undefined,
      color: undefined,
      series: 'BT1',
      rarity: undefined,
      page: 0,
      size: 24,
    });
  });

  it('onRarityChange sets the rarity filter, resets to page 0, and refetches', async () => {
    await wait(400);
    searchPrintings.mockClear();

    component.onRarityChange('Common[C]');
    expect(component['rarity']()).toBe('Common[C]');

    await wait(400);
    expect(searchPrintings).toHaveBeenCalledWith({
      search: undefined,
      type: undefined,
      color: undefined,
      series: undefined,
      rarity: 'Common[C]',
      page: 0,
      size: 24,
    });
  });

  it('uses the awakened-face image for a card with a back face', async () => {
    searchPrintings.mockResolvedValue({
      content: [TIEN_SHINHAN],
      totalElements: 1,
      totalPages: 1,
    } satisfies PrintingsPage);
    component.onSeriesChange('BT28');
    await wait(400);
    fixture.detectChanges();

    const img = fixture.nativeElement.querySelector('.card-grid__thumb') as HTMLImageElement;
    expect(img.src).toBe(
      'https://multi-deckplanet.us-southeast-1.linodeobjects.com/dbs_masters/BT28-056_b.webp',
    );
  });

  it('shows the awakened display name for a card with a back face', async () => {
    searchPrintings.mockResolvedValue({
      content: [TIEN_SHINHAN],
      totalElements: 1,
      totalPages: 1,
    } satisfies PrintingsPage);
    component.onSeriesChange('BT28');
    await wait(400);
    fixture.detectChanges();

    const name = fixture.nativeElement.querySelector('.card-grid__name') as HTMLElement;
    expect(name.textContent?.trim()).toBe('Tien Shinhan, Return of the Mysterious Technique');
  });

  it('uses the normal-face image for a card with no back face', async () => {
    await wait(400);
    fixture.detectChanges();

    const img = fixture.nativeElement.querySelector('.card-grid__thumb') as HTMLImageElement;
    expect(img.src).toBe(
      'https://multi-deckplanet.us-southeast-1.linodeobjects.com/dbs_masters/BT18-030.webp',
    );
  });

  describe('color and rarity badges', () => {
    it('renders a color swatch and the short rarity code for a card with both set', async () => {
      await wait(400);
      fixture.detectChanges();

      const swatch = fixture.nativeElement.querySelector(
        '.card-grid__color-swatch--sm',
      ) as HTMLElement;
      expect(swatch).not.toBeNull();
      expect(swatch.getAttribute('aria-label')).toBe('Red');

      const rarity = fixture.nativeElement.querySelector('.card-grid__rarity') as HTMLElement;
      expect(rarity.textContent?.trim()).toBe('C');
    });

    it('omits the color swatch and rarity badge for a card with neither set', async () => {
      searchPrintings.mockResolvedValue({
        content: [VEGETA],
        totalElements: 1,
        totalPages: 1,
      } satisfies PrintingsPage);
      component.onSeriesChange('BT18');
      await wait(400);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.card-grid__color-swatch--sm')).toBeNull();
      expect(fixture.nativeElement.querySelector('.card-grid__rarity')).toBeNull();
    });
  });

  describe('colorSwatch', () => {
    it('returns the hex for a known single color', () => {
      expect(component['colorSwatch']('Red')).toBe('#dc2626');
    });

    it('returns a linear-gradient with both hex colors for a dual color', () => {
      const result = component['colorSwatch']('Red/Blue');
      expect(result).toContain('linear-gradient');
      expect(result).toContain('#dc2626');
      expect(result).toContain('#2563eb');
    });

    it('returns the fallback grey for an unknown color', () => {
      expect(component['colorSwatch']('UnknownColor')).toBe('#a1a1aa');
    });
  });
});
