import { StyleSheet, Dimensions} from "react-native";
const { width } = Dimensions.get('window');


export const styles = StyleSheet.create({
  modalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width,
    zIndex: 999,
    alignItems: 'center',
  },
  gradient: {
    width: width * 0.95,
    borderRadius: 18,
    marginTop: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 10,
    zIndex: 10,
    padding: 5,
  },
  closeText: {
    fontSize: 26,
    color: '#FF5A5A',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  body: {
    marginTop: 5,
    marginBottom: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  message: {
    fontSize: 16,
    top: 10,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
});
