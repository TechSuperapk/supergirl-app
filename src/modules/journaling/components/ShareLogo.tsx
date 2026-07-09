import * as React from "react";
import Svg, { Path, SvgProps } from "react-native-svg";
const ShareLogo = (props:SvgProps) => (
  <Svg
    width={36}
    height={36}
    viewBox="0 0 36 36"
    fill="none"
    {...props}
  >
    <Path
      d="M30 19.5V29.5C30 30.6046 29.1046 31.5 28 31.5H8C6.89543 31.5 6 30.6046 6 29.5V19.5"
      stroke="black"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M18 22.5V4.5M23.25 9.75L18 4.5L12.75 9.75"
      stroke="black"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
export default ShareLogo;
