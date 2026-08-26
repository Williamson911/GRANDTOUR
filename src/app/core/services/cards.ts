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
  rarity?: string;
  page: number;
  size: number;
}

export interface CardFacets {
  colors: string[];
  series: string[];
  rarities: string[];
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
  // Front-face images are stored in our own database and served through the
  // backend's universal image endpoint (see CardController#getImage).
  return imgLink ? `${environment.apiUrl}/cards/images/${encodeURIComponent(imgLink)}` : null;
}

export function cardBackImageUrl(imgLink: string | null): string | null {
  return imgLink ? `${DO_ASSETS}/dbs_masters/${imgLink}_b.webp` : null;
}

export function awakenedAwareImageUrl(
  entity: { backName: string | null; imgLink: string | null },
  preferAwakened = true,
): string | null {
  return preferAwakened && entity.backName
    ? cardBackImageUrl(entity.imgLink)
    : cardImageUrl(entity.imgLink);
}

export function colorSwatch(color: string): string {
  const hex: Record<string, string> = {
    Red: '#dc2626',
    Blue: '#2563eb',
    Green: '#16a34a',
    Yellow: '#eab308',
    Black: '#27272a',
    White: '#f4f4f5',
    Colorless: '#a1a1aa',
  };
  if (color.includes('/')) {
    const [a, b] = color.split('/');
    const colorA = hex[a] ?? '#a1a1aa';
    const colorB = hex[b] ?? '#a1a1aa';
    return `linear-gradient(135deg, ${colorA} 50%, ${colorB} 50%)`;
  }
  return hex[color] ?? '#a1a1aa';
}

export function rarityCode(rarity: string): string {
  const match = rarity.match(/\[([^\]]+)\]/);
  return match ? match[1] : rarity;
}

export function rarityLabel(rarity: string): string {
  return rarity.replace(/\[([^\]]+)\]/, ' ($1)').trim();
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
    if (params.rarity) httpParams['rarity'] = params.rarity;

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

  async getFacets(): Promise<CardFacets> {
    try {
      return await firstValueFrom(
        this.http.get<CardFacets>(`${environment.apiUrl}/cards/facets`),
      );
    } catch (error) {
      console.error('facets load failed', error);
      return { colors: [], series: [], rarities: [] };
    }
  }
}
