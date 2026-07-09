import * as React from "react";
import Svg, { Path, SvgProps } from "react-native-svg";
const PinLogo = (props:SvgProps) => (
  <Svg
    width={30}
    height={30}
    viewBox="0 0 30 30"
    fill="none"
    {...props}
  >
    <Path
      d="M11.875 18.125L3.75 26.25"
      stroke="#141414"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M6.24887 11.8566L17.7394 23.3471L19.8606 21.2257L19.3705 16.493L26.2568 10.6514L18.9447 3.33926L13.103 10.2254L8.37019 9.73528L6.24887 11.8566Z"
      stroke="#141414"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
export default PinLogo;
