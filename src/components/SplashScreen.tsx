import { Image, StyleSheet, View } from "react-native";

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/images/iStay_logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  logo: {
    width: 220,
    height: 220,
  },
});
