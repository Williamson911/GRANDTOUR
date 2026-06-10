import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { EventService } from './event';

describe('EventService', () => {
  let service: EventService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()],
    });
    service = TestBed.inject(EventService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('starts with an empty event list', () => {
    expect(service.events()).toEqual([]);
  });
});
