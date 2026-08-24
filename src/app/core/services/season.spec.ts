import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { CardResponse } from './cards';
import { SeasonService } from './season';

const TOKEN_KEY = 'gt_token';
const USER_ID = 'user-1';
const EVENT_ID = 'event-1';

function makeToken(userId: string): string {
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({
      sub: 'tester',
      id: userId,
      email: 'tester@example.com',
      roles: [],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  );
  return `${header}.${payload}.signature`;
}

const LEADER: CardResponse = {
  id: 'leader-1',
  cardNumber: 'BT18-030',
  name: 'Son Goku',
  cardType: 'LEADER',
  imgLink: 'BT18-030',
  backName: null,
  rarity: 'Common[C]',
};

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

describe('SeasonService (authenticated)', () => {
  let service: SeasonService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.setItem(TOKEN_KEY, makeToken(USER_ID));
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SeasonService);
    httpMock = TestBed.inject(HttpTestingController);
    TestBed.tick();

    // AuthService's constructor effect fires a GET to /me for the current user.
    httpMock.expectOne(`${environment.apiUrl}/me`).flush({
      id: USER_ID,
      username: 'tester',
      email: 'tester@example.com',
      bandaiTcgId: null,
      createdAt: new Date().toISOString(),
    });

    // SeasonService's constructor effect fires a GET to /results/me on login.
    httpMock.expectOne(`${environment.apiUrl}/results/me`).flush([
      {
        id: 'result-1',
        userId: USER_ID,
        eventId: EVENT_ID,
        deckName: 'Red Aggro',
        leaderCard: LEADER,
        placement: 3,
        totalPlayers: 16,
        prizes: 2,
        notes: null,
        matches: [
          {
            round: 1,
            opponentLeader: 'Old Leader',
            opponentName: 'Old Opponent',
            result: 'Win',
            notes: 'close game',
          },
          {
            round: 2,
            opponentLeader: 'Untouched Leader',
            result: 'Draw',
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);
  });

  afterEach(() => {
    localStorage.removeItem(TOKEN_KEY);
    httpMock.verify();
  });

  it('replaces the matching round in place instead of appending', async () => {
    const updatePromise = service.updateMatch(EVENT_ID, 1, {
      opponentLeader: 'New Leader',
      result: 'Loss',
    });

    const putReq = httpMock.expectOne(`${environment.apiUrl}/results/${EVENT_ID}`);
    expect(putReq.request.method).toBe('PUT');
    expect(putReq.request.body.matches).toEqual([
      {
        round: 1,
        opponentLeader: 'New Leader',
        result: 'Loss',
      },
      {
        round: 2,
        opponentLeader: 'Untouched Leader',
        result: 'Draw',
      },
    ]);
    putReq.flush({
      id: 'result-1',
      userId: USER_ID,
      eventId: EVENT_ID,
      deckName: 'Red Aggro',
      leaderCard: LEADER,
      placement: 3,
      totalPlayers: 16,
      prizes: 2,
      notes: null,
      matches: putReq.request.body.matches,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Let the PUT's promise chain resume (firstValueFrom resolution + the
    // await before reload()) so the follow-up reload request is issued.
    await Promise.resolve();

    // updateMatch reloads results afterwards.
    httpMock.expectOne(`${environment.apiUrl}/results/me`).flush([]);

    await updatePromise;
  });
});
