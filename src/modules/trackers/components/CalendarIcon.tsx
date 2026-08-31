import * as React from "react";
import Svg, { Path, Rect, SvgProps } from "react-native-svg";
const CalendarIcon = (props: SvgProps) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" {...props}>
    <Rect
      x={2.75} y={4.75} width={18.5} height={16.5} rx={3.5}
      stroke={props.color ?? "#E91E63"} strokeWidth={1.5}
    />
    <Path
      d="M2.75 9.25H21.25"
      stroke={props.color ?? "#E91E63"}
      strokeWidth={1.5} strokeLinecap="round"
    />
    <Path
      d="M7.5 2.75V6.25M16.5 2.75V6.25"
      stroke={props.color ?? "#E91E63"}
      strokeWidth={1.5} strokeLinecap="round"
    />
    <Rect
      x={6} y={12} width={12} height={6} rx={1.5}
      fill={props.color ?? "#E91E63"}
    />
  </Svg>
);
export default CalendarIcon;
