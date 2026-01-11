import { useAlert } from '@/context/AlertContext';
import { useSettings } from '@/context/AppSettingsContext';
import { useAuth } from '@/context/AuthContext';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
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

export default function SecurityScreen() {
    const { user } = useAuth();
    const { showAlert } = useAlert();
    const router = useRouter();
    const { theme, t } = useSettings();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleUpdatePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            showAlert({
                title: t('alert_error'),
                message: t('password_fill_error'),
                type: 'error'
            });
            return;
        }
        if (newPassword !== confirmPassword) {
            showAlert({
                title: t('alert_error'),
                message: t('password_match_error'),
                type: 'error'
            });
            return;
        }
        if (newPassword.length < 8) {
            showAlert({
                title: t('alert_error'),
                message: t('password_length_error'),
                type: 'error'
            });
            return;
        }

        setLoading(true);
        // Artificial delay for feel
        await new Promise(resolve => setTimeout(resolve, 1500));
        setLoading(false);
        showAlert({
            title: t('alert_success'),
            message: t('password_success'),
            type: 'success',
            buttons: [{ text: 'OK', onPress: () => router.back() }]
        });
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.container, { backgroundColor: theme.background }]}
        >
            <Stack.Screen options={{ headerShown: false }} />
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <TouchableOpacity
                    style={[styles.backButton, { backgroundColor: theme.card }]}
                    onPress={() => router.back()}
                >
                    <Ionicons name="chevron-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>{t('security_title')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.lockContainer}>
                    <View style={[styles.lockIconOuter, { backgroundColor: `${theme.tint}10` }]}>
                        <View style={[styles.lockIconInner, { backgroundColor: `${theme.tint}15` }]}>
                            <FontAwesome name="lock" size={32} color={theme.tint} />
                            <View style={[styles.lockAlertBadge, { borderColor: theme.background }]}>
                                <Ionicons name="alert-circle" size={12} color="#FFF" />
                            </View>
                        </View>
                    </View>
                    <Text style={[styles.securityTitle, { color: theme.text }]}>{t('security_account_title')}</Text>
                    <Text style={[styles.securitySubtitle, { color: theme.textSecondary }]}>
                        {t('security_subtitle')}
                    </Text>
                </View>

                <View style={styles.form}>
                    <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t('password_section')}</Text>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.textSecondary }]}>{t('current_password')}</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: theme.card, borderColor: theme.border }]}>
                            <Ionicons name="lock-closed" size={18} color={theme.textSecondary} style={styles.inputIconLeft} />
                            <TextInput
                                style={[styles.input, { color: theme.text }]}
                                value={currentPassword}
                                onChangeText={setCurrentPassword}
                                secureTextEntry={!showCurrent}
                                placeholder={t('placeholder_password')}
                                placeholderTextColor={theme.textSecondary}
                            />
                            <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)}>
                                <Ionicons name={showCurrent ? "eye-off" : "eye"} size={20} color={theme.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.textSecondary }]}>{t('new_password')}</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: theme.card, borderColor: theme.border }]}>
                            <Ionicons name="key" size={18} color={theme.textSecondary} style={styles.inputIconLeft} />
                            <TextInput
                                style={[styles.input, { color: theme.text }]}
                                value={newPassword}
                                onChangeText={setNewPassword}
                                secureTextEntry={!showNew}
                                placeholder={t('placeholder_new_password')}
                                placeholderTextColor={theme.textSecondary}
                            />
                            <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                                <Ionicons name={showNew ? "eye-off" : "eye"} size={20} color={theme.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.textSecondary }]}>{t('confirm_password')}</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: theme.card, borderColor: theme.border }]}>
                            {confirmPassword.length > 0 && confirmPassword === newPassword ? (
                                <Ionicons name="checkmark-circle" size={18} color="#34C759" style={styles.inputIconLeft} />
                            ) : (
                                <Ionicons name="key-outline" size={18} color={theme.textSecondary} style={styles.inputIconLeft} />
                            )}
                            <TextInput
                                style={[styles.input, { color: theme.text }]}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry={!showConfirm}
                                placeholder={t('placeholder_confirm_password')}
                                placeholderTextColor={theme.textSecondary}
                            />
                            <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                                <Ionicons name={showConfirm ? "eye-off" : "eye"} size={20} color={theme.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.updateButton, loading && styles.disabledButton]}
                        onPress={handleUpdatePassword}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <>
                                <FontAwesome name="save" size={16} color="#FFF" style={{ marginRight: 10 }} />
                                <Text style={styles.updateButtonText}>{t('update_password_btn')}</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.forgotButton}>
                        <Text style={[styles.forgotText, { color: theme.textSecondary }]}>{t('forgot_password_btn')}</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#120D0A',
    },
    header: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingHorizontal: 20,
        paddingBottom: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#1E1915',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFF',
    },
    content: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    lockContainer: {
        alignItems: 'center',
        marginVertical: 40,
    },
    lockIconOuter: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255, 107, 0, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    lockIconInner: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(255, 107, 0, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    lockAlertBadge: {
        position: 'absolute',
        top: 20,
        right: 18,
        backgroundColor: '#FF6B00',
        width: 16,
        height: 16,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#120D0A',
    },
    securityTitle: {
        color: '#FFF',
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 10,
    },
    securitySubtitle: {
        color: '#8E8E93',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: 20,
    },
    form: {
        gap: 20,
    },
    sectionTitle: {
        color: '#8E8E93',
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1,
        marginBottom: 5,
    },
    inputGroup: {
        gap: 12,
    },
    label: {
        color: '#8E8E93',
        fontSize: 11,
        fontWeight: 'bold',
        marginLeft: 5,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E1915',
        height: 55,
        borderRadius: 18,
        paddingHorizontal: 15,
        borderWidth: 1,
        borderColor: '#2A221B',
    },
    inputIconLeft: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        color: '#FFF',
        fontSize: 15,
    },
    updateButton: {
        backgroundColor: '#FF6B00',
        height: 55,
        borderRadius: 18,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        shadowColor: '#FF6B00',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
    },
    disabledButton: {
        opacity: 0.7,
    },
    updateButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    forgotButton: {
        alignItems: 'center',
        marginTop: 5,
    },
    forgotText: {
        color: '#8E8E93',
        fontSize: 12,
    },
});
