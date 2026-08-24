import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { LeaderOption } from '../../../core/models/card';
import { CardsService } from '../../../core/services/cards';
import { LeaderPicker } from './leader-picker';

const GOKU: LeaderOption = {
  id: 'card-goku',
  name: 'Son Goku',
  backName: 'God Son Goku',
  cardNumber: 'BT18-030',
  cardType: 'LEADER',
  imgLink: 'BT18-030',
  cardRarity: 'Common[C]',
};
const VEGETA: LeaderOption = {
  id: 'card-vegeta',
  name: 'Vegeta',
  backName: null,
  cardNumber: 'BT18-031',
  cardType: 'LEADER',
  imgLink: null,
  cardRarity: null,
};

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('LeaderPicker', () => {
  let fixture: ComponentFixture<LeaderPicker>;
  let component: LeaderPicker;
  let searchLeaders: ReturnType<typeof vi.fn>;

  async function setup(mode: 'linked' | 'suggestion'): Promise<void> {
    searchLeaders = vi.fn().mockResolvedValue([GOKU, VEGETA]);

    await TestBed.configureTestingModule({
      imports: [LeaderPicker],
      providers: [
        provideHttpClient(),
        { provide: CardsService, useValue: { searchLeaders } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LeaderPicker);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('mode', mode);
    fixture.detectChanges();
  }

  it('should create', async () => {
    await setup('suggestion');
    expect(component).toBeTruthy();
  });

  describe('suggestion mode', () => {
    it('emits free text immediately and lists debounced search results', async () => {
      await setup('suggestion');
      const onChange = vi.fn();
      component.registerOnChange(onChange);

      component.onQueryInput('gok');
      expect(onChange).toHaveBeenCalledWith('gok');
      expect(searchLeaders).not.toHaveBeenCalled();

      await wait(400);
      expect(searchLeaders).toHaveBeenCalledWith('gok');
      expect(component.results()).toEqual([GOKU, VEGETA]);
    });

    it('fills free text (not an id) when a suggestion is picked', async () => {
      await setup('suggestion');
      const onChange = vi.fn();
      component.registerOnChange(onChange);

      component.select(GOKU);

      expect(onChange).toHaveBeenCalledWith('Son Goku / God Son Goku');
    });
  });

  describe('linked mode', () => {
    it('renders the initial chip from initialCard without calling the search service', async () => {
      await setup('linked');
      fixture.componentRef.setInput('initialCard', GOKU);
      component.writeValue(GOKU.id);
      fixture.detectChanges();

      expect(component.selectedOption()).toEqual(GOKU);
      expect(searchLeaders).not.toHaveBeenCalled();
    });

    it('emits the selected card id when a search result is picked', async () => {
      await setup('linked');
      const onChange = vi.fn();
      component.registerOnChange(onChange);

      component.select(VEGETA);

      expect(onChange).toHaveBeenCalledWith(VEGETA.id);
      expect(component.selectedOption()).toEqual(VEGETA);
    });

    it('clears the selection and emits null on change()', async () => {
      await setup('linked');
      const onChange = vi.fn();
      component.registerOnChange(onChange);
      component.select(GOKU);

      component.change();

      expect(onChange).toHaveBeenCalledWith(null);
      expect(component.selectedOption()).toBeNull();
    });
  });
});
