import * as React from "react";
import Svg, { Path, SvgProps } from "react-native-svg";
const NotesBottomLogo = (props:SvgProps) => (
  <Svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    {...props}
  >
    <Path
      d="M8 14H11.5M8 10H16M13 3.5H11C7.7 3.5 6.05 3.5 5.025 4.525C4 5.55 4 7.2 4 10.5V15C4 18.3 4 19.95 5.025 20.975C6.05 22 7.7 22 11 22H14L20 16V10.5C20 7.2 20 5.55 18.975 4.525C17.95 3.5 16.3 3.5 13 3.5Z"
      stroke="#696C70"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M20 16C17.172 16 15.757 16 14.879 16.879C14 17.757 14 19.172 14 22M16.5 2V5M7.5 2V5M12 2V5"
      stroke="#696C70"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
export default NotesBottomLogo;
