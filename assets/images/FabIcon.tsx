import * as React from "react";
import Svg, { Rect, Path, G, Defs, SvgProps } from "react-native-svg";
/* SVGR has dropped some elements not supported by react-native-svg: filter */
const FabIcon = (props:SvgProps) => (
  <Svg
    width={75}
    height={75}
    viewBox="0 0 75 75"
    fill="none"
    {...props}
  >
    <Rect
      x={4.49982}
      y={4.95923}
      width={70}
      height={70}
      rx={35}
      fill="#141414"
    />
    <Path
      d="M29.4998 39.9592H39.4998M49.4998 39.9592H39.4998M39.4998 39.9592V29.9592M39.4998 39.9592V49.9592"
      stroke="white"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <G filter="url(#filter0_f_1575_3810)">
      <Path
        d="M50 11.9593C50 11.9593 31.3721 14.2025 25.5 18.9593C18.4998 23.9592 10 34.9593 10 34.9593C10 34.9593 10.4998 23.9592 22.9996 14.9593C37.9995 5.9593 50 11.9593 50 11.9593Z"
        fill="white"
      />
    </G>
    <Defs></Defs>
  </Svg>
);
export default FabIcon;
