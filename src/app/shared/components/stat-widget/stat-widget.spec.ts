import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatWidget } from './stat-widget';

describe('StatWidget', () => {
  let component: StatWidget;
  let fixture: ComponentFixture<StatWidget>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatWidget],
    }).compileComponents();

    fixture = TestBed.createComponent(StatWidget);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
