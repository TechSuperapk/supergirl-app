import * as React from "react";
import Svg, { Path, SvgProps } from "react-native-svg";
const HeartIcon = (props:SvgProps) => (
  <Svg
    width={20}
    height={20}
    viewBox="0 0 20 20"
    fill="none"
    {...props}
  >
    <Path
      d="M18.3346 7.38518C18.3346 8.67395 17.8398 9.91177 16.9561 10.8274C14.922 12.9359 12.9492 15.1344 10.8391 17.1664C10.3554 17.6254 9.5881 17.6086 9.1253 17.1289L3.0461 10.8274C1.20859 8.92267 1.20859 5.84769 3.0461 3.94298C4.90167 2.01954 7.92458 2.01954 9.78015 3.94298L10.0011 4.17201L10.2219 3.9431C11.1117 3.02042 12.3233 2.5 13.5891 2.5C14.8548 2.5 16.0664 3.02037 16.9561 3.94298C17.8399 4.8587 18.3346 6.09647 18.3346 7.38518Z"
      stroke={props.color ?? "#FF2F71"}
      strokeWidth={1.5}
      strokeLinejoin="round"
    />
  </Svg>
);
export default HeartIcon;
