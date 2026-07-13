import * as React from "react";
import { Image, ImageStyle, StyleProp } from "react-native";
import { SvgProps } from "react-native-svg";

const ClubLogo = (props: SvgProps) => {
  const width = typeof props.width === 'number' ? props.width : 59;
  const height = typeof props.height === 'number' ? props.height : 59;
  return (
    <Image
      source={require("./ClubLogo.png")}
      style={[{ width, height }, props.style as StyleProp<ImageStyle>]}
      resizeMode="stretch"
    />
  );
};
export default ClubLogo;
