import { TestBed } from '@angular/core/testing';

import { Season } from './season';

describe('Season', () => {
  let service: Season;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Season);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
