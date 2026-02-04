import { useSettings } from '@/context/AppSettingsContext';
import { auth } from '@/lib/firebase';
import { databaseService } from '@/services/database';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { GoogleAuthProvider, OAuthProvider, signInWithCredential, signInWithEmailAndPassword } from 'firebase/auth';
import React, { useState } from 'react';
import { ActivityIndicator, ImageBackground, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';


export default function LoginScreen() {
    const router = useRouter();
    const { t } = useSettings();
    // const { signInAnon } = useAuth(); // Removed unused import
    const insets = useSafeAreaInsets();
    const [email, setEmail] = useState('');

    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    // const [isGuestLoading, setIsGuestLoading] = useState(false); // Removed unused state

    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');

    React.useEffect(() => {
        GoogleSignin.configure({
            webClientId: '402998744302-4m2nks2act8ec7i1q7crvd2ishcpip01.apps.googleusercontent.com',
        });
    }, []);

    const handleGoogleLogin = async () => {
        try {
            setLoading(true);
            await GoogleSignin.hasPlayServices();
            const userInfo = await GoogleSignin.signIn();
            const idToken = userInfo.data?.idToken;
            if (!idToken) {
                throw new Error('No ID token found');
            }

            const credential = GoogleAuthProvider.credential(idToken);
            const userCredential = await signInWithCredential(auth, credential);
            const user = userCredential.user;

            const isNewUser = (userCredential as any)._tokenResponse?.isNewUser ||
                user.metadata.creationTime === user.metadata.lastSignInTime;

            if (isNewUser) {
                await databaseService.updateUserProfile(user.uid, {
                    email: user.email,
                    displayName: user.displayName || userInfo.data?.user.name,
                    photoURL: user.photoURL || userInfo.data?.user.photo,
                    createdAt: new Date(),
                    authProvider: 'google'
                });

                router.replace('/onboarding');
            } else {
                router.replace('/(tabs)');
            }

        } catch (error: any) {
            console.error(error);
            if (error.code === '4') {
                setLoading(false);
                return;
            }
            alert(t('error_login_generic') + ': ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAppleLogin = async () => {
        try {
            setLoading(true);
            const isAvailable = await AppleAuthentication.isAvailableAsync();
            if (!isAvailable) {
                alert(t('error_apple_not_available') || 'Apple Sign In is not available on this device');
                return;
            }

            const credential = await AppleAuthentication.signInAsync({
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
            });

            const { identityToken, email: appleEmail, fullName } = credential;

            if (!identityToken) {
                throw new Error('No Identity Token');
            }

            const provider = new OAuthProvider('apple.com');
            const oAuthCredential = provider.credential({
                idToken: identityToken,
            });

            const userCredential = await signInWithCredential(auth, oAuthCredential);
            const user = userCredential.user;

            const isNewUser = (userCredential as any)._tokenResponse?.isNewUser ||
                user.metadata.creationTime === user.metadata.lastSignInTime;

            if (isNewUser) {
                // Apple only returns name on first login
                const name = fullName?.givenName ? `${fullName.givenName} ${fullName.familyName || ''}`.trim() : null;

                await databaseService.updateUserProfile(user.uid, {
                    email: user.email || appleEmail,
                    displayName: user.displayName || name || 'Apple User',
                    photoURL: user.photoURL || null,
                    createdAt: new Date(),
                    authProvider: 'apple'
                });

                router.replace('/onboarding');
            } else {
                router.replace('/(tabs)');
            }

        } catch (e: any) {
            console.error(e);
            if (e.code === 'ERR_CANCELED') {
                // User canceled
            } else {
                // alert(t('error_login_generic') + ': ' + e.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async () => {
        setEmailError('');
        setPasswordError('');

        if (!email) {
            setEmailError(t('error_email_required'));
            return;
        }
        if (!password) {
            setPasswordError(t('error_password_required'));
            return;
        }

        setLoading(true);
        try {
            let loginEmail = email.trim();

            // Support Login with Username
            if (!loginEmail.includes('@')) {
                const userProfile: any = await databaseService.getUserByUsername(loginEmail);
                if (userProfile && userProfile.email) {
                    loginEmail = userProfile.email;
                } else {
                    setEmailError(t('error_user_not_found'));
                    setLoading(false);
                    return;
                }
            }

            await signInWithEmailAndPassword(auth, loginEmail, password);
            router.replace('/(tabs)');
        } catch (error: any) {
            console.error(error.code, error.message);
            const errorCode = error.code;

            if (errorCode === 'auth/invalid-email') {
                setEmailError(t('error_invalid_email_firebase'));
            } else if (errorCode === 'auth/user-not-found') {
                setEmailError(t('error_email_not_registered'));
            } else if (errorCode === 'auth/wrong-password') {
                setPasswordError(t('error_wrong_password'));
            } else if (errorCode === 'auth/invalid-credential') {
                setPasswordError(t('error_invalid_credentials'));
            } else {
                alert(t('error_login_generic') + ': ' + error.message);
            }
        } finally {
            setLoading(false);
        }
    };
    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <Stack.Screen options={{ headerShown: false }} />

                <ScrollView
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.headerImageContainer}>
                        <ImageBackground
                            source={{ uri: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1000' }}
                            style={styles.headerImage}
                        >
                            <LinearGradient
                                colors={['transparent', '#120B05']}
                                style={styles.gradient}
                            />
                        </ImageBackground>
                        <View style={styles.logoContainer}>
                            <View style={styles.logoInner}>
                                <Ionicons name="camera" size={30} color="#FFF" />
                            </View>
                        </View>
                    </View>

                    <View style={styles.content}>
                        <Text style={styles.title}>{t('login_title')}</Text>
                        <Text style={styles.subtitle}>{t('login_subtitle')}</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{t('label_email_username')}</Text>
                            <View style={[styles.inputWrapper, emailError ? styles.inputWrapperError : null]}>
                                <FontAwesome5 name="user" size={18} color={emailError ? "#FF4B4B" : "#8E8E93"} style={styles.inputIcon} />
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
                                <FontAwesome5 name="lock" size={18} color={passwordError ? "#FF4B4B" : "#8E8E93"} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { flex: 1 }]}
                                    placeholder={t('placeholder_password')}
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

                        <TouchableOpacity
                            style={styles.forgotPassword}
                            onPress={() => router.push('/forgot-password')}
                        >
                            <Text style={styles.forgotPasswordText}>{t('forgot_password_link')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.loginButton, loading && { opacity: 0.7 }]}
                            onPress={handleLogin}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <>
                                    <Text style={styles.loginButtonText}>{t('btn_login')}</Text>
                                    <Ionicons name="arrow-forward" size={20} color="#FFF" />
                                </>
                            )}
                        </TouchableOpacity>

                        <View style={styles.dividerContainer}>
                            <View style={styles.divider} />
                            <Text style={styles.dividerText}>O</Text>
                            <View style={styles.divider} />
                        </View>

                        <View style={styles.socialButtons}>
                            <TouchableOpacity style={styles.socialButton} onPress={handleGoogleLogin} disabled={loading}>
                                <FontAwesome5 name="google" size={20} color="#FFF" />
                                <Text style={styles.socialButtonText}>{t('btn_google')}</Text>
                            </TouchableOpacity>

                            {Platform.OS === 'ios' && (
                                <TouchableOpacity
                                    style={[styles.socialButton, { marginTop: 15, backgroundColor: '#FFF', borderColor: '#FFF' }]}
                                    onPress={handleAppleLogin}
                                    disabled={loading}
                                >
                                    <FontAwesome5 name="apple" size={22} color="#000" />
                                    <Text style={[styles.socialButtonText, { color: '#000' }]}>{t('btn_apple') || 'Sign in with Apple'}</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <TouchableOpacity
                            style={styles.guestButton}
                            onPress={() => {
                                router.replace('/(tabs)');
                            }}
                            disabled={loading}
                        >
                            <Text style={styles.guestButtonText}>{t('btn_guest')}</Text>
                            <Ionicons name="chevron-forward" size={16} color="#E67E22" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.registerLink}
                            onPress={() => router.push('/register')}
                        >
                            <Text style={styles.registerText}>
                                {t('register_prompt')}<Text style={styles.registerHighlight}>{t('register_link')}</Text>
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
    },
    headerImageContainer: {
        height: 300,
        width: '100%',
    },
    headerImage: {
        flex: 1,
    },
    gradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: '100%',
    },
    logoContainer: {
        position: 'absolute',
        bottom: 30,
        alignSelf: 'center',
        backgroundColor: '#E67E22',
        padding: 15,
        borderRadius: 40,
        borderWidth: 4,
        borderColor: 'rgba(230, 126, 34, 0.3)',
    },
    logoInner: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        paddingHorizontal: 30,
        marginTop: -20,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFF',
        textAlign: 'center',
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 16,
        color: '#8E8E93',
        textAlign: 'center',
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
    inputIcon: {
        marginRight: 10,
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
    forgotPassword: {
        alignSelf: 'flex-end',
        marginBottom: 30,
    },
    forgotPasswordText: {
        color: '#E67E22',
        fontSize: 14,
        fontWeight: '600',
    },
    loginButton: {
        backgroundColor: '#E67E22',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 60,
        borderRadius: 30,
        marginBottom: 30,
        shadowColor: '#E67E22',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8,
    },
    loginButtonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
        marginRight: 10,
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
        flexDirection: 'column',
        justifyContent: 'center',
        marginBottom: 40,
    },
    socialButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1C1611',
        width: '100%',
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
    registerLink: {
        alignSelf: 'center',
    },
    registerText: {
        color: '#8E8E93',
        fontSize: 14,
    },
    registerHighlight: {
        color: '#FFF',
        fontWeight: 'bold',
    },
    guestButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 30,
        paddingVertical: 10,
    },
    guestButtonText: {
        color: '#E67E22',
        fontSize: 16,
        fontWeight: '600',
        marginRight: 5,
    },
});
