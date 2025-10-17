import  { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    LogBox,
    Image,
    Alert,
    StatusBar,
} from 'react-native';
import { Ionicons, AntDesign } from '@expo/vector-icons';
import { CheckBox } from 'react-native-elements';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { superForm as styles } from '../styles/styles';

LogBox.ignoreLogs([
    'TextElement: support for defaultProps will be removed',
]);

interface FormState {
    title: string;
    surname: string;
    firstName: string;
    middleName: string;
    phone: string;
    email: string;
    confirmEmail: string;
    password: string;
    confirmPassword: string;
}

async function phoneReturn(){
        const phone = await AsyncStorage.getItem("phone");
        return phone;
}
async function user(){
        const user = await AsyncStorage.getItem("user");
        return user;
}
const SuperAdminForm: React.FC = () => {
    const [profileImage, setProfileImage] = useState<string | null>(null);

    const [form, setForm] = useState<FormState>({
        title: '',
        surname: '',
        firstName: '',
        middleName: '',
        phone:'',
        email: '',
        confirmEmail: '',
        password: '',
        confirmPassword: '',
    });
    const [agree, setAgree] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const navigation = useNavigation<any>();
    const handleChange = (field: keyof FormState, value: string) => {
        setForm({ ...form, [field]: value });
    };

    const passwordValidation = {
        length: form.password.length >= 6,
        letter: /[A-Za-z]/.test(form.password),
        number: /[0-9]/.test(form.password),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(form.password),
    };

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

    const handleContinue = async () => {
        // Required fields check
        if (!form.title || !form.surname || !form.firstName || !form.email || !form.password) {
            alert('Please fill all required fields.');
            return;
        }
        // Email format check
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(form.email)) {
            alert('Please enter a valid email address.');
            return;
        }
        // Email match
        if (form.email !== form.confirmEmail) {
            alert('Emails do not match.');
            return;
        }
        // Password match
        if (form.password !== form.confirmPassword) {
            alert('Passwords do not match.');
            return;
        }
        // Password strength
        if (!passwordValidation.length || !passwordValidation.letter || !passwordValidation.number || !passwordValidation.special) {
            alert('Password must be at least 6 characters and include a letter, number, and special character.');
            return;
        }
        // Agreement
        if (!agree) {
            alert('You must agree to the terms.');
            return;
        }

        try {
            // TODO: Replace with actual backend call
            // Example:
            // const res = await api.addSuperAdmin({ ...form, phone: phoneNumber.phoneNumber });
            // if (res.data.ok) { ... }
            let phone = phoneReturn?.toString() || '';
            await AsyncStorage.setItem('user', JSON.stringify({
                title: form.title,
                firstName: form.firstName,
                middleName: form.middleName,
                surname: form.surname,
                phone: phone,
                email: form.email,
            }));
            navigation.navigate('MailOtp');
        } catch (err) {
            alert('Registration failed. Please try again.');
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
            <StatusBar hidden={true} />
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <AntDesign name="left" size={20} color="#9c9c9c" />
            </TouchableOpacity>

            <Image
                source={require('../../../assets/images-removebg-preview.png')}
                style={styles.logo}
            />

            <Text style={styles.header}>Welcome </Text>
            <Text style={styles.subtext}>Please complete your registration.</Text>

            <View style={styles.formGroup}>
                {[
                    { label: 'Title', key: 'title' },
                    { label: 'Surname', key: 'surname' },
                    { label: 'Firstname', key: 'firstName' },
                    { label: 'Middlename', key: 'middleName' },
                    { label: 'Email', key: 'email' },
                    { label: 'Confirm Email', key: 'confirmEmail' },
                ].map(({ label, key }) => (
                    <TextInput
                        key={key}
                        placeholder={label}
                        value={form[key as keyof FormState]}
                        onChangeText={(text) => handleChange(key as keyof FormState, text)}
                        style={styles.input}
                        keyboardType={label.toLowerCase().includes('email') ? 'email-address' : 'default'}
                        autoCapitalize="none"
                    />
                ))}


                <View style={styles.passwordContainer}>
                    <TextInput
                        placeholder="Password (Min. 6 characters)"
                        value={form.password}
                        onChangeText={(text) => handleChange('password', text)}
                        secureTextEntry={!showPassword}
                        style={[styles.input, { flex: 1, marginBottom: 0, borderWidth: 0 }]}
                        autoCapitalize="none"
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                        <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={24} color="grey" />
                    </TouchableOpacity>
                </View>

                <View style={styles.rulesContainer}>
                    <Text style={[styles.ruleText, { color: passwordValidation.length ? 'green' : 'red' }]}>• Minimum 6 characters</Text>
                    <Text style={[styles.ruleText, { color: passwordValidation.letter ? 'green' : 'red' }]}>• At least one letter</Text>
                    <Text style={[styles.ruleText, { color: passwordValidation.number ? 'green' : 'red' }]}>• At least one number</Text>
                    <Text style={[styles.ruleText, { color: passwordValidation.special ? 'green' : 'red' }]}>• At least one special character</Text>
                </View>

                <View style={styles.passwordContainer}>
                    <TextInput
                        placeholder="Confirm Password"
                        value={form.confirmPassword}
                        onChangeText={(text) => handleChange('confirmPassword', text)}
                        secureTextEntry={!showPassword}
                        style={[styles.input, { flex: 1, marginBottom: 0, borderWidth: 0 }]}
                        autoCapitalize="none"
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                        <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={24} color="grey" />
                    </TouchableOpacity>
                </View>

                <View style={styles.photoContainer}>
                    <TouchableOpacity onPress={pickImage}>
                        {profileImage ? (
                            <Image source={{ uri: profileImage }} style={styles.profileImage} />
                        ) : (
                            <Ionicons name="camera" size={50} color="#2CA6FF" />
                        )}
                    </TouchableOpacity>
                    <Text style={styles.photoText}>Upload Profile Picture</Text>
                </View>

                <CheckBox
                    checked={agree}
                    onPress={() => setAgree(!agree)}
                    containerStyle={styles.checkboxContainer}
                    checkedColor="#2CA6FF"
                    title={
                        <Text style={styles.checkboxText}>
                            I have read and agree to the <Text style={{ color: '#2CA6FF' }}>Privacy Policy & Terms of Use</Text>
                        </Text>
                    }
                />

                <TouchableOpacity
                    style={[styles.continueButton, { opacity: agree ? 1 : 0.6 }]}
                    disabled={!agree}
                    onPress={handleContinue}
                >
                    <Text style={styles.continueButtonText}>Continue</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

export default SuperAdminForm;

