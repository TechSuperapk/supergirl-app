import * as React from "react";
import Svg, { ForeignObject, Path, Defs, ClipPath, SvgProps } from "react-native-svg";
/* SVGR has dropped some elements not supported by react-native-svg: div */
const HeartIcon = (props:SvgProps) => (
  <Svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    {...props}
  >
    <ForeignObject
      x={-3.23417}
      y={-3.23417}
      width={31.0208}
      height={28.9654}
    ></ForeignObject>
    <Path
      data-figma-bg-blur-radius={4.48417}
      d="M22.5525 8.02415C22.5525 9.61339 21.9423 11.1398 20.8525 12.2689C18.3442 14.869 15.9114 17.5801 13.3093 20.0859C12.7129 20.6519 11.7667 20.6312 11.196 20.0396L3.69944 12.2689C1.43352 9.9201 1.43352 6.12819 3.69944 3.7794C5.98763 1.40753 9.71533 1.40753 12.0035 3.7794L12.276 4.06184L12.5483 3.77956C13.6455 2.64175 15.1396 2 16.7005 2C18.2613 2 19.7554 2.64169 20.8525 3.7794C21.9424 4.90863 22.5525 6.43498 22.5525 8.02415Z"
      stroke={props.color ?? "#696C70"}
      strokeWidth={1.5}
      strokeLinejoin="round"
    />
    <Defs>
      <ClipPath
        id="bgblur_0_1900_9547_clip_path"
        transform="translate(3.23417 3.23417)"
      >
        <Path d="M22.5525 8.02415C22.5525 9.61339 21.9423 11.1398 20.8525 12.2689C18.3442 14.869 15.9114 17.5801 13.3093 20.0859C12.7129 20.6519 11.7667 20.6312 11.196 20.0396L3.69944 12.2689C1.43352 9.9201 1.43352 6.12819 3.69944 3.7794C5.98763 1.40753 9.71533 1.40753 12.0035 3.7794L12.276 4.06184L12.5483 3.77956C13.6455 2.64175 15.1396 2 16.7005 2C18.2613 2 19.7554 2.64169 20.8525 3.7794C21.9424 4.90863 22.5525 6.43498 22.5525 8.02415Z" />
      </ClipPath>
    </Defs>
  </Svg>
);
export default HeartIcon;
