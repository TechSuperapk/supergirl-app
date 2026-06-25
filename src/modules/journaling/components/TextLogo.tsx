import * as React from "react";
import Svg, { Path, SvgProps } from "react-native-svg";
const TextLogo = (props:SvgProps) => (
  <Svg
    width={30}
    height={30}
    viewBox="0 0 30 30"
    fill="none"
   
    {...props}
  >
    <Path
      d="M3.75 8.75L3.75 6.25L21.25 6.25V8.75"
      stroke="#010017"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12.5 6.25L12.5 23.75M12.5 23.75H15M12.5 23.75H10"
      stroke="#010017"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M16.25 17.5L16.25 15H26.25V17.5"
      stroke="#010017"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M21.25 15V23.75M21.25 23.75H19.375M21.25 23.75H23.125"
      stroke="#010017"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
export default TextLogo;
