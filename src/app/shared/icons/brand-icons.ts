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
  path: string;
}

export const BRAND_ICONS: Readonly<Record<string, BrandIcon>> = {
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

  mercadopago: siMercadopago,
  neon: siNeon,
  nubank: siNubank,
  pagseguro: siPagseguro,
  paypal: siPaypal,
  picpay: siPicpay,
  pix: siPix,
};
