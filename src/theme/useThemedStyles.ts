import { useMemo } from 'react';
import { useTheme } from './ThemeProvider';
import { SemanticColors } from './themes';

export function useThemedStyles<T>(factory: (colors: SemanticColors) => T): T {
    const { colors } = useTheme();
    return useMemo(() => factory(colors), [colors, factory]);
}
