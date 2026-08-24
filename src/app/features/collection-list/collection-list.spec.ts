import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { CollectionSummary } from '../../core/models/collection';
import { cardImageUrl } from '../../core/services/cards';
import { CollectionsService } from '../../core/services/collections';
import { CollectionList } from './collection-list';

describe('CollectionList', () => {
  let fixture: ComponentFixture<CollectionList>;
  let component: CollectionList;
  let list: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    list = vi.fn().mockResolvedValue([
      { id: 'col-1', name: 'Ma collection', cardCount: 12, totalPrice: 84.5, thumbnailImgLink: null },
    ] satisfies CollectionSummary[]);

    await TestBed.configureTestingModule({
      imports: [CollectionList],
      providers: [provideRouter([]), { provide: CollectionsService, useValue: { list } }],
    }).compileComponents();

    fixture = TestBed.createComponent(CollectionList);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads collections on init', () => {
    expect(list).toHaveBeenCalled();
    expect(component.items()).toEqual([
      { id: 'col-1', name: 'Ma collection', cardCount: 12, totalPrice: 84.5, thumbnailImgLink: null },
    ]);
  });

  it('does not render a thumbnail image when thumbnailImgLink is null', () => {
    const img = (fixture.nativeElement as HTMLElement).querySelector('.collection-tile__thumb');
    expect(img).toBeNull();
  });

  it('renders a thumbnail image built via cardImageUrl when thumbnailImgLink is set', async () => {
    const listWithThumb = vi.fn().mockResolvedValue([
      {
        id: 'col-2',
        name: 'Autre collection',
        cardCount: 3,
        totalPrice: 20,
        thumbnailImgLink: 'BT18-030',
      },
    ] satisfies CollectionSummary[]);
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [CollectionList],
      providers: [provideRouter([]), { provide: CollectionsService, useValue: { list: listWithThumb } }],
    }).compileComponents();

    const thumbFixture = TestBed.createComponent(CollectionList);
    thumbFixture.detectChanges();
    await thumbFixture.whenStable();
    thumbFixture.detectChanges();

    const img = (thumbFixture.nativeElement as HTMLElement).querySelector<HTMLImageElement>(
      '.collection-tile__thumb',
    );
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe(cardImageUrl('BT18-030'));
  });

  it('shows the empty-state message when there are no collections', async () => {
    const emptyList = vi.fn().mockResolvedValue([] satisfies CollectionSummary[]);
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [CollectionList],
      providers: [provideRouter([]), { provide: CollectionsService, useValue: { list: emptyList } }],
    }).compileComponents();

    const emptyFixture = TestBed.createComponent(CollectionList);
    emptyFixture.detectChanges();
    await emptyFixture.whenStable();
    emptyFixture.detectChanges();

    expect(emptyFixture.componentInstance.items()).toEqual([]);
    expect((emptyFixture.nativeElement as HTMLElement).textContent).toContain('No collections yet.');
  });
});
