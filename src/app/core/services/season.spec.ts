import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { SeasonService } from './season';

describe('SeasonService', () => {
  let service: SeasonService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    service = TestBed.inject(SeasonService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
