import React from 'react';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {colors} from '../theme';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
}

export function Icon({name, size = 24, color = colors.primary}: IconProps) {
  return <MaterialIcons name={name} size={size} color={color} />;
}
