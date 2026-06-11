import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServerDown } from './server-down';

describe('ServerDown', () => {
  let component: ServerDown;
  let fixture: ComponentFixture<ServerDown>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServerDown],
      providers: [provideHttpClient()],
    }).compileComponents();

    fixture = TestBed.createComponent(ServerDown);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders the "npm run db" hint', () => {
    fixture.detectChanges();
    const html = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(html).toContain('npm run db');
  });
});
