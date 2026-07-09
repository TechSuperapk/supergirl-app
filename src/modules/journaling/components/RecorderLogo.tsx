import * as React from "react";
import Svg, { Rect, Path, SvgProps } from "react-native-svg";
const RecorderLogo = (props:SvgProps) => (
  <Svg
    width={36}
    height={36}
    viewBox="0 0 36 36"
    fill="none"
    {...props}
  >
    <Rect
      x={13.5}
      y={3}
      width={9}
      height={18}
      rx={4.5}
      stroke="black"
      strokeWidth={2}
    />
    <Path
      d="M7.5 15V16.5C7.5 22.299 12.201 27 18 27C23.799 27 28.5 22.299 28.5 16.5V15"
      stroke="black"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M18 27V33M18 33H13.5M18 33H22.5"
      stroke="black"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
export default RecorderLogo;
