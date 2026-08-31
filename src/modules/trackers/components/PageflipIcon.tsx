import * as React from "react";
import Svg, { Path, SvgProps } from "react-native-svg";
const PageflipIcon = (props:SvgProps) => (
  <Svg
    width={20}
    height={20}
    viewBox="0 0 20 20"
    fill="none"

    {...props}
  >
    <Path
      d="M10 9.16602H12.0833H14.1667"
      stroke="#FB923C"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M10 5.83398H12.0833H14.1667"
      stroke="#FB923C"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M6.66667 12.5V3.1C6.66667 2.76863 6.9353 2.5 7.26667 2.5H16.9C17.2314 2.5 17.5 2.76863 17.5 3.1V14.1667C17.5 16.0076 16.0076 17.5 14.1667 17.5"
      stroke="#FB923C"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M4.5013 12.5H6.66797H10.2346C10.566 12.5 10.8379 12.7682 10.8681 13.0982C10.9899 14.4253 11.5541 17.5 14.168 17.5H6.66797H5.5013C3.84445 17.5 2.5013 16.1569 2.5013 14.5C2.5013 13.3954 3.39673 12.5 4.5013 12.5Z"
      stroke="#FB923C"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
export default PageflipIcon;
