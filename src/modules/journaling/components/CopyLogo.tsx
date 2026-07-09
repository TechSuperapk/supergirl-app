import * as React from "react";
import Svg, { Path ,SvgProps} from "react-native-svg";
const CopyLogo = (props:SvgProps) => (
  <Svg
    width={36}
    height={36}
    viewBox="0 0 36 36"
    fill="none"
    {...props}
  >
    <Path
      d="M29.4 30H14.1C13.7686 30 13.5 29.7314 13.5 29.4V14.1C13.5 13.7686 13.7686 13.5 14.1 13.5H29.4C29.7314 13.5 30 13.7686 30 14.1V29.4C30 29.7314 29.7314 30 29.4 30Z"
      stroke="black"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M22.5 13.5V6.6C22.5 6.26863 22.2314 6 21.9 6H6.6C6.26863 6 6 6.26863 6 6.6V21.9C6 22.2314 6.26863 22.5 6.6 22.5H13.5"
      stroke="black"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
export default CopyLogo;
