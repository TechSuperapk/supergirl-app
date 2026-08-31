/**
 * Protected / Unprotected status badges. Shared by the Log and Entry Details
 * screens so the two never drift apart — they were duplicated inline before.
 */
import * as React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

interface Props { size?: number }

export const CheckBadge = ({ size = 30 }: Props) => (
  <Svg width={size} height={size} viewBox="0 0 30 30" fill="none">
    <Circle cx={15} cy={15} r={15} fill="#1877F2" />
    <Path
      d="M9 15.5L13 19.5L21 11"
      stroke="#FFFFFF" strokeWidth={2.4}
      strokeLinecap="round" strokeLinejoin="round"
    />
  </Svg>
);

export const CrossBadge = ({ size = 30 }: Props) => (
  <Svg width={size} height={size} viewBox="0 0 30 30" fill="none">
    <Circle cx={15} cy={15} r={15} fill="#E5342F" />
    <Path
      d="M10.5 10.5L19.5 19.5M19.5 10.5L10.5 19.5"
      stroke="#FFFFFF" strokeWidth={2.4} strokeLinecap="round"
    />
  </Svg>
);
