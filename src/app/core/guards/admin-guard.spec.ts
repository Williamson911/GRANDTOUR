import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';

import { AuthService } from '../services/auth';
import { adminGuard } from './admin-guard';

describe('adminGuard', () => {
  let router: Router;

  function configure(isAdmin: boolean): void {
    router = {
      navigate: vi.fn(),
    } as unknown as Router;
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: AuthService, useValue: { isAdmin: signal(isAdmin) } },
      ],
    });
  }

  it('allows activation when the current user is admin', () => {
    configure(true);
    const result = TestBed.runInInjectionContext(() =>
      adminGuard({} as never, {} as never),
    );
    expect(result).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('redirects to /map when the current user is not admin', () => {
    configure(false);
    const result = TestBed.runInInjectionContext(() =>
      adminGuard({} as never, {} as never),
    );
    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/map']);
  });
});
