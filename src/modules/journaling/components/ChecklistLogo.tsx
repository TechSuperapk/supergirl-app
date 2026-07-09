import * as React from "react";
import Svg, { Rect, Path, SvgProps } from "react-native-svg";
const ChecklistLogo = (props:SvgProps) => (
  <Svg
    width={30}
    height={30}
    viewBox="0 0 30 30"
    fill="none"
    {...props}
  >
    <Rect
      x={0.75}
      y={0.75}
      width={28.5}
      height={28.5}
      rx={4.25}
      stroke="black"
      strokeWidth={1.5}
    />
    <Path
      d="M6.25 16.25L11.25 21.25L23.75 8.75"
      stroke="black"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
export default ChecklistLogo;
