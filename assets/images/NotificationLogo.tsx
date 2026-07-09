import * as React from "react";
import Svg, { Path, Circle, SvgProps } from "react-native-svg";
const NotificationLogo = (props:SvgProps) => (
  <Svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    {...props}
  >
    <Path
      d="M18 8.4C18 6.70261 17.3679 5.07475 16.2426 3.87452C15.1174 2.67428 13.5913 2 12 2C10.4087 2 8.88258 2.67428 7.75736 3.87452C6.63214 5.07475 6 6.70261 6 8.4C6 11.696 5.41541 13.9528 4.76235 15.4455C4.372 16.3378 5.15789 18 6.13181 18H17.8682C18.8421 18 19.628 16.3378 19.2376 15.4455C18.5846 13.9528 18 11.696 18 8.4Z"
      stroke="#FA940C"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M13.7295 21C13.5537 21.3031 13.3014 21.5547 12.9978 21.7295C12.6941 21.9044 12.3499 21.9965 11.9995 21.9965C11.6492 21.9965 11.3049 21.9044 11.0013 21.7295C10.6977 21.5547 10.4453 21.3031 10.2695 21"
      stroke="#FA940C"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx={17.5} cy={4.29248} r={3.5} fill="#1CCD65" />
  </Svg>
);
export default NotificationLogo;
