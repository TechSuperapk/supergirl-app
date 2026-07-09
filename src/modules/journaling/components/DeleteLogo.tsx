import * as React from "react";
import Svg, { Path, SvgProps } from "react-native-svg";
const DeleteLogo = (props:SvgProps) => (
  <Svg
    width={36}
    height={36}
    viewBox="0 0 36 36"
    fill="none"
    {...props}
  >
    <Path
      d="M30 13.5L27.0075 30.5195C26.7553 31.9539 25.5093 33 24.0529 33H11.9471C10.4907 33 9.24465 31.9539 8.99244 30.5195L6 13.5"
      stroke="black"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M31.5 9H23.0625M4.5 9H12.9375M12.9375 9V6C12.9375 4.34314 14.2806 3 15.9375 3H20.0625C21.7194 3 23.0625 4.34314 23.0625 6V9M12.9375 9H23.0625"
      stroke="black"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
export default DeleteLogo;
