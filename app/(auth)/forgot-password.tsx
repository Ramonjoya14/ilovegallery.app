import { useAlert } from '@/context/AlertContext';
import { useSettings } from '@/context/AppSettingsContext';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';



export default function ForgotPasswordScreen() {
    const router = useRouter();
    const { theme, t } = useSettings();
    const insets = useSafeAreaInsets();
    const { sendPasswordReset } = useAuth();
    const { showAlert } = useAlert();

    const [email, setEmail] = useState('');

    const [loading, setLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    const handleResetPassword = async () => {
        if (!email) {
            showAlert({
                title: t('alert_error'),
                message: t('error_input_email_forgot'),
                type: 'warning'
            });
            return;
        }

        setLoading(true);
        try {
            await sendPasswordReset(email);
            setEmailSent(true);
        } catch (error: any) {
            console.error(error);
            let message = t('error_send_email');
            if (error.code === 'auth/user-not-found') {
                message = t('error_user_not_found_forgot');
            } else if (error.code === 'auth/invalid-email') {
                message = t('error_invalid_email_firebase');
            }
            showAlert({
                title: t('alert_error'),
                message: message,
                type: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen options={{ headerShown: false }} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}>

                    <TouchableOpacity
                        style={[styles.backButton, { backgroundColor: theme.card }]}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="arrow-back" size={24} color={theme.text} />
                    </TouchableOpacity>

                    <View style={styles.content}>
                        <View style={styles.headerIcon}>
                            <View style={[styles.iconCircle, { backgroundColor: theme.tint + '15' }]}>
                                <Ionicons name="key-outline" size={40} color={theme.tint} />
                            </View>
                        </View>

                        <Text style={[styles.title, { color: theme.text }]}>
                            {emailSent ? t('forgot_pass_sent_title') : t('forgot_pass_title')}
                        </Text>
                        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                            {emailSent
                                ? t('forgot_pass_sent_subtitle', { email })
                                : t('forgot_pass_subtitle')}
                        </Text>

                        {!emailSent ? (
                            <>
                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, { color: theme.textSecondary }]}>{t('label_email')}</Text>
                                    <View style={[styles.inputWrapper, { backgroundColor: theme.card, borderColor: theme.border }]}>
                                        <Ionicons name="mail-outline" size={20} color={theme.textSecondary} style={{ marginRight: 10 }} />
                                        <TextInput
                                            style={[styles.input, { color: theme.text }]}
                                            placeholder={t('placeholder_email')}
                                            placeholderTextColor={theme.textSecondary}
                                            value={email}
                                            onChangeText={setEmail}
                                            autoCapitalize="none"
                                            keyboardType="email-address"
                                        />
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={[styles.resetButton, { backgroundColor: theme.tint }]}
                                    onPress={handleResetPassword}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#FFF" />
                                    ) : (
                                        <Text style={styles.resetButtonText}>{t('btn_send_instructions')}</Text>
                                    )}
                                </TouchableOpacity>
                            </>
                        ) : (
                            <View style={styles.successContainer}>
                                <View style={[styles.successBadge, { backgroundColor: '#34C75920' }]}>
                                    <Ionicons name="checkmark-done-circle" size={24} color="#34C759" />
                                    <Text style={[styles.successBadgeText, { color: '#34C759' }]}>Enlace enviado con éxito</Text>
                                </View>
                                <Text style={[styles.successInstruction, { color: theme.textSecondary }]}>
                                    Por favor, revisa tu bandeja de entrada (y la de promociones/spam) y sigue las instrucciones para recuperar tu acceso.
                                </Text>
                                <TouchableOpacity
                                    style={[styles.resetButton, { backgroundColor: theme.tint }]}
                                    onPress={() => router.back()}
                                >
                                    <Text style={styles.resetButtonText}>{t('btn_back_to_login')}</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        <TouchableOpacity
                            style={styles.cancelLink}
                            onPress={() => router.back()}
                            disabled={loading}
                        >
                            <Text style={[styles.cancelText, { color: theme.textSecondary }]}>
                                {emailSent ? t('try_again_link') : t('cancel_link')}
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
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 40,
        paddingTop: 20,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 25,
        marginBottom: 30,
    },
    content: {
        paddingHorizontal: 30,
        alignItems: 'center',
    },
    headerIcon: {
        marginBottom: 30,
    },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 15,
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: 10,
        marginBottom: 40,
    },
    inputGroup: {
        width: '100%',
        marginBottom: 25,
    },
    label: {
        marginBottom: 10,
        fontSize: 14,
        fontWeight: '600',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 18,
        paddingHorizontal: 15,
        height: 60,
        borderWidth: 1,
    },
    input: {
        flex: 1,
        fontSize: 16,
    },
    resetButton: {
        width: '100%',
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    resetButtonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    cancelLink: {
        marginTop: 25,
    },
    cancelText: {
        fontSize: 14,
        fontWeight: '500',
    },
    successContainer: {
        width: '100%',
        alignItems: 'center',
    },
    successBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 15,
        gap: 10,
        marginBottom: 20,
    },
    successBadgeText: {
        fontSize: 14,
        fontWeight: '700',
    },
    successInstruction: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 30,
        paddingHorizontal: 10,
    },
});
