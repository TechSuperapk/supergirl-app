import * as React from "react";
import Svg, { Path, SvgProps } from "react-native-svg";
const FlameIcon = (props: SvgProps) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" {...props}>
    <Path
      d="M12 3C12 3 5.5 7.5 5.5 13.2C5.5 16.9 8.4 20 12 20C15.6 20 18.5 16.9 18.5 13.2C18.5 9.8 15.5 7.3 14 4.8C13.4 6.8 12.6 8 11.4 8.9C11.4 8.9 12 6.4 12 3Z"
      stroke={props.color ?? "#FF9919"}
      strokeWidth={1.5}
      strokeLinejoin="round"
    />
    <Path
      d="M12 20C10.2 20 9 18.6 9 16.9C9 15.1 10.4 13.8 12 12C13.6 13.8 15 15.1 15 16.9C15 18.6 13.8 20 12 20Z"
      stroke={props.color ?? "#FF9919"}
      strokeWidth={1.5}
      strokeLinejoin="round"
    />
  </Svg>
);
export default FlameIcon;
