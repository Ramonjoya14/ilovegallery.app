import { useAlert } from '@/context/AlertContext';
import { useSettings } from '@/context/AppSettingsContext';
import { auth } from '@/lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';


export default function RegisterScreen() {
    const router = useRouter();
    const { showAlert } = useAlert();
    const { t } = useSettings();
    const insets = useSafeAreaInsets();
    const [fullName, setFullName] = useState('');

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const [fullNameError, setFullNameError] = useState('');
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [confirmPasswordError, setConfirmPasswordError] = useState('');

    const handleRegister = async () => {
        setFullNameError('');
        setEmailError('');
        setPasswordError('');
        setConfirmPasswordError('');

        if (!fullName) {
            setFullNameError(t('error_input_name'));
            return;
        }
        if (!email) {
            setEmailError(t('error_input_email'));
            return;
        }
        if (!password) {
            setPasswordError(t('error_input_password'));
            return;
        }
        if (password.length < 8) {
            setPasswordError(t('error_pass_length'));
            return;
        }
        if (!/\d/.test(password)) {
            setPasswordError(t('error_pass_number'));
            return;
        }
        if (password !== confirmPassword) {
            setConfirmPasswordError(t('error_pass_match'));
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCredential.user, { displayName: fullName });

            // Send verification email
            try {
                const { sendEmailVerification } = await import('firebase/auth');
                await sendEmailVerification(userCredential.user);
            } catch (vError) {
                console.warn("Could not send verification email", vError);
            }

            showAlert({
                title: t('register_success'),
                message: t('register_success_verify'),
                type: 'success',
                buttons: [{ text: "OK", onPress: () => router.replace('/onboarding') }]
            });
        } catch (error: any) {
            console.error(error.code, error.message);
            const errorCode = error.code;
            if (errorCode === 'auth/email-already-in-use') {
                setEmailError(t('error_email_in_use'));
            } else if (errorCode === 'auth/invalid-email') {
                setEmailError(t('error_invalid_email_firebase'));
            } else if (errorCode === 'auth/weak-password') {
                setPasswordError(t('error_weak_password'));
            } else {
                showAlert({
                    title: 'Error',
                    message: t('error_register_generic') + ': ' + error.message,
                    type: 'error'
                });
            }
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}>

                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>

                    <View style={styles.content}>
                        <Text style={styles.title}>
                            {t('register_title_rev')}{'\n'}
                            <Text style={styles.titleHighlight}>{t('register_title_memories')}</Text>
                        </Text>
                        <Text style={styles.subtitle}>
                            {t('register_subtitle_new')}
                        </Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{t('label_full_name')}</Text>
                            <View style={[styles.inputWrapper, fullNameError ? styles.inputWrapperError : null]}>
                                <TextInput
                                    style={styles.input}
                                    placeholder={t('placeholder_full_name')}
                                    placeholderTextColor="#666"
                                    value={fullName}
                                    onChangeText={(text) => {
                                        setFullName(text);
                                        if (fullNameError) setFullNameError('');
                                    }}
                                />
                            </View>
                            {fullNameError ? (
                                <View style={styles.errorContainer}>
                                    <Ionicons name="alert-circle" size={14} color="#FF4B4B" />
                                    <Text style={styles.errorText}>{fullNameError}</Text>
                                </View>
                            ) : null}
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{t('label_email')}</Text>
                            <View style={[styles.inputWrapper, emailError ? styles.inputWrapperError : null]}>
                                <TextInput
                                    style={styles.input}
                                    placeholder={t('placeholder_email')}
                                    placeholderTextColor="#666"
                                    value={email}
                                    onChangeText={(text) => {
                                        setEmail(text);
                                        if (emailError) setEmailError('');
                                    }}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                />
                            </View>
                            {emailError ? (
                                <View style={styles.errorContainer}>
                                    <Ionicons name="alert-circle" size={14} color="#FF4B4B" />
                                    <Text style={styles.errorText}>{emailError}</Text>
                                </View>
                            ) : null}
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{t('label_password')}</Text>
                            <View style={[styles.inputWrapper, passwordError ? styles.inputWrapperError : null]}>
                                <TextInput
                                    style={styles.input}
                                    placeholder={t('placeholder_password_rules')}
                                    placeholderTextColor="#666"
                                    secureTextEntry={!showPassword}
                                    value={password}
                                    onChangeText={(text) => {
                                        setPassword(text);
                                        if (passwordError) setPasswordError('');
                                    }}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                    <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#8E8E93" />
                                </TouchableOpacity>
                            </View>
                            {passwordError ? (
                                <View style={styles.errorContainer}>
                                    <Ionicons name="alert-circle" size={14} color="#FF4B4B" />
                                    <Text style={styles.errorText}>{passwordError}</Text>
                                </View>
                            ) : null}
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{t('label_confirm_password')}</Text>
                            <View style={[styles.inputWrapper, confirmPasswordError ? styles.inputWrapperError : null]}>
                                <TextInput
                                    style={styles.input}
                                    placeholder={t('placeholder_password_rules')}
                                    placeholderTextColor="#666"
                                    secureTextEntry={!showPassword}
                                    value={confirmPassword}
                                    onChangeText={(text) => {
                                        setConfirmPassword(text);
                                        if (confirmPasswordError) setConfirmPasswordError('');
                                    }}
                                />
                            </View>
                            {confirmPasswordError ? (
                                <View style={styles.errorContainer}>
                                    <Ionicons name="alert-circle" size={14} color="#FF4B4B" />
                                    <Text style={styles.errorText}>{confirmPasswordError}</Text>
                                </View>
                            ) : null}
                        </View>

                        <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
                            <Text style={styles.registerButtonText}>{t('btn_create_account')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.loginLink}
                            onPress={() => router.push('/login')}
                        >
                            <Text style={styles.loginText}>
                                {t('login_prompt_already')}<Text style={styles.loginHighlight}>{t('login_link')}</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#120B05',
    },
    scrollContent: {
        paddingBottom: 40,
        paddingTop: 20,
    },
    backButton: {
        paddingHorizontal: 30,
        marginBottom: 20,
    },
    content: {
        paddingHorizontal: 30,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFF',
        lineHeight: 36,
        marginBottom: 5,
    },
    titleHighlight: {
        color: '#E67E22',
    },
    subtitle: {
        fontSize: 14,
        color: '#8E8E93',
        marginBottom: 30,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        color: '#8E8E93',
        marginBottom: 8,
        fontSize: 14,
    },
    inputWrapper: {
        backgroundColor: '#1C1611',
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 15,
        paddingHorizontal: 15,
        height: 55,
        borderWidth: 1,
        borderColor: '#2A1F16',
    },
    input: {
        flex: 1,
        color: '#FFF',
        fontSize: 16,
    },
    inputWrapperError: {
        borderColor: '#FF4B4B',
        backgroundColor: 'rgba(255, 75, 75, 0.05)',
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    errorText: {
        color: '#FF4B4B',
        fontSize: 12,
        marginLeft: 5,
    },
    registerButton: {
        backgroundColor: '#E67E22',
        alignItems: 'center',
        justifyContent: 'center',
        height: 60,
        borderRadius: 30,
        marginTop: 10,
        marginBottom: 30,
    },
    registerButtonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 30,
    },
    divider: {
        flex: 1,
        height: 1,
        backgroundColor: '#2A1F16',
    },
    dividerText: {
        color: '#8E8E93',
        marginHorizontal: 15,
        fontSize: 14,
    },
    socialButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 40,
    },
    socialButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1C1611',
        width: '48%',
        height: 55,
        borderRadius: 30,
        borderWidth: 1,
        borderColor: '#2A1F16',
    },
    socialButtonText: {
        color: '#FFF',
        marginLeft: 10,
        fontSize: 16,
        fontWeight: '600',
    },
    loginLink: {
        alignSelf: 'center',
    },
    loginText: {
        color: '#8E8E93',
        fontSize: 14,
    },
    loginHighlight: {
        color: '#E67E22',
        fontWeight: 'bold',
    }
});
