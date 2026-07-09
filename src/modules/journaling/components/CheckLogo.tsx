import * as React from "react";
import Svg, { Path, SvgProps } from "react-native-svg";
const CheckLogo = (props:SvgProps) => (
  <Svg
    width={30}
    height={30}
    viewBox="0 0 30 30"
    fill="none"
    {...props}
  >
    <Path
      d="M6.25 16.25L11.25 21.25L23.75 8.75"
      stroke="white"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
export default CheckLogo;
