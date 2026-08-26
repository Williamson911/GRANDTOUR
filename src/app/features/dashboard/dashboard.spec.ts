import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { LeaderOption } from '../../core/models/card';
import { Dashboard } from './dashboard';

const GOKU: LeaderOption = {
  id: 'l1',
  name: 'Son Goku',
  backName: 'God Son Goku',
  cardNumber: 'BT18-030',
  cardType: 'LEADER',
  imgLink: 'BT18-030',
  cardRarity: null,
};

describe('Dashboard', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders the dashboard title', () => {
    fixture.detectChanges();
    const html = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(html).toContain('Dashboard');
  });

  it('leaderImageUrl uses the awakened-face artwork for a leader with a back face', () => {
    expect(component['leaderImageUrl'](GOKU)).toBe(
      'https://multi-deckplanet.us-southeast-1.linodeobjects.com/dbs_masters/BT18-030_b.webp',
    );
  });

  it('leaderName uses the awakened-face name for a leader with a back face', () => {
    expect(component['leaderName'](GOKU)).toBe('God Son Goku');
  });
});
