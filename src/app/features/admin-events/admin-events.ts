import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { Event } from '../../core/models/event';
import { EventInput, EventService } from '../../core/services/event';
import { I18nService } from '../../core/services/i18n';

@Component({
  selector: 'app-admin-events',
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './admin-events.html',
  styleUrl: './admin-events.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminEvents {
  private readonly fb = inject(FormBuilder);
  private readonly eventService = inject(EventService);
  protected readonly i18n = inject(I18nService);

  protected readonly lang = this.i18n.lang;
  protected readonly events = this.eventService.events;
  protected readonly formOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly formError = signal('');
  protected readonly listError = signal('');

  protected readonly form: FormGroup = this.fb.group({
    name: ['', [Validators.required]],
    type: ['Regional', [Validators.required]],
    date: ['', [Validators.required]],
    city: ['', [Validators.required]],
    country: ['', [Validators.required]],
    venue: ['', [Validators.required]],
    lat: [null, [Validators.required]],
    lng: [null, [Validators.required]],
    registerLink: [''],
  });

  constructor() {
    void this.eventService.load();
  }

  protected openCreate(): void {
    this.editingId.set(null);
    this.form.reset({ type: 'Regional' });
    this.formError.set('');
    this.formOpen.set(true);
  }

  protected openEdit(event: Event): void {
    this.editingId.set(event.id);
    this.form.reset({
      name: event.name,
      type: event.type,
      date: event.date.toISOString().slice(0, 10),
      city: event.location.city,
      country: event.location.country,
      venue: event.location.venue,
      lat: event.location.lat,
      lng: event.location.lng,
      registerLink: event.registerLink ?? '',
    });
    this.formError.set('');
    this.formOpen.set(true);
  }

  protected cancelForm(): void {
    if (this.busy()) return;
    this.formOpen.set(false);
  }

  protected async submit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.busy()) return;

    const input: EventInput = {
      name: this.form.value.name,
      type: this.form.value.type,
      date: new Date(this.form.value.date),
      city: this.form.value.city,
      country: this.form.value.country,
      venue: this.form.value.venue,
      lat: Number(this.form.value.lat),
      lng: Number(this.form.value.lng),
      registerLink: this.form.value.registerLink || undefined,
    };

    this.busy.set(true);
    this.formError.set('');
    const id = this.editingId();
    const result = id
      ? await this.eventService.updateEvent(id, input)
      : await this.eventService.createEvent(input);
    this.busy.set(false);

    if (!result.ok) {
      this.formError.set(this.i18n.t('admin.errors.generic'));
      return;
    }
    this.formOpen.set(false);
  }

  protected async remove(event: Event): Promise<void> {
    if (this.busy()) return;
    if (!confirm(this.i18n.t('admin.deleteConfirm'))) return;
    this.busy.set(true);
    this.listError.set('');
    const result = await this.eventService.deleteEvent(event.id);
    this.busy.set(false);
    if (!result.ok) {
      this.listError.set(this.i18n.t('admin.errors.generic'));
    }
  }
}
