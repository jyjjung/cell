import {
  IBM_Plex_Mono,
  Literata,
} from 'next/font/google';
import { GeistSans } from 'geist/font/sans';

/** Only the three app font choices — Geist Sans, Literata (serif + bible), IBM Plex Mono. */
const literata = Literata({ subsets: ['latin'], variable: '--font-literata', display: 'swap' });
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  // Cover regular + semibold; avoid shipping four mono files on every page.
  weight: ['400', '600'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
});

/** Font CSS variables applied on `<html>` at initial load. */
export const appFontVariableClasses = [
  GeistSans.variable,
  literata.variable,
  ibmPlexMono.variable,
].join(' ');
