import * as React from "react";
import Svg, { Path, SvgProps } from "react-native-svg";
const DropdownIcon = (props:SvgProps) => (
  <Svg
    width={11}
    height={7}
    viewBox="0 0 11 7"
    fill="none"
    {...props}
  >
    <Path
      d="M1.07837 1.07831L5.3916 5.39154L9.70483 1.07831"
      stroke="#999999"
      strokeWidth={2.15662}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
export default DropdownIcon;
