import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { CardPrinting } from '../models/collection';
import { CollectionsService, dehydrate, toCollectionDraft } from './collections';

const PRINTING: CardPrinting = {
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

describe('CollectionsService', () => {
  let service: CollectionsService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    service = TestBed.inject(CollectionsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

describe('toCollectionDraft', () => {
  it('maps a backend CollectionResponse into a CollectionDraft', () => {
    const draft = toCollectionDraft({
      id: 'col-1',
      name: 'Ma collection',
      items: [
        { cardId: 'card-1', variantId: null, quantity: 3, price: 12.5, card: PRINTING },
      ],
    });

    expect(draft).toEqual({
      id: 'col-1',
      name: 'Ma collection',
      items: [{ quantity: 3, price: 12.5, card: PRINTING }],
    });
  });
});

describe('dehydrate', () => {
  it('flattens a CollectionDraft into the backend CollectionRequest shape', () => {
    const body = dehydrate({
      id: 'col-1',
      name: 'Ma collection',
      items: [{ quantity: 3, price: 12.5, card: PRINTING }],
    });

    expect(body).toEqual({
      name: 'Ma collection',
      items: [{ cardId: 'card-1', variantId: null, quantity: 3, price: 12.5 }],
    });
  });
});
