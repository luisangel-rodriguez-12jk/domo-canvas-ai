export interface DomoAsset {
  id: string;
  name: string;
  description: string;
  width: number;
  height: number;
  src: string;
}

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const baseAttrs = 'xmlns="http://www.w3.org/2000/svg" width="1800" height="1800" viewBox="0 0 1800 1800"';

export const domoAssets: DomoAsset[] = [
  {
    id: 'domo-wordmark-gothic',
    name: 'DOMO gótico',
    description: 'Wordmark blanco alto contraste para playera negra.',
    width: 1800,
    height: 1800,
    src: svgDataUrl(`<svg ${baseAttrs}><rect width="1800" height="1800" fill="none"/><text x="900" y="920" text-anchor="middle" font-family="Impact, Arial Black, sans-serif" font-size="390" letter-spacing="20" fill="#fff">DOMO</text><path d="M330 1035h1140" stroke="#ff2a55" stroke-width="28" stroke-linecap="round"/><text x="900" y="1155" text-anchor="middle" font-family="Arial Black, sans-serif" font-size="92" letter-spacing="15" fill="#fff">STREETWEAR</text></svg>`),
  },
  {
    id: 'domo-d-monogram',
    name: 'Monograma D',
    description: 'Emblema circular minimalista para pecho o manga.',
    width: 1800,
    height: 1800,
    src: svgDataUrl(`<svg ${baseAttrs}><rect width="1800" height="1800" fill="none"/><circle cx="900" cy="900" r="610" fill="none" stroke="#fff" stroke-width="54"/><circle cx="900" cy="900" r="500" fill="none" stroke="#ff2a55" stroke-width="18" stroke-dasharray="42 28"/><text x="900" y="1115" text-anchor="middle" font-family="Impact, Arial Black, sans-serif" font-size="720" fill="#fff">D</text></svg>`),
  },
  {
    id: 'domo-calavera-badge',
    name: 'Calavera badge',
    description: 'Badge gótico mexicano base para arte frontal.',
    width: 1800,
    height: 1800,
    src: svgDataUrl(`<svg ${baseAttrs}><rect width="1800" height="1800" fill="none"/><path d="M900 260c-330 0-560 220-560 525 0 190 80 335 218 418v185h684v-185c138-83 218-228 218-418 0-305-230-525-560-525Z" fill="none" stroke="#fff" stroke-width="48"/><circle cx="690" cy="790" r="105" fill="#fff"/><circle cx="1110" cy="790" r="105" fill="#fff"/><path d="M900 870l-86 180h172l-86-180Z" fill="#ff2a55"/><path d="M665 1220h470M720 1325h360" stroke="#fff" stroke-width="38" stroke-linecap="round"/><text x="900" y="1535" text-anchor="middle" font-family="Arial Black, sans-serif" font-size="110" letter-spacing="12" fill="#fff">DOMO</text></svg>`),
  },
];
