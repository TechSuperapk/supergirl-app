import * as React from "react";
import { Image, ImageStyle, StyleProp } from "react-native";
import { SvgProps } from "react-native-svg";

const OutfitsLogo = (props: SvgProps) => {
  const width = typeof props.width === 'number' ? props.width : 46;
  const height = typeof props.height === 'number' ? props.height : 46;
  return (
    <Image
      source={require("./OutfitsLogo.png")}
      style={[{ width, height }, props.style as StyleProp<ImageStyle>]}
      resizeMode="stretch"
    />
  );
};
export default OutfitsLogo;
