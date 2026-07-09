import * as React from "react";
import Svg, { Path, SvgProps } from "react-native-svg";
const DrawLogo = (props:SvgProps) => (
  <Svg
    width={36}
    height={36}
    viewBox="0 0 36 36"
    fill="none"
    {...props}
  >
    <Path
      d="M21.5447 8.47735L24.4718 5.55025C25.2529 4.7692 26.5192 4.7692 27.3003 5.55025L30.8358 9.08579C31.6168 9.86683 31.6168 11.1332 30.8358 11.9142L27.9087 14.8413M21.5447 8.47735L6.86421 23.1579C6.53214 23.4899 6.32751 23.9283 6.28619 24.3961L5.83855 29.4634C5.78377 30.0834 6.30265 30.6023 6.92266 30.5475L11.99 30.0999C12.4578 30.0585 12.8961 29.8539 13.2282 29.5218L27.9087 14.8413M21.5447 8.47735L27.9087 14.8413"
      stroke="black"
      strokeWidth={1.52}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
export default DrawLogo;
