import {
  siApple,
  siClaude,
  siCrunchyroll,
  siDiscord,
  siGoogle,
  siIfood,
  siMax,
  siMercadopago,
  siNeon,
  siNetflix,
  siNubank,
  siPagseguro,
  siPaypal,
  siPicpay,
  siPix,
  siPlaystation,
  siSpotify,
  siSteam,
  siTwitch,
  siUber,
  siYoutube,
} from 'simple-icons';

export interface BrandIcon {
  title: string;
  /** Path SVG em viewBox 0 0 24 24. */
  path: string;
}

/**
 * Registro explícito de marcas — só o que está listado entra no bundle.
 * Para adicionar uma marca: importe o ícone da `simple-icons` e registre aqui.
 */
export const BRAND_ICONS: Readonly<Record<string, BrandIcon>> = {
  // Categorias
  apple: siApple,
  claude: siClaude,
  crunchyroll: siCrunchyroll,
  discord: siDiscord,
  google: siGoogle,
  ifood: siIfood,
  max: siMax,
  netflix: siNetflix,
  playstation: siPlaystation,
  spotify: siSpotify,
  steam: siSteam,
  twitch: siTwitch,
  uber: siUber,
  youtube: siYoutube,

  // Contas / carteiras
  mercadopago: siMercadopago,
  neon: siNeon,
  nubank: siNubank,
  pagseguro: siPagseguro,
  paypal: siPaypal,
  picpay: siPicpay,
  pix: siPix,
};
