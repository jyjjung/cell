import pkg from '../../package.json';

/** App version — `NEXT_PUBLIC_APP_VERSION` at build time, else package.json. */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? pkg.version;
