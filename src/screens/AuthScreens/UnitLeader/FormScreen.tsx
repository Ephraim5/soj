import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  StatusBar,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { CheckBox } from 'react-native-elements';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import {
  NativeStackNavigationProp,
} from "@react-navigation/native-stack";
import { AntDesign, Ionicons } from "@expo/vector-icons";
import { superForm as style } from '../styles/styles';
import { PRIMARY_BLUE } from "../SuperAdmin/styles";

type RootStackParamList = {
  UnitLeaderFormOne: undefined;
  UnitLeaderFormTwo: undefined;
  MailOtp: undefined;
};


const StepProgress = ({ step, navigation }: { step: number; navigation: any }) => (
  <View style={styles.headerContainer}>
    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
      <AntDesign name="left" size={18} color="#7c7c7cff" style={{ fontWeight: "bold" }} />
    </TouchableOpacity>
    <View >
      <Text style={styles.title}>Welcome Minst Smith</Text>
      <Text style={styles.preTitle}>Please complete your registration.</Text>
    </View>
    <View style={styles.progressWrapper}>
      <View
        style={[styles.progressBar, { backgroundColor: step >= 1 ? "#349DC5" : "#ccc" }]}
      />
      <View
        style={[styles.progressBar, { backgroundColor: step >= 2 ? "#349DC5" : "#ccc" }]}
      />
    </View>
  </View>
);

