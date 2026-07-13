import * as React from "react";
import { Image, ImageStyle, StyleProp } from "react-native";
import { SvgProps } from "react-native-svg";

const TrackersLogo = (props: SvgProps) => {
  const width = typeof props.width === 'number' ? props.width : 44;
  const height = typeof props.height === 'number' ? props.height : 44;
  return (
    <Image
      source={require("./TrackersLogo.png")}
      style={[{ width, height }, props.style as StyleProp<ImageStyle>]}
      resizeMode="stretch"
    />
  );
};
export default TrackersLogo;
