import * as React from "react";
import Svg, { Path, SvgProps } from "react-native-svg";
const FlowIcon = (props:SvgProps) => (
  <Svg
    width={20}
    height={20}
    viewBox="0 0 20 20"
    fill="none"
    {...props}
  >
    <Path
      d="M10.9904 2.61814C12.8404 3.99731 16.6654 7.29397 16.6654 11.0648C16.6654 16.0481 12.4987 17.709 9.9987 17.709C7.4987 17.709 3.33203 16.0481 3.33203 11.0648C3.33203 7.29397 7.15703 3.99731 9.00703 2.61814C9.29401 2.40569 9.64164 2.29102 9.9987 2.29102C10.3558 2.29102 10.7034 2.40569 10.9904 2.61814Z"
      stroke={props.color ?? "#FE5151"}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M5.83203 11.0645C5.83203 12.1661 6.2712 13.2228 7.05203 14.0011C7.83427 14.7809 8.89415 15.2183 9.9987 15.217"
      stroke={props.color ?? "#FE5151"}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
export default FlowIcon;
