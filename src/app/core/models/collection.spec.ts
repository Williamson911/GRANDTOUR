import { CardPrinting, printingDisplayName, printingKey } from './collection';

const BASE_PRINTING: CardPrinting = {
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

describe('printingKey', () => {
  it('uses "base" for the base printing (no variant)', () => {
    expect(printingKey(BASE_PRINTING)).toBe('card-1:base');
  });

  it('uses the variant id when the printing is a variant', () => {
    expect(printingKey({ ...BASE_PRINTING, variantId: 'variant-1' })).toBe('card-1:variant-1');
  });
});

describe('printingDisplayName', () => {
  it('joins front and back names with " / " when there is an awakened back face', () => {
    expect(printingDisplayName({ ...BASE_PRINTING, backName: 'God Son Goku' })).toBe(
      'Son Goku / God Son Goku',
    );
  });

  it('returns just the front name when there is no back face', () => {
    expect(printingDisplayName(BASE_PRINTING)).toBe('Son Goku');
  });
});
