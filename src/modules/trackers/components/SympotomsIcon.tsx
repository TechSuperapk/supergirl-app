import * as React from "react";
import Svg, { Path, SvgProps } from "react-native-svg";
const SympotomsIcon = (props:SvgProps) => (
  <Svg
    width={20}
    height={21}
    viewBox="0 0 20 21"
    fill="none"

    {...props}
  >
    <Path
      d="M16.6682 1.66602C16.6682 1.66602 15.0015 5.57268 15.0015 8.80852C15.0015 9.84518 15.3565 10.7118 15.8349 11.5752C16.3849 12.5693 17.099 13.5585 17.6232 14.7943C18.039 15.776 18.3349 16.9135 18.3349 18.3327M3.33487 1.66602C3.33487 1.66602 5.00153 5.57268 5.00153 8.80852C5.00153 9.84518 4.64653 10.7118 4.1682 11.5752C3.6182 12.5693 2.90403 13.5585 2.37987 14.7943C1.90165 15.9122 1.65937 17.1168 1.6682 18.3327"
      stroke={props.color ?? "#A855F7"}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      opacity={0.5}
      d="M5.75 9.37305L14.75 9.37305M5.75 9.37305L14.75 9.37305"
      stroke={props.color ?? "#A855F7"}
      strokeWidth={1.5}
      strokeLinecap="round"
    />
    <Path
      d="M17.5 14.582C12.5 14.582 10.4167 17.082 10 18.332C9.58333 17.082 7.5 14.582 2.5 14.582"
      stroke={props.color ?? "#A855F7"}
      strokeWidth={1.5}
      strokeLinecap="round"
    />
  </Svg>
);
export default SympotomsIcon;
