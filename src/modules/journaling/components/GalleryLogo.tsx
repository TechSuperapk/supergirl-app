import * as React from "react";
import Svg, { Path, SvgProps } from "react-native-svg";
const GalleryLogo = (props:SvgProps) => (
  <Svg
    width={36}
    height={36}
    viewBox="0 0 36 36"
    fill="none"
    {...props}
  >
    <Path
      d="M31.5 11.1V30.9C31.5 31.2314 31.2314 31.5 30.9 31.5H11.1C10.7686 31.5 10.5 31.2314 10.5 30.9V11.1C10.5 10.7686 10.7686 10.5 11.1 10.5H30.9C31.2314 10.5 31.5 10.7686 31.5 11.1Z"
      stroke="black"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M27 6H6.6C6.26863 6 6 6.26863 6 6.6V27"
      stroke="black"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M10.5 25.2L18.6667 22.5L31.5 27"
      stroke="black"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M24.75 19.5C23.5074 19.5 22.5 18.4926 22.5 17.25C22.5 16.0074 23.5074 15 24.75 15C25.9926 15 27 16.0074 27 17.25C27 18.4926 25.9926 19.5 24.75 19.5Z"
      stroke="black"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
export default GalleryLogo;
