import {
  Crimson_Pro,
  DM_Sans,
  IBM_Plex_Mono,
  IBM_Plex_Sans,
  IBM_Plex_Serif,
  Inter,
  JetBrains_Mono,
  Literata,
  Lora,
  Merriweather,
  Nunito,
  Playfair_Display,
  Source_Serif_4,
} from 'next/font/google';
import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', display: 'swap' });
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans',
  display: 'swap',
});
const nunito = Nunito({ subsets: ['latin'], variable: '--font-nunito', display: 'swap' });
const lora = Lora({ subsets: ['latin'], variable: '--font-lora', display: 'swap' });
const merriweather = Merriweather({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-merriweather',
  display: 'swap',
});
const literata = Literata({ subsets: ['latin'], variable: '--font-literata', display: 'swap' });
const sourceSerif = Source_Serif_4({ subsets: ['latin'], variable: '--font-source-serif', display: 'swap' });
const ibmPlexSerif = IBM_Plex_Serif({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-serif',
  display: 'swap',
});
const crimsonPro = Crimson_Pro({ subsets: ['latin'], variable: '--font-crimson-pro', display: 'swap' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair', display: 'swap' });
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
});

/** All typography font CSS variables — applied on `<html>` at initial load. */
export const appFontVariableClasses = [
  GeistSans.variable,
  GeistMono.variable,
  inter.variable,
  dmSans.variable,
  ibmPlexSans.variable,
  nunito.variable,
  lora.variable,
  merriweather.variable,
  literata.variable,
  sourceSerif.variable,
  ibmPlexSerif.variable,
  crimsonPro.variable,
  playfair.variable,
  jetbrainsMono.variable,
  ibmPlexMono.variable,
].join(' ');
