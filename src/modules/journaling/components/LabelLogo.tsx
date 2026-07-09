import * as React from "react";
import Svg, { Path, SvgProps } from "react-native-svg";
const LabelLogo = (props:SvgProps) => (
  <Svg
    width={36}
    height={36}
    viewBox="0 0 36 36"
    fill="none"
    {...props}
  >
    <Path
      d="M4.5 26.4V9.6C4.5 9.26863 4.76863 9 5.1 9H25.1789C25.3795 9 25.5668 9.10026 25.6781 9.26718L31.2781 17.6672C31.4125 17.8687 31.4125 18.1313 31.2781 18.3328L25.6781 26.7328C25.5668 26.8997 25.3795 27 25.1789 27H5.1C4.76863 27 4.5 26.7314 4.5 26.4Z"
      stroke="black"
      strokeWidth={2}
    />
  </Svg>
);
export default LabelLogo;
