import { Literata } from 'next/font/google';

const literata = Literata({ subsets: ['latin'], variable: '--font-literata', display: 'swap' });

/** Bible reader serif — app UI uses Geist Sans only. */
export const googleFontVariableClasses = literata.variable;
