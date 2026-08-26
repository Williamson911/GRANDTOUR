import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  CardPrinting,
  CollectionDraft,
  CollectionItem,
  CollectionSummary,
} from '../models/collection';

interface CollectionItemResponse {
  cardId: string;
  variantId: string | null;
  quantity: number;
  price: number;
  language: string | null;
  card: CardPrinting;
}

interface CollectionResponse {
  id: string;
  name: string;
  items: CollectionItemResponse[];
}

interface CollectionSummaryResponse {
  id: string;
  name: string;
  cardCount: number;
  totalPrice: number;
  thumbnailImgLink: string | null;
}

export type CollectionWriteResult = { ok: true } | { ok: false; message: string };
export type CollectionCreateResult = { ok: true; id: string } | { ok: false; message: string };

export function toCollectionItem(row: CollectionItemResponse): CollectionItem {
  return {
    quantity: row.quantity,
    price: row.price,
    language: row.language === 'FR' || row.language === 'EN' ? row.language : null,
    card: row.card,
  };
}

export function toCollectionDraft(row: CollectionResponse): CollectionDraft {
  return { id: row.id, name: row.name, items: row.items.map(toCollectionItem) };
}

export function dehydrate(draft: CollectionDraft) {
  return {
    name: draft.name,
    items: draft.items.map((item) => ({
      cardId: item.card.cardId,
      variantId: item.card.variantId,
      quantity: item.quantity,
      price: item.price,
      language: item.language,
    })),
  };
}

@Injectable({ providedIn: 'root' })
export class CollectionsService {
  private readonly http = inject(HttpClient);

  async list(): Promise<CollectionSummary[]> {
    try {
      return await firstValueFrom(
        this.http.get<CollectionSummaryResponse[]>(`${environment.apiUrl}/collections`),
      );
    } catch (error) {
      console.error('collections list failed', error);
      return [];
    }
  }

  async getById(id: string): Promise<CollectionDraft | undefined> {
    try {
      const row = await firstValueFrom(
        this.http.get<CollectionResponse>(`${environment.apiUrl}/collections/${id}`),
      );
      return toCollectionDraft(row);
    } catch (error) {
      console.error('collection load failed', error);
      return undefined;
    }
  }

  async create(draft: CollectionDraft): Promise<CollectionCreateResult> {
    try {
      const row = await firstValueFrom(
        this.http.post<CollectionResponse>(`${environment.apiUrl}/collections`, dehydrate(draft)),
      );
      return { ok: true, id: row.id };
    } catch (error) {
      return { ok: false, message: this.errorMessage(error) };
    }
  }

  async update(id: string, draft: CollectionDraft): Promise<CollectionWriteResult> {
    try {
      await firstValueFrom(
        this.http.put(`${environment.apiUrl}/collections/${id}`, dehydrate(draft)),
      );
      return { ok: true };
    } catch (error) {
      return { ok: false, message: this.errorMessage(error) };
    }
  }

  async remove(id: string): Promise<CollectionWriteResult> {
    try {
      await firstValueFrom(this.http.delete(`${environment.apiUrl}/collections/${id}`));
      return { ok: true };
    } catch (error) {
      return { ok: false, message: this.errorMessage(error) };
    }
  }

  private errorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      return String(err.error?.error ?? 'Request failed');
    }
    return 'Request failed';
  }
}
