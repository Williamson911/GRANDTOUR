import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  Component,
  effect,
  forwardRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { from, of, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

import { leaderDisplayName, LeaderOption } from '../../../core/models/card';
import { awakenedAwareImageUrl, CardsService } from '../../../core/services/cards';
import { I18nService } from '../../../core/services/i18n';

@Component({
  selector: 'app-leader-picker',
  imports: [],
  templateUrl: './leader-picker.html',
  styleUrl: './leader-picker.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => LeaderPicker),
      multi: true,
    },
  ],
})
export class LeaderPicker implements ControlValueAccessor {
  private readonly cards = inject(CardsService);
  protected readonly i18n = inject(I18nService);

  readonly mode = input.required<'linked' | 'suggestion'>();
  readonly initialCard = input<LeaderOption | undefined>(undefined);

  protected readonly query = signal('');
  protected readonly textValue = signal('');
  protected readonly linkedValue = signal<string | null>(null);
  readonly selectedOption = signal<LeaderOption | null>(null);
  readonly results = signal<LeaderOption[]>([]);
  protected readonly disabled = signal(false);
  protected readonly showAwakened = signal(true);

  private readonly querySubject = new Subject<string>();
  private onChange: (value: string | null) => void = () => {};
  private onTouched: () => void = () => {};
  // Tracks the id of the leader last known to be selected — whether that
  // selection came from the hydration effect below or from select() — so
  // the hydration effect can tell a genuine change of leader (reset the
  // toggle) apart from a re-hydration of the SAME leader under a new
  // `initialCard` object reference (do NOT reset the toggle).
  private lastHydratedId: string | null = null;

  constructor() {
    this.querySubject
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((term) =>
          term.trim().length > 0 ? from(this.cards.searchLeaders(term)) : of([]),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((options) => this.results.set(options));

    effect(() => {
      const card = this.initialCard();
      const value = this.linkedValue();
      if (this.mode() === 'linked' && card && value === card.id) {
        this.selectedOption.set(card);
        if (card.id !== this.lastHydratedId) {
          this.lastHydratedId = card.id;
          this.showAwakened.set(true);
        }
      }
    });
  }

  writeValue(value: string | null): void {
    if (this.mode() === 'linked') {
      this.linkedValue.set(value);
      if (!value) this.selectedOption.set(null);
    } else {
      this.textValue.set(value ?? '');
    }
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  onQueryInput(value: string): void {
    if (this.mode() === 'suggestion') {
      this.textValue.set(value);
      this.onChange(value);
    }
    this.query.set(value);
    this.querySubject.next(value);
  }

  select(option: LeaderOption): void {
    if (this.mode() === 'linked') {
      this.linkedValue.set(option.id);
      this.selectedOption.set(option);
      this.lastHydratedId = option.id;
      this.showAwakened.set(true);
      this.onChange(option.id);
    } else {
      const name = leaderDisplayName(option);
      this.textValue.set(name);
      this.onChange(name);
    }
    this.onTouched();
    this.query.set('');
    this.results.set([]);
  }

  change(): void {
    this.selectedOption.set(null);
    this.linkedValue.set(null);
    this.onChange(null);
  }

  protected dropdownImageUrl(opt: LeaderOption): string | null {
    return awakenedAwareImageUrl(opt);
  }

  toggleFace(): void {
    this.showAwakened.update((v) => !v);
  }

  protected chipImageUrl(opt: LeaderOption): string | null {
    return awakenedAwareImageUrl(opt, this.showAwakened());
  }

  protected displayName(option: LeaderOption): string {
    return leaderDisplayName(option, this.showAwakened());
  }

  protected dropdownDisplayName(option: LeaderOption): string {
    return leaderDisplayName(option);
  }

  protected blur(): void {
    this.onTouched();
  }
}
