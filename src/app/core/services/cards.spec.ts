import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { cardImageUrl, CardsService, toLeaderOption } from './cards';

describe('CardsService', () => {
  let service: CardsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CardsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('searchPrintings calls GET /cards/printings with the given filters', async () => {
    const promise = service.searchPrintings({ search: 'goku', type: 'LEADER', page: 0, size: 24 });

    const req = httpMock.expectOne(
      (r) =>
        r.url === 'http://localhost:8080/cards/printings' &&
        r.params.get('search') === 'goku' &&
        r.params.get('type') === 'LEADER' &&
        r.params.get('page') === '0' &&
        r.params.get('size') === '24',
    );
    req.flush({ content: [], totalElements: 0, totalPages: 0 });

    const result = await promise;
    expect(result).toEqual({ content: [], totalElements: 0, totalPages: 0 });
  });
});

describe('toLeaderOption', () => {
  it('maps a backend CardResponse row into a LeaderOption', () => {
    const option = toLeaderOption({
      id: 'card-1',
      cardNumber: 'BT18-030',
      name: 'Son Goku',
      cardType: 'LEADER',
      imgLink: 'BT18-030',
      backName: 'God Son Goku',
      rarity: 'Common[C]',
    });

    expect(option).toEqual({
      id: 'card-1',
      name: 'Son Goku',
      backName: 'God Son Goku',
      cardNumber: 'BT18-030',
      cardType: 'LEADER',
      imgLink: 'BT18-030',
      cardRarity: 'Common[C]',
    });
  });

  it('maps null imgLink, backName and rarity through as null', () => {
    const option = toLeaderOption({
      id: 'card-2',
      cardNumber: 'BT18-031',
      name: 'Vegeta',
      cardType: 'LEADER',
      imgLink: null,
      backName: null,
      rarity: null,
    });
    expect(option.imgLink).toBeNull();
    expect(option.backName).toBeNull();
    expect(option.cardRarity).toBeNull();
  });
});

describe('cardImageUrl', () => {
  it('builds the DeckPlanet asset URL from an imgLink token', () => {
    expect(cardImageUrl('BT18-030')).toBe(
      'https://multi-deckplanet.us-southeast-1.linodeobjects.com/dbs_masters/BT18-030.webp',
    );
  });

  it('returns null when imgLink is null', () => {
    expect(cardImageUrl(null)).toBeNull();
  });
});
