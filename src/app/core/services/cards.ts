import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { LeaderOption } from '../models/card';
import { CardPrinting } from '../models/collection';

const DO_ASSETS = 'https://multi-deckplanet.us-southeast-1.linodeobjects.com';

export interface CardResponse {
  id: string;
  cardNumber: string;
  name: string;
  cardType: string;
  imgLink: string | null;
  backName: string | null;
  rarity: string | null;
}

interface CardPage {
  content: CardResponse[];
}

export interface PrintingsPage {
  content: CardPrinting[];
  totalElements: number;
  totalPages: number;
}

export interface SearchPrintingsParams {
  search?: string;
  type?: string;
  color?: string;
  series?: string;
  page: number;
  size: number;
}

export function toLeaderOption(row: CardResponse): LeaderOption {
  return {
    id: row.id,
    name: row.name,
    backName: row.backName,
    cardNumber: row.cardNumber,
    cardType: row.cardType,
    imgLink: row.imgLink,
    cardRarity: row.rarity,
  };
}

export function cardImageUrl(imgLink: string | null): string | null {
  return imgLink ? `${DO_ASSETS}/dbs_masters/${imgLink}.webp` : null;
}

@Injectable({ providedIn: 'root' })
export class CardsService {
  private readonly http = inject(HttpClient);

  async searchLeaders(query: string): Promise<LeaderOption[]> {
    try {
      const page = await firstValueFrom(
        this.http.get<CardPage>(`${environment.apiUrl}/cards`, {
          params: { type: 'LEADER', search: query, size: '20' },
        }),
      );
      return page.content.map(toLeaderOption);
    } catch (error) {
      console.error('leader search failed', error);
      return [];
    }
  }

  async searchPrintings(params: SearchPrintingsParams): Promise<PrintingsPage> {
    const httpParams: Record<string, string> = {
      page: String(params.page),
      size: String(params.size),
    };
    if (params.search) httpParams['search'] = params.search;
    if (params.type) httpParams['type'] = params.type;
    if (params.color) httpParams['color'] = params.color;
    if (params.series) httpParams['series'] = params.series;

    try {
      return await firstValueFrom(
        this.http.get<PrintingsPage>(`${environment.apiUrl}/cards/printings`, {
          params: httpParams,
        }),
      );
    } catch (error) {
      console.error('printings search failed', error);
      return { content: [], totalElements: 0, totalPages: 0 };
    }
  }
}
