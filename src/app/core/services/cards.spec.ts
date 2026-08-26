import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import {
  awakenedAwareImageUrl,
  cardBackImageUrl,
  cardImageUrl,
  CardsService,
  colorSwatch,
  rarityCode,
  rarityLabel,
  toLeaderOption,
} from './cards';

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

  it('searchPrintings includes the rarity param when provided', async () => {
    const promise = service.searchPrintings({ rarity: 'Common[C]', page: 0, size: 24 });

    const req = httpMock.expectOne(
      (r) => r.url === 'http://localhost:8080/cards/printings' && r.params.get('rarity') === 'Common[C]',
    );
    req.flush({ content: [], totalElements: 0, totalPages: 0 });

    await promise;
  });

  it('getFacets calls GET /cards/facets and returns the distinct color/series/rarity values', async () => {
    const promise = service.getFacets();

    const req = httpMock.expectOne('http://localhost:8080/cards/facets');
    expect(req.request.method).toBe('GET');
    req.flush({ colors: ['Red', 'Blue'], series: ['BT1', 'BT2'], rarities: ['Common[C]', 'Super Rare[SR]'] });

    const result = await promise;
    expect(result).toEqual({ colors: ['Red', 'Blue'], series: ['BT1', 'BT2'], rarities: ['Common[C]', 'Super Rare[SR]'] });
  });

  it('getFacets returns an empty fallback when the request fails', async () => {
    const promise = service.getFacets();

    const req = httpMock.expectOne('http://localhost:8080/cards/facets');
    req.error(new ProgressEvent('error'), { status: 500, statusText: 'Server Error' });

    const result = await promise;
    expect(result).toEqual({ colors: [], series: [], rarities: [] });
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

describe('cardBackImageUrl', () => {
  it('builds the DeckPlanet awakened-face asset URL from an imgLink token', () => {
    expect(cardBackImageUrl('BT18-030')).toBe(
      'https://multi-deckplanet.us-southeast-1.linodeobjects.com/dbs_masters/BT18-030_b.webp',
    );
  });

  it('returns null when imgLink is null', () => {
    expect(cardBackImageUrl(null)).toBeNull();
  });
});

describe('awakenedAwareImageUrl', () => {
  it('prefers the awakened-face image when backName is set and preferAwakened is true (default)', () => {
    expect(awakenedAwareImageUrl({ backName: 'Awakened', imgLink: 'BT18-030' })).toBe(
      cardBackImageUrl('BT18-030'),
    );
  });

  it('uses the normal-face image when backName is null', () => {
    expect(awakenedAwareImageUrl({ backName: null, imgLink: 'BT18-030' })).toBe(
      cardImageUrl('BT18-030'),
    );
  });

  it('uses the normal-face image when preferAwakened is explicitly false, even with a backName', () => {
    expect(awakenedAwareImageUrl({ backName: 'Awakened', imgLink: 'BT18-030' }, false)).toBe(
      cardImageUrl('BT18-030'),
    );
  });
});

describe('colorSwatch', () => {
  it('returns the hex value for a known plain color', () => {
    expect(colorSwatch('Red')).toBe('#dc2626');
  });

  it('falls back to the default gray for an unknown color', () => {
    expect(colorSwatch('Purple')).toBe('#a1a1aa');
  });

  it('returns a diagonal gradient containing both hex values for a dual color', () => {
    const result = colorSwatch('Red/Blue');
    expect(result).toContain('linear-gradient');
    expect(result).toContain('#dc2626');
    expect(result).toContain('#2563eb');
  });
});

describe('rarityCode', () => {
  it('extracts the bracketed short code from a full rarity string', () => {
    expect(rarityCode('Super Rare[SR]')).toBe('SR');
  });

  it('extracts a single-letter code', () => {
    expect(rarityCode('Common[C]')).toBe('C');
  });

  it('returns the input unchanged when there is no bracketed code', () => {
    expect(rarityCode('Unranked')).toBe('Unranked');
  });
});

describe('rarityLabel', () => {
  it('reformats the bracketed code into a parenthesized suffix', () => {
    expect(rarityLabel('Super Rare[SR]')).toBe('Super Rare (SR)');
  });

  it('reformats a single-letter code', () => {
    expect(rarityLabel('Common[C]')).toBe('Common (C)');
  });

  it('returns the input unchanged when there is no bracketed code', () => {
    expect(rarityLabel('Unranked')).toBe('Unranked');
  });
});
