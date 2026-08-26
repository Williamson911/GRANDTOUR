import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { CardPrinting, CollectionDraft } from '../../core/models/collection';
import { CollectionsService } from '../../core/services/collections';
import { CollectionDetail } from './collection-detail';

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

describe('CollectionDetail', () => {
  let fixture: ComponentFixture<CollectionDetail>;
  let component: CollectionDetail;
  let getById: ReturnType<typeof vi.fn>;
  let remove: ReturnType<typeof vi.fn>;
  let router: Router;

  async function setup(
    collectionId = 'col-1',
    options?: { getByIdResult?: CollectionDraft; notFound?: boolean; deferGetById?: boolean },
  ): Promise<{ resolveGetById: (value: CollectionDraft | undefined) => void }> {
    let resolveGetById: (value: CollectionDraft | undefined) => void = () => {};
    if (options?.deferGetById) {
      getById = vi.fn().mockReturnValue(
        new Promise<CollectionDraft | undefined>((resolve) => {
          resolveGetById = resolve;
        }),
      );
    } else if (options?.notFound) {
      getById = vi.fn().mockResolvedValue(undefined);
    } else {
      const result =
        options?.getByIdResult ??
        ({
          id: 'col-1',
          name: 'Existing',
          items: [{ quantity: 2, price: 10, language: null, card: GOKU }],
        } satisfies CollectionDraft);
      getById = vi.fn().mockResolvedValue(result);
    }
    remove = vi.fn().mockResolvedValue({ ok: true });

    await TestBed.configureTestingModule({
      imports: [CollectionDetail],
      providers: [
        provideRouter([]),
        { provide: CollectionsService, useValue: { getById, remove } },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(CollectionDetail);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('collectionId', collectionId);
    fixture.detectChanges();
    if (!options?.deferGetById) {
      await fixture.whenStable();
      fixture.detectChanges();
    }

    return { resolveGetById };
  }

  it('shows the loading state while getById is pending', async () => {
    await setup('col-1', { deferGetById: true });

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Loading');
  });

  it('renders the collection name and card list once getById resolves', async () => {
    await setup('col-1', {
      getByIdResult: {
        id: 'col-1',
        name: 'My DBS Deck',
        items: [
          { quantity: 3, price: 2.5, language: 'FR', card: GOKU },
          { quantity: 1, price: 4, language: null, card: VEGETA },
        ],
      },
    });

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('My DBS Deck');
    expect(text).toContain('Son Goku');
    expect(text).toContain('Vegeta');
    expect(text).toContain('× 3');
    expect(text).toContain('× 1');
  });

  it('shows the empty-state message when the collection has zero items', async () => {
    await setup('col-1', {
      getByIdResult: { id: 'col-1', name: 'Empty one', items: [] },
    });

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('This collection has no cards yet.');
  });

  it('shows the not-found message when getById resolves undefined', async () => {
    await setup('missing-id', { notFound: true });

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Collection not found.');
  });

  it('renders the short rarity code (not the full rarity string) when rarity is set', async () => {
    await setup('col-1', {
      getByIdResult: {
        id: 'col-1',
        name: 'My DBS Deck',
        items: [{ quantity: 1, price: 2.5, language: null, card: GOKU }],
      },
    });

    const rarityEl: HTMLElement = fixture.nativeElement.querySelector('.detail__rarity');
    expect(rarityEl).toBeTruthy();
    expect(rarityEl.textContent?.trim()).toBe('C');
  });

  it('does not render .detail__rarity when the card has no rarity', async () => {
    await setup('col-1', {
      getByIdResult: {
        id: 'col-1',
        name: 'My DBS Deck',
        items: [{ quantity: 1, price: 2.5, language: null, card: { ...GOKU, rarity: null } }],
      },
    });

    const rarityEl: HTMLElement = fixture.nativeElement.querySelector('.detail__rarity');
    expect(rarityEl).toBeNull();
  });

  it('renders a color swatch when the card has a color', async () => {
    await setup('col-1', {
      getByIdResult: {
        id: 'col-1',
        name: 'My DBS Deck',
        items: [{ quantity: 1, price: 2.5, language: null, card: GOKU }],
      },
    });

    const swatchEl: HTMLElement = fixture.nativeElement.querySelector('.detail__color-swatch');
    expect(swatchEl).toBeTruthy();
    expect(swatchEl.getAttribute('aria-label')).toBe('Red');
  });

  it('does not render .detail__color-swatch when the card has no color', async () => {
    await setup('col-1', {
      getByIdResult: {
        id: 'col-1',
        name: 'My DBS Deck',
        items: [{ quantity: 1, price: 2.5, language: null, card: { ...GOKU, color: null } }],
      },
    });

    const swatchEl: HTMLElement = fixture.nativeElement.querySelector('.detail__color-swatch');
    expect(swatchEl).toBeNull();
  });

  it('the edit link routes to /collection/:id/edit', async () => {
    await setup('col-1');

    const editLink: HTMLAnchorElement = fixture.nativeElement.querySelector(
      'a.btn--accent',
    );
    expect(editLink).toBeTruthy();
    expect(editLink.getAttribute('href')).toBe('/collection/col-1/edit');
  });

  it('does not call remove() when the user cancels the delete confirmation', async () => {
    await setup('col-1');
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    const deleteButton = fixture.nativeElement.querySelector(
      '.detail__delete',
    ) as HTMLButtonElement;
    deleteButton.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(remove).not.toHaveBeenCalled();
  });

  it('calls remove() with the collection id and navigates to /collection on confirm', async () => {
    await setup('col-1');
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const deleteButton = fixture.nativeElement.querySelector(
      '.detail__delete',
    ) as HTMLButtonElement;
    deleteButton.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(remove).toHaveBeenCalledWith('col-1');
    expect(router.navigate).toHaveBeenCalledWith(['/collection']);
  });

  it('ignores a stale getById response when collectionId changes before it resolves', async () => {
    const deferred = await setup('col-1', { deferGetById: true });

    fixture.componentRef.setInput('collectionId', 'col-2');
    getById.mockResolvedValueOnce({ id: 'col-2', name: 'Second', items: [] });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    // The stale first request resolves after the second one already completed.
    deferred.resolveGetById({ id: 'col-1', name: 'Stale', items: [] });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component['draft']()?.name).toBe('Second');
  });
});
