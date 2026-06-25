import * as React from "react";
import Svg, { Path, SvgProps } from "react-native-svg";
const VideoLogo = (props:SvgProps) => (
  <Svg
    width={30}
    height={30}
    viewBox="0 0 30 30"
    fill="none"
    
    {...props}
  >
    <Path
      d="M24.375 3.75H5.625C5.12772 3.75 4.65081 3.94754 4.29917 4.29917C3.94754 4.65081 3.75 5.12772 3.75 5.625V24.375C3.75 24.8723 3.94754 25.3492 4.29917 25.7008C4.65081 26.0525 5.12772 26.25 5.625 26.25H24.375C24.8723 26.25 25.3492 26.0525 25.7008 25.7008C26.0525 25.3492 26.25 24.8723 26.25 24.375V5.625C26.25 5.12772 26.0525 4.65081 25.7008 4.29917C25.3492 3.94754 24.8723 3.75 24.375 3.75Z"
      stroke="#010017"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M3.75 9.375H26.25M20.625 3.75L16.875 9.375M13.125 3.75L9.375 9.375M12.8125 17.5V13.7112L16.0938 15.605L19.375 17.5L16.0938 19.3944L12.8125 21.2888V17.5Z"
      stroke="#010017"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
export default VideoLogo;
