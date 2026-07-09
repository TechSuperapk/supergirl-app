import * as React from "react";
import Svg, { Path, SvgProps } from "react-native-svg";
const CameraLogo = (props:SvgProps) => (
  <Svg
    width={36}
    height={36}
    viewBox="0 0 36 36"
    fill="none"
    {...props}
  >
    <Path
      d="M3 28.1667V13.8333C3 11.9924 4.49238 10.5 6.33333 10.5H6.58333C7.63252 10.5 8.62049 10.006 9.25 9.16667L12.45 4.9C12.6389 4.64819 12.9352 4.5 13.25 4.5H22.75C23.0648 4.5 23.3611 4.64819 23.55 4.9L26.75 9.16667C27.3795 10.006 28.3675 10.5 29.4167 10.5H29.6667C31.5076 10.5 33 11.9924 33 13.8333V28.1667C33 30.0076 31.5076 31.5 29.6667 31.5H6.33333C4.49238 31.5 3 30.0076 3 28.1667Z"
      stroke="black"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M18 25.5C21.3137 25.5 24 22.8137 24 19.5C24 16.1863 21.3137 13.5 18 13.5C14.6863 13.5 12 16.1863 12 19.5C12 22.8137 14.6863 25.5 18 25.5Z"
      stroke="black"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
export default CameraLogo;
