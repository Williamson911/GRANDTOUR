import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MySeason } from './my-season';

describe('MySeason', () => {
  let component: MySeason;
  let fixture: ComponentFixture<MySeason>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MySeason],
    }).compileComponents();

    fixture = TestBed.createComponent(MySeason);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
