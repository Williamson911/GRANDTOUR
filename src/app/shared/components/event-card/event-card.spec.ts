import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Event } from '../../../core/models/event';
import { EventCard } from './event-card';

const sampleEvent: Event = {
  id: 'sample',
  name: 'Sample Regional',
  type: 'Regional',
  date: new Date('2026-01-18'),
  location: {
    city: 'Paris',
    country: 'France',
    venue: 'Espace Champerret',
    lat: 48.8866,
    lng: 2.2914,
  },
  registered: false,
};

describe('EventCard', () => {
  let component: EventCard;
  let fixture: ComponentFixture<EventCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventCard],
    }).compileComponents();

    fixture = TestBed.createComponent(EventCard);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('event', sampleEvent);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
