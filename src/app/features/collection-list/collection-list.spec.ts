import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { CollectionSummary } from '../../core/models/collection';
import { CollectionsService } from '../../core/services/collections';
import { CollectionList } from './collection-list';

describe('CollectionList', () => {
  let fixture: ComponentFixture<CollectionList>;
  let component: CollectionList;
  let list: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    list = vi.fn().mockResolvedValue([
      { id: 'col-1', name: 'Ma collection', cardCount: 12, totalPrice: 84.5 },
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
      { id: 'col-1', name: 'Ma collection', cardCount: 12, totalPrice: 84.5 },
    ]);
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