export const UnitLeader1Screen = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [form, setForm] = useState({
    title: "",
    surname: "",
    firstName: "",
    middleName: "",
    unitId: "",
    gender: "",
    email: "",
    confirmEmail: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (key: string, value: string) =>
    setForm({ ...form, [key]: value });

  const checkPasswordPolicy = (password: string) => {
    const minLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*]/.test(password);
    return { minLength, hasUpperCase, hasLowerCase, hasDigit, hasSpecialChar };
  };

  const handleNext = async () => {
    if (
      !form.title ||
      !form.surname ||
      !form.firstName ||
      !form.email ||
      !form.password
    ) {
      return Alert.alert("Error", "Please fill all required fields");
    }
    if (form.email !== form.confirmEmail)
      return Alert.alert("Error", "Emails do not match");
    if (form.password !== form.confirmPassword)
      return Alert.alert("Error", "Passwords do not match");
    const policy = checkPasswordPolicy(form.password);
    if (!policy.minLength || !policy.hasUpperCase || !policy.hasLowerCase || !policy.hasDigit || !policy.hasSpecialChar) {
      return Alert.alert("Error", "Password must meet all security requirements");
    }

    await AsyncStorage.setItem("step1Data", JSON.stringify(form));
    navigation.navigate("UnitLeaderFormTwo");
  };

  const policy = checkPasswordPolicy(form.password);

  return (
    <ScrollView contentContainerStyle={styles.container}>


      <StepProgress step={1} navigation={navigation} />

      <TextInput
        style={styles.input}
        placeholder="Title"
        value={form.title}
        onChangeText={(text) => handleChange("title", text)}
      />
      <TextInput
        style={styles.input}
        placeholder="Surname"
        value={form.surname}
        onChangeText={(text) => handleChange("surname", text)}
      />
      <TextInput
        style={styles.input}
        placeholder="First Name"
        value={form.firstName}
        onChangeText={(text) => handleChange("firstName", text)}
      />
      <TextInput
        style={styles.input}
        placeholder="Middle Name"
        value={form.middleName}
        onChangeText={(text) => handleChange("middleName", text)}
      />
      <TextInput
        style={styles.input}
        placeholder="Unit"
        value={form.unitId}
        onChangeText={(text) => handleChange("unitId", text)}
      />
      <TextInput
        style={styles.input}
        placeholder="Gender"
        value={form.gender}
        onChangeText={(text) => handleChange("gender", text)}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={form.email}
        onChangeText={(text) => handleChange("email", text)}
      />
      <TextInput
        style={styles.input}
        placeholder="Re-enter Email"
        value={form.confirmEmail}
        onChangeText={(text) => handleChange("confirmEmail", text)}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry={true}
        value={form.password}
        onChangeText={(text) => handleChange("password", text)}
      />
      <Text style={styles.passwordRequirement}>
        Must be at least 8 characters
      </Text>
      <Text style={[styles.passwordRequirement, policy.minLength && styles.validRequirement]}>
        - Minimum of 8 characters
      </Text>
      <Text style={[styles.passwordRequirement, policy.hasUpperCase && styles.validRequirement]}>
        - At least one upper case (A-Z)
      </Text>
      <Text style={[styles.passwordRequirement, policy.hasLowerCase && styles.validRequirement]}>
        - At least one lower case (a-z)
      </Text>
      <Text style={[styles.passwordRequirement, policy.hasDigit && styles.validRequirement]}>
        - At least one digit (0-9)
      </Text>
      <Text style={[styles.passwordRequirement, policy.hasSpecialChar && styles.validRequirement]}>
        - At least one special character (!@#$%^&*)
      </Text>
      <Text style={styles.passwordRequirement}>
        Example: King@life (NGR$vl-4-7)
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Re-enter Password"
        secureTextEntry={true}
        value={form.confirmPassword}
        onChangeText={(text) => handleChange("confirmPassword", text)}
      />

      <TouchableOpacity style={styles.button} onPress={handleNext}>
        <Text style={styles.buttonText}>Next</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

// ---------------------- SCREEN 2 ----------------------
export const UnitLeader2Screen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [agree, setAgree] = useState(false);

  const [form, setForm] = useState({
    country: "",
    state: "",
    lga: "",
    address: "",
    nearestLandmark: "",
    dobDay: "",
    dobMonth: "",
    ageRange: "",
    highestLevelOfEducation: "",
    employmentStatus: "",
    fieldOfWork: "",
    maritalStatus: "",
    profilePhoto: "",
  });
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'We need permission to access your media.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });


    if (!result.canceled) {
      const cropped = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 300, height: 300 } }],
        { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
      );
      setProfileImage(cropped.uri);
    }
  };


  const handleChange = (key: string, value: string) =>
    setForm({ ...form, [key]: value });

  const handleContinue = async () => {
    if (
      !form.country ||
      !form.state ||
      !form.lga ||
      !form.address ||
      !form.maritalStatus
    ) {
      return Alert.alert("Error", "Please fill all required fields");
    }
    const step1Data = await AsyncStorage.getItem("step1Data");
    const allData = { ...(step1Data ? JSON.parse(step1Data) : {}), ...form };
    console.log("Full Registration Data:", allData);
    await AsyncStorage.setItem('user', JSON.stringify({ ...allData, role: "leader" }));
    navigation.navigate('MailOtp');
    // Optional: restart flow
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
  <StatusBar barStyle="dark-content" />

      <StepProgress step={1} navigation={navigation} />

      <TextInput
        style={styles.input}
        placeholder="Country"
        value={form.country}
        onChangeText={(text) => handleChange("country", text)}
      />
      <TextInput
        style={styles.input}
        placeholder="State"
        value={form.state}
        onChangeText={(text) => handleChange("state", text)}
      />
      <TextInput
        style={styles.input}
        placeholder="LGA"
        value={form.lga}
        onChangeText={(text) => handleChange("lga", text)}
      />
      <TextInput
        style={styles.input}
        placeholder="Residential Address"
        value={form.address}
        onChangeText={(text) => handleChange("address", text)}
      />
      <TextInput
        style={styles.input}
        placeholder="Nearest Landmark/Bus stop"
        value={form.nearestLandmark}
        onChangeText={(text) => handleChange("nearestLandmark", text)}
      />
      <View style={styles.dateInput}>
        <TextInput
          style={styles.datePart}
          placeholder="Day"
          value={form.dobDay}
          onChangeText={(text) => handleChange("dobDay", text)}
          keyboardType="numeric"
        />
        <TextInput
          style={styles.datePart}
          placeholder="Month"
          value={form.dobMonth}
          onChangeText={(text) => handleChange("dobMonth", text)}
          keyboardType="numeric"
        />
        <TextInput
          style={styles.datePart}
          placeholder="Age Range"
          value={form.ageRange}
          onChangeText={(text) => handleChange("ageRange", text)}
        />
      </View>
      <TextInput
        style={styles.input}
        placeholder="Highest level of Education"
        value={form.highestLevelOfEducation}
        onChangeText={(text) => handleChange("highestLevelOfEducation", text)}
      />
      <TextInput
        style={styles.input}
        placeholder="Employment Status"
        value={form.employmentStatus}
        onChangeText={(text) => handleChange("employmentStatus", text)}
      />
      <TextInput
        style={styles.input}
        placeholder="Which field best describe your work or business?"
        value={form.fieldOfWork}
        onChangeText={(text) => handleChange("fieldOfWork", text)}
      />
      <TextInput
        style={styles.input}
        placeholder="Marital Status"
        value={form.maritalStatus}
        onChangeText={(text) => handleChange("maritalStatus", text)}
      />
      <View style={style.photoContainer}>
        <TouchableOpacity onPress={pickImage}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={style.profileImage} />
          ) : (
            <Ionicons name="camera" size={50} color="#2CA6FF" />
          )}
        </TouchableOpacity>
        <Text style={style.photoText}>Upload Profile Picture</Text>
      </View>

      <CheckBox
        checked={agree}
        onPress={() => setAgree(!agree)}
        containerStyle={style.checkboxContainer}
        checkedColor={PRIMARY_BLUE}
        title={
          <Text style={style.checkboxText}>
            I have read and agree to the <Text style={{ color: PRIMARY_BLUE }}>Privacy Policy & Terms of Use</Text>
          </Text>
        }
      />

      <TouchableOpacity style={styles.button} onPress={handleContinue}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};


