import { GeistSans } from 'geist/font/sans';

const { googleFontVariableClasses } = require('./app-fonts-google') as typeof import('./app-fonts-google');

/** Font CSS variables applied on `<html>` at initial load. */
export const appFontVariableClasses = googleFontVariableClasses
  ? [GeistSans.variable, googleFontVariableClasses].join(' ')
  : GeistSans.variable;
