import { themeDefinitions } from './themes';

export const colors = themeDefinitions.dark.colors;

export type ColorKey = keyof typeof colors;
