import { leaderDisplayName } from './card';

describe('leaderDisplayName', () => {
  it('joins front and back names with " / " when the card has an awakened back face', () => {
    expect(
      leaderDisplayName({
        id: 'l-1',
        name: 'AEOS',
        backName: 'AEOS, POUVOIR DES PREDECESSEURS',
        cardNumber: 'BT1-001',
        cardType: 'LEADER',
        cardRarity: 'c',
        imgLink: null,
      }),
    ).toBe('AEOS / AEOS, POUVOIR DES PREDECESSEURS');
  });

  it('returns just the front name when there is no back face', () => {
    expect(
      leaderDisplayName({
        id: 'l-2',
        name: 'Vegeta',
        backName: null,
        cardNumber: 'BT1-002',
        cardType: 'LEADER',
        cardRarity: 'c',
        imgLink: null,
      }),
    ).toBe('Vegeta');
  });
});
