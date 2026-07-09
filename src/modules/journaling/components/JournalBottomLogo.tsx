import * as React from "react";
import Svg, { Path, SvgProps } from "react-native-svg";
const JournalBottomLogo = (props:SvgProps) => (
  <Svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    {...props}
  >
    <Path
      d="M15.5 7H8.5M12.499 11H8.499M20 22H6C5.46957 22 4.96086 21.7893 4.58579 21.4142C4.21071 21.0391 4 20.5304 4 20M4 20C4 19.4696 4.21071 18.9609 4.58579 18.5858C4.96086 18.2107 5.46957 18 6 18H20V6C20 4.114 20 3.172 19.414 2.586C18.828 2 17.886 2 16 2H10C7.172 2 5.757 2 4.879 2.879C4 3.757 4 5.172 4 8V20Z"
      stroke="#696C70"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M19.5 18C19.5 18 18.5 18.763 18.5 20C18.5 21.237 19.5 22 19.5 22"
      stroke="#696C70"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
export default JournalBottomLogo;
