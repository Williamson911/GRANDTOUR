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

  describe('linked mode — awakened-face toggle', () => {
    it('defaults to the awakened-face image for a leader with a back face', async () => {
      await setup('linked');
      component.select(GOKU);
      fixture.detectChanges();

      const img = fixture.nativeElement.querySelector('.leader-picker__thumb') as HTMLImageElement;
      expect(img.src).toBe(
        'https://multi-deckplanet.us-southeast-1.linodeobjects.com/dbs_masters/BT18-030_b.webp',
      );
    });

    it('does not render a toggle button for a leader with no back face', async () => {
      await setup('linked');
      component.select(VEGETA);
      fixture.detectChanges();

      const toggle = fixture.nativeElement.querySelector('.leader-picker__toggle-face');
      expect(toggle).toBeNull();
    });

    it('toggles the image and resets on re-select of a different leader', async () => {
      await setup('linked');
      component.select(GOKU);
      fixture.detectChanges();

      const toggle = fixture.nativeElement.querySelector(
        '.leader-picker__toggle-face',
      ) as HTMLButtonElement;
      toggle.click();
      fixture.detectChanges();

      let img = fixture.nativeElement.querySelector('.leader-picker__thumb') as HTMLImageElement;
      expect(img.src).toBe(
        'https://multi-deckplanet.us-southeast-1.linodeobjects.com/dbs_masters/BT18-030.webp',
      );

      component.change();
      component.select(GOKU);
      fixture.detectChanges();

      img = fixture.nativeElement.querySelector('.leader-picker__thumb') as HTMLImageElement;
      expect(img.src).toBe(
        'https://multi-deckplanet.us-southeast-1.linodeobjects.com/dbs_masters/BT18-030_b.webp',
      );
    });

    it('does not spuriously reset the toggle when initialCard is re-hydrated with the same id under a new object reference', async () => {
      await setup('linked');
      component.select(GOKU);
      fixture.detectChanges();

      const toggle = fixture.nativeElement.querySelector(
        '.leader-picker__toggle-face',
      ) as HTMLButtonElement;
      toggle.click();
      fixture.detectChanges();

      let img = fixture.nativeElement.querySelector('.leader-picker__thumb') as HTMLImageElement;
      expect(img.src).toBe(
        'https://multi-deckplanet.us-southeast-1.linodeobjects.com/dbs_masters/BT18-030.webp',
      );

      // Simulate a parent computed() rebuilding a brand-new object for the
      // same leader (same id, new reference) — e.g. after an unrelated save.
      fixture.componentRef.setInput('initialCard', { ...GOKU });
      component.writeValue(GOKU.id);
      fixture.detectChanges();

      img = fixture.nativeElement.querySelector('.leader-picker__thumb') as HTMLImageElement;
      expect(img.src).toBe(
        'https://multi-deckplanet.us-southeast-1.linodeobjects.com/dbs_masters/BT18-030.webp',
      );
    });
  });
});
