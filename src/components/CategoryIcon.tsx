import React from 'react';
import Icon from 'react-native-vector-icons/Ionicons';
import { resolveCategoryIconName } from '../utils/icons';

interface CategoryIconProps {
    icon?: string | null;
    categoryName?: string | null;
    size?: number;
    color?: string;
}

export function CategoryIcon({
    icon,
    categoryName,
    size = 20,
    color = '#FFFFFF',
}: CategoryIconProps) {
    return (
        <Icon
            name={resolveCategoryIconName(icon, categoryName)}
            size={size}
            color={color}
        />
    );
}
