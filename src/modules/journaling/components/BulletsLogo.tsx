import * as React from "react";
import Svg, { Path, SvgProps } from "react-native-svg";
const BulletsLogo = (props:SvgProps) => (
  <Svg
    width={30}
    height={30}
    viewBox="0 0 30 30"
    fill="none"
   
    {...props}
  >
    <Path
      d="M10 7.5L25 7.5"
      stroke="#010017"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M5 7.5125L5.0125 7.49861"
      stroke="#010017"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M5 15.0125L5.0125 14.9986"
      stroke="#010017"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M5 22.5125L5.0125 22.4986"
      stroke="#010017"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M10 15L25 15"
      stroke="#010017"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M10 22.5L25 22.5"
      stroke="#010017"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
export default BulletsLogo;