const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: wp(4),
    paddingTop: hp(0.5),
    backgroundColor: "#FFFFFF",
    paddingBottom: 30
  },
  headerContainer: {
    marginBottom: hp(1),
    position: "relative",
  },
  backButton: {
    position: "relative",
    top: 0,
    left: 0,
    zIndex: 10,
    paddingBottom: 10,
  },
  title: {
    fontSize: hp(2.8),
    fontWeight: "700",
    color: "#404040ff",
    textAlign: "left",
  },
  preTitle: {
    fontSize: hp(1.8),
    color: "#666666",
    textAlign: "left",
  },
  progressWrapper: {
    flexDirection: "row",
    marginTop: hp(2),
    justifyContent: "center",
  },
  progressBar: {
    flex: 1,
    height: hp(0.6),
    marginHorizontal: wp(1),
    borderRadius: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: "#DADADA",
    borderRadius: 8,
    paddingVertical: hp(2),
    paddingHorizontal: wp(4),
    marginVertical: hp(0.8),
    fontSize: hp(1.8),
    color: "#333",
    backgroundColor: "#fff",
  },
  dateInput: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  datePart: {
    borderWidth: 1,
    borderColor: "#DADADA",
    borderRadius: 8,
    paddingVertical: hp(1.8),
    paddingHorizontal: wp(2),
    marginVertical: hp(0.8),
    fontSize: hp(1.8),
    flex: 1,
    marginHorizontal: wp(1),
    backgroundColor: "#fff",
  },
  button: {
    backgroundColor: "#349DC5",
    paddingVertical: hp(2),
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: hp(3),
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: hp(2.2),
  },
  passwordRequirement: {
    fontSize: hp(1.5),
    color: "#666666",
    marginVertical: hp(0.4),
    marginLeft: wp(2),
  },
  validRequirement: {
    color: "#00C853", // Green
  },
  termsText: {
    fontSize: hp(1.5),
    color: "#666666",
    marginVertical: hp(2),
    textAlign: "center",
  },
});
