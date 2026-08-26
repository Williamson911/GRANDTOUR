import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { CardPrinting, CollectionDraft } from '../../core/models/collection';
import { CollectionsService } from '../../core/services/collections';
import { CollectionEditor } from './collection-editor';

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

describe('CollectionEditor', () => {
  let fixture: ComponentFixture<CollectionEditor>;
  let component: CollectionEditor;
  let getById: ReturnType<typeof vi.fn>;
  let create: ReturnType<typeof vi.fn>;
  let update: ReturnType<typeof vi.fn>;
  let router: Router;

  async function setup(collectionId?: string): Promise<void> {
    getById = vi.fn().mockResolvedValue({
      id: 'col-1',
      name: 'Existing',
      items: [{ quantity: 2, price: 10, language: null, card: GOKU }],
    } satisfies CollectionDraft);
    create = vi.fn().mockResolvedValue({ ok: true, id: 'new-col-id' });
    update = vi.fn().mockResolvedValue({ ok: true });

    await TestBed.configureTestingModule({
      imports: [CollectionEditor],
      providers: [
        provideRouter([]),
        { provide: CollectionsService, useValue: { getById, create, update } },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(CollectionEditor);
    component = fixture.componentInstance;
    if (collectionId) fixture.componentRef.setInput('collectionId', collectionId);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('should create with an empty draft when there is no collectionId', async () => {
    await setup();
    expect(component.draft()).toEqual({ id: null, name: '', items: [] });
    expect(getById).not.toHaveBeenCalled();
  });

  it('hydrates the draft from getById when a collectionId is provided', async () => {
    await setup('col-1');
    expect(getById).toHaveBeenCalledWith('col-1');
    expect(component.draft().name).toBe('Existing');
    expect(component.draft().items).toHaveLength(1);
  });

  it('addOrUpdateItem adds a new printing to the draft', async () => {
    await setup();
    component.selectPrinting(GOKU);

    component.addOrUpdateItem({ quantity: 2, price: 10, language: null });

    expect(component.draft().items).toEqual([{ quantity: 2, price: 10, language: null, card: GOKU }]);
  });

  it('addOrUpdateItem stores the language when provided', async () => {
    await setup();
    component.selectPrinting(GOKU);

    component.addOrUpdateItem({ quantity: 2, price: 10, language: 'FR' });

    expect(component.draft().items).toEqual([{ quantity: 2, price: 10, language: 'FR', card: GOKU }]);
  });

  it('addOrUpdateItem replaces an existing entry for the same printing instead of duplicating it', async () => {
    await setup();
    component.selectPrinting(GOKU);
    component.addOrUpdateItem({ quantity: 2, price: 10, language: null });

    component.selectPrinting(GOKU);
    component.addOrUpdateItem({ quantity: 5, price: 8, language: 'EN' });

    expect(component.draft().items).toEqual([{ quantity: 5, price: 8, language: 'EN', card: GOKU }]);
  });

  it('removeItem removes only the matching printing', async () => {
    await setup();
    component.selectPrinting(GOKU);
    component.addOrUpdateItem({ quantity: 2, price: 10, language: null });
    component.selectPrinting(VEGETA);
    component.addOrUpdateItem({ quantity: 1, price: 3, language: null });

    component.removeItem(GOKU);

    expect(component.draft().items).toEqual([{ quantity: 1, price: 3, language: null, card: VEGETA }]);
  });

  it('changeQuantity updates only the matching printing', async () => {
    await setup();
    component.selectPrinting(GOKU);
    component.addOrUpdateItem({ quantity: 2, price: 10, language: null });

    component.changeQuantity(GOKU, 7);

    expect(component.draft().items[0].quantity).toBe(7);
  });

  it('save() calls create() when the draft has no id', async () => {
    await setup();
    component.onNameInput('New collection');

    await component.save();

    expect(create).toHaveBeenCalledWith(component.draft());
    expect(update).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/collection', 'new-col-id']);
  });

  it('save() calls update() when the draft has an id', async () => {
    await setup('col-1');

    await component.save();

    expect(update).toHaveBeenCalledWith('col-1', component.draft());
    expect(create).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/collection', 'col-1']);
  });

  it('save() sets an error and does not call create() when the name is blank', async () => {
    await setup();

    await component.save();

    expect(create).not.toHaveBeenCalled();
    expect(component.saveError()).not.toBe('');
  });

  it('backLink() points to the list when there is no collectionId', async () => {
    await setup();

    expect(component['backLink']()).toEqual(['/collection']);
  });

  it('backLink() points to the collection detail view when a collectionId is set', async () => {
    await setup('col-1');

    expect(component['backLink']()).toEqual(['/collection', 'col-1']);
  });
});
