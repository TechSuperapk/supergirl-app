import * as React from "react";
import Svg, { Rect, Path, SvgProps } from "react-native-svg";
const MicLogo = (props:SvgProps) => (
  <Svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    
    {...props}
  >
    <Rect
      x={9}
      y={2}
      width={6}
      height={12}
      rx={3}
      stroke="#0066FF"
      strokeWidth={1.5}
    />
    <Path
      d="M5 10V11C5 14.866 8.13401 18 12 18C15.866 18 19 14.866 19 11V10"
      stroke="#0066FF"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12 18V22M12 22H9M12 22H15"
      stroke="#0066FF"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
export default MicLogo;
