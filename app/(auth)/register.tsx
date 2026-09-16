import { Link } from "expo-router";
import React, { useState } from "react";
import { Image, StyleSheet, Text, TextInput, View } from "react-native";

export default function RegisterScreen() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = () => {
    const payload = {
      firstName,
      lastName,      email,
      password,
    };
    console.log("Registration Data:", payload);
  };

  return (
    <View style={styles.container}>
        <Image
            source={require("../../assets/images/iStay_logo.png")}
                
            style={styles.logo}
                resizeMode="contain"
              />
      <Text style={styles.title}>Create Account</Text>

      <TextInput
        placeholder="First Name"
        style={styles.input}
      />

      <TextInput
        placeholder="Surname"
        style={styles.input}
      />

      <TextInput
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
      />

      <TextInput
        placeholder="Password"
        secureTextEntry
        style={styles.input}
      />

      <TextInput
        placeholder="Confirm Password"
        secureTextEntry
        style={styles.input}
      />

      <View style={styles.button}>
        <Text style={styles.buttonText}>Create Account</Text>
      </View>

      <Link href="../(auth)/login" style={styles.link}>
        Already have an account? Login
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    marginBottom: 24,
  },
  logo: {
    width: 90,
    height: 90,
    alignSelf: "center",
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#000",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
  link: {
    textAlign: "center",
    marginTop: 20,
  },
});