import { StyleSheet, Platform } from "react-native";
import {
  heightPercentageToDP,
  heightPercentageToDP as responsiveHeight,
 widthPercentageToDP as responsiveWidth,
 widthPercentageToDP,
} from 'react-native-responsive-screen';
import { PRIMARY_BLUE } from "../SuperAdmin/styles";

export const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#fff',
    paddingHorizontal: responsiveWidth(5),
  },
  logo: {
    width: responsiveWidth(40),
    height: responsiveHeight(20),
    marginBottom: responsiveHeight(2),
  },
  title: {
    fontSize: 24,
    color: '#349DC5',
    fontWeight: '600',
    marginBottom: responsiveHeight(1),
  },
  subtitle: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: responsiveHeight(3),
    lineHeight: 20,
  },
  input: {
    width: '100%',
    height: responsiveHeight(6),
    backgroundColor: '#f7f7f7',
    borderRadius: 10,
    paddingHorizontal: responsiveWidth(4),
    fontSize: 16,
    borderColor: '#ddd',
    borderWidth: 1,
    marginBottom: responsiveHeight(2.5),
  },
  button: {
    width: '100%',
    height: responsiveHeight(6),
    backgroundColor: '#7DC3E8',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

});
export const stylesMail = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  content: {
    paddingTop: '25%',
  },
  backButton: {
    position: 'absolute',
    top: 10,
    left: 0,
  },
  lockIcon: {
    width: 90,
    height: 90,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    gap:5,
  },
  otpInput: {
    width: widthPercentageToDP(12),
    height: 45,
    backgroundColor: '#f1f1f1',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 18,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 2,
  },
  timerText: {
    fontSize: 13,
    textAlign: 'center',
    color: '#888',
    marginBottom: 5,
  },
  resendText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#2CA6FF',
    fontWeight: '500',
    marginBottom: 25,
  },
  keypadWrapper: {
    width: '100%',
    backgroundColor: '#e8e8e8',
    borderRadius: 18,
    padding: 10,
    marginBottom: '5%',
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  keypadButton: {
    width: '22%',
    aspectRatio: 1.1,
    backgroundColor: '#fff',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.8,
    borderColor: '#ddd',
  },
  grayKey: {
    backgroundColor: '#e1e1e1',
  },
  blueKey: {
    backgroundColor: '#349DC5',
    borderColor: '#349DC5',
  },
  keypadText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  verifyButton: {
    backgroundColor: '#349DC5',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export const superForm = StyleSheet.create({
    container: {
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 30,
        backgroundColor: '#fff',
    },
    backButton: {
        position: 'absolute',
        top: 50,
        left: 20,
        zIndex: 10,
    },
    profileImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 2,
        borderColor:PRIMARY_BLUE,
    },
    logo: {
        width: 90,
        height: 90,
        alignSelf: 'center',
        marginBottom: 10,
    },
    header: {
        fontSize: 19,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#000a0f',
        marginBottom: 5,
    },
    subtext: {
        fontSize: 16,
        textAlign: 'center',
        color: '#000000',
        marginBottom: 10,
    },
    formGroup: {
        marginTop: 10,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 10,
        paddingHorizontal: 15,
        paddingVertical: 12,
        marginBottom: 15,
        fontSize: 14,
        backgroundColor: '#F9F9F9',
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 10,
        paddingHorizontal: 15,
        marginBottom: 15,
        backgroundColor: '#F9F9F9',
    },
    rulesContainer: {
        marginBottom: 20,
        paddingLeft: 5,
    },
    ruleText: {
        fontSize: 12,
        marginBottom: 4,
    },
    photoContainer: {
        alignItems: 'center',
        marginVertical: 20,
        marginTop:heightPercentageToDP(5),
    },
    photoText: {
        fontSize: 13,
        color: '#555',
        marginTop: 5,
    },
    checkboxContainer: {
        backgroundColor: 'transparent',
        borderWidth: 0,
        marginLeft: 0,
        paddingLeft: 0,
        marginBottom: 25,
    },
    checkboxText: {
        fontSize: 13,
        color: '#555',
        fontWeight: 'normal',
    },
    continueButton: {
        backgroundColor: '#2CA6FF',
        paddingVertical: 16,
        borderRadius: 10,
        alignItems: 'center',
    },
    continueButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export const phoneStyle = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: "8%",
    left: 20,
    zIndex: 10,
  },
  logo: {
    width: responsiveWidth(22),
    height: responsiveHeight(22),
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    color: '#005c80',
    fontWeight: '600',
    marginBottom: responsiveHeight(1),
  },
  subtitle: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#f7f7f7',
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    borderColor: '#ddd',
    borderWidth: 1,
    marginBottom: 20,
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#7DC3E8',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },

});