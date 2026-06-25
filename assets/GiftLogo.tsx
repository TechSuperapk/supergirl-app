import * as React from "react";
import Svg, { Path, SvgProps } from "react-native-svg";
const GiftLogo = (props:SvgProps) => (
  <Svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
   
    {...props}
  >
    <Path
      d="M20 12V21.4C20 21.7314 19.7314 22 19.4 22H4.6C4.26863 22 4 21.7314 4 21.4V12"
      stroke="#0066FF"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M20 7H4C2.89543 7 2 7.89543 2 9V10C2 11.1046 2.89543 12 4 12H20C21.1046 12 22 11.1046 22 10V9C22 7.89543 21.1046 7 20 7Z"
      stroke="#0066FF"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12 22V7"
      stroke="#0066FF"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M11.1746 4.71114C11.7504 5.83425 10.8225 7 9.56039 7H7.5C6.83696 7 6.20107 6.73661 5.73223 6.26777C5.26339 5.79893 5 5.16304 5 4.5C5 3.83696 5.26339 3.20107 5.73223 2.73223C6.20107 2.26339 6.83696 2 7.5 2C9.34864 2 10.4998 3.39488 11.1746 4.71114Z"
      stroke="#0066FF"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12.8254 4.71114C12.2496 5.83425 13.1775 7 14.4396 7H16.5C17.163 7 17.7989 6.73661 18.2678 6.26777C18.7366 5.79893 19 5.16304 19 4.5C19 3.83696 18.7366 3.20107 18.2678 2.73223C17.7989 2.26339 17.163 2 16.5 2C14.6514 2 13.5002 3.39488 12.8254 4.71114Z"
      stroke="#0066FF"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
export default GiftLogo;
