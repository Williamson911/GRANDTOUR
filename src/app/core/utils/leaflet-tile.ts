import * as L from 'leaflet';

export const CARTO_DARK_URL =
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png';
export const CARTO_DARK_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

export function createDarkTileLayer(): L.TileLayer {
  return L.tileLayer(CARTO_DARK_URL, {
    maxZoom: 18,
    attribution: CARTO_DARK_ATTRIBUTION,
    subdomains: 'abcd',
  });
}

export function createGoldDotIcon(): L.DivIcon {
  return L.divIcon({
    className: 'gt-marker-wrap',
    html: '<span class="gt-marker gt-marker--regional"><span class="gt-marker__dot"></span></span>',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}
