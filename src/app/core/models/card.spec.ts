import { leaderDisplayName } from './card';

describe('leaderDisplayName', () => {
  it('returns the awakened (back) name by default when the card has an awakened back face', () => {
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
    ).toBe('AEOS, POUVOIR DES PREDECESSEURS');
  });

  it('returns the front name when preferAwakened is explicitly false, even with a back face', () => {
    expect(
      leaderDisplayName(
        {
          id: 'l-1',
          name: 'AEOS',
          backName: 'AEOS, POUVOIR DES PREDECESSEURS',
          cardNumber: 'BT1-001',
          cardType: 'LEADER',
          cardRarity: 'c',
          imgLink: null,
        },
        false,
      ),
    ).toBe('AEOS');
  });

  it('returns just the front name when there is no back face, regardless of preferAwakened', () => {
    const vegeta = {
      id: 'l-2',
      name: 'Vegeta',
      backName: null,
      cardNumber: 'BT1-002',
      cardType: 'LEADER',
      cardRarity: 'c',
      imgLink: null,
    };
    expect(leaderDisplayName(vegeta)).toBe('Vegeta');
    expect(leaderDisplayName(vegeta, false)).toBe('Vegeta');
  });
});
