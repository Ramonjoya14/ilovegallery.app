import SupportModals from '@/components/SupportModals';
import { Text } from '@/components/Themed';
import { useAlert } from '@/context/AlertContext';
import { useSettings } from '@/context/AppSettingsContext';
import { useAuth } from '@/context/AuthContext';
import { databaseService, Event as EventType } from '@/services/database';
import { FontAwesome } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Modal, Platform, Image as RNImage, ScrollView, StyleSheet, Switch, TextInput, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
    const { theme, isDark, toggleTheme, language, setLanguage, t, autoSaveToGallery, setAutoSaveToGallery, notificationsEnabled, setNotificationsEnabled } = useSettings();
    const { showAlert } = useAlert();
    const { user, loading, logout, deleteAccount, sendVerificationEmail, refreshUser } = useAuth();
    const router = useRouter();
    const [stats, setStats] = useState({ events: 0, photos: 0, rolls: 0 });
    const [username, setUsername] = useState<string | null>(null);
    const [supportModal, setSupportModal] = useState<{ visible: boolean, type: 'privacy' | 'about' }>({ visible: false, type: 'privacy' });
    const [isDeleting, setIsDeleting] = useState(false);
    const [isReauthVisible, setIsReauthVisible] = useState(false);
    const [reauthPassword, setReauthPassword] = useState('');
    const [isReauthenticating, setIsReauthenticating] = useState(false);
    const { reauthenticate } = useAuth();

    useEffect(() => {
        if (user && !user.isAnonymous) {
            fetchUserStats();
            fetchUserProfile();
        }
    }, [user]);

    useFocusEffect(
        React.useCallback(() => {
            if (user && !user.isAnonymous) {
                refreshUser();
            }
        }, [user])
    );

    const fetchUserProfile = async () => {
        if (!user) return;
        try {
            const profile = await databaseService.getUserProfile(user.uid);
            if (profile && profile.username) {
                setUsername(profile.username);
            }
        } catch (error) {
            console.error("Error fetching user profile:", error);
        }
    };

    const fetchUserStats = async () => {
        try {
            const userEvents = await databaseService.getEvents(user?.uid as string);
            const totalPhotos = userEvents.reduce((sum: number, e: EventType) => sum + (e.photoCount || 0), 0);
            const completedRolls = userEvents.filter(e => e.status === 'expired' && (e.photoCount || 0) >= (e.maxPhotos || 24)).length;

            setStats({
                events: userEvents.length,
                photos: totalPhotos,
                rolls: completedRolls,
            });
        } catch (error) {
            console.error("Error fetching user stats:", error);
        }
    };

    const handleDeleteAccount = async () => {
        const confirmMsg = t('delete_account_confirm');
        const finalMsg = t('delete_account_final_confirm');

        const proceedWithDeletion = async () => {
            try {
                setIsDeleting(true);
                await deleteAccount();
                showAlert({
                    title: t('alert_success'),
                    message: t('delete_account_success'),
                    type: 'success'
                });
            } catch (error: any) {
                console.log("[Profile] Delete error:", error.message);
                if (error.message === 'REAUTH_NEEDED') {
                    setIsReauthVisible(true);
                } else {
                    showAlert({
                        title: t('alert_error'),
                        message: error.message,
                        type: 'error'
                    });
                }
            } finally {
                setIsDeleting(false);
            }
        };

        // Show confirmation alert
        showAlert({
            title: t('delete_account'),
            message: confirmMsg,
            type: 'warning',
            buttons: [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('action_delete'),
                    style: 'destructive',
                    onPress: () => {
                        showAlert({
                            title: t('delete_account'),
                            message: finalMsg,
                            type: 'error',
                            buttons: [
                                { text: t('cancel'), style: 'cancel' },
                                {
                                    text: t('action_delete'),
                                    style: 'destructive',
                                    onPress: proceedWithDeletion
                                }
                            ]
                        });
                    }
                }
            ]
        });
    };

    const handleReauthAndRetry = async () => {
        if (!reauthPassword) return;
        try {
            setIsReauthenticating(true);
            await reauthenticate(reauthPassword);
            setIsReauthVisible(false);
            setReauthPassword('');
            // Now retry deletion
            try {
                setIsDeleting(true);
                await deleteAccount();
                showAlert({
                    title: t('alert_success'),
                    message: t('delete_account_success'),
                    type: 'success'
                });
            } catch (error: any) {
                showAlert({
                    title: t('alert_error'),
                    message: error.message,
                    type: 'error'
                });
            } finally {
                setIsDeleting(false);
            }
        } catch (error: any) {
            console.error("[Profile] Reauth error:", error);
            showAlert({
                title: t('alert_error'),
                message: t('reauth_error'),
                type: 'error'
            });
        } finally {
            setIsReauthenticating(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={theme.tint} />
            </View>
        );
    }

    const isAnonymous = !user || user.isAnonymous;

    if (isAnonymous) {
        return (
            <View style={[styles.container, { backgroundColor: theme.background }]}>
                <View style={styles.header}>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>{t('profile_title')}</Text>
                </View>

                <View style={styles.anonymousContent}>
                    <View style={[styles.anonIconContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <FontAwesome name="user-circle-o" size={80} color={theme.textSecondary} />
                    </View>
                    <Text style={[styles.anonTitle, { color: theme.text }]}>{t('welcome_title')}</Text>
                    <Text style={[styles.anonSubtitle, { color: theme.textSecondary }]}>
                        {t('welcome_subtitle')}
                    </Text>

                    <TouchableOpacity
                        style={styles.loginButtonLarge}
                        onPress={() => router.push('/(auth)/login')}
                    >
                        <Text style={styles.loginButtonText}>{t('login_title')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.registerButtonOutline, { borderColor: theme.border }]}
                        onPress={() => router.push('/(auth)/register')}
                    >
                        <Text style={[styles.registerButtonOutlineText, { color: theme.text }]}>{t('register_link')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.card }]} onPress={() => router.back()}>
                    <FontAwesome name="chevron-left" size={14} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>{t('profile_title')}</Text>
                <TouchableOpacity onPress={() => router.push('/profile/personal-info')}>
                    <Text style={styles.editText}>{t('edit')}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Profile Info */}
                <View style={styles.profileHeader}>
                    <View style={styles.avatarWrapper}>
                        <View style={[styles.avatarCircle, { backgroundColor: theme.card, borderColor: theme.border }]}>
                            {user.photoURL ? (
                                <RNImage source={{ uri: user.photoURL }} style={styles.avatarImage} />
                            ) : (
                                <FontAwesome name="user" size={40} color={theme.textSecondary} />
                            )}
                        </View>
                        <View style={[styles.badgeContainer, { borderColor: theme.background }]}>
                            <FontAwesome name="shield" size={12} color="#FFF" />
                        </View>
                    </View>
                    <Text style={[styles.userName, { color: theme.text }]}>{user.displayName || t('user_placeholder')}</Text>
                    <View style={styles.handleContainer}>
                        <Text style={[styles.userHandle, { color: theme.textSecondary }]}>
                            {username ? `@${username}` : user.email}
                        </Text>
                        {!user.emailVerified && (
                            <View style={[styles.unverifiedBadge, { backgroundColor: theme.error + '20' }]}>
                                <FontAwesome name="exclamation-circle" size={10} color={theme.error} />
                                <Text style={[styles.unverifiedText, { color: theme.error }]}>{t('unverified')}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {!user.emailVerified && (
                    <TouchableOpacity
                        style={[styles.verificationBanner, { backgroundColor: theme.tint + '10', borderColor: theme.tint + '30' }]}
                        onPress={async () => {
                            try {
                                await sendVerificationEmail();
                                showAlert({
                                    title: t('alert_success'),
                                    message: t('verification_email_sent'),
                                    type: 'success'
                                });
                            } catch (error: any) {
                                showAlert({
                                    title: t('alert_error'),
                                    message: error.message,
                                    type: 'error'
                                });
                            }
                        }}
                    >
                        <View style={[styles.verificationIcon, { backgroundColor: theme.tint }]}>
                            <FontAwesome name="envelope" size={14} color="#FFF" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.verificationTitle, { color: theme.text }]}>{t('verify_email_title')}</Text>
                            <Text style={[styles.verificationSubtitle, { color: theme.textSecondary }]}>{t('verify_email_subtitle')}</Text>
                        </View>
                        <FontAwesome name="chevron-right" size={12} color={theme.textSecondary} />
                    </TouchableOpacity>
                )}

                {/* Stats Row */}
                <View style={styles.statsRow}>
                    <View style={[styles.statBox, { backgroundColor: theme.card }]}>
                        <Text style={[styles.statValue, { color: theme.text }]}>{stats.events}</Text>
                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{t('stats_events')}</Text>
                    </View>
                    <View style={[styles.statBox, { backgroundColor: theme.card }]}>
                        <Text style={[styles.statValue, { color: theme.text }]}>{stats.photos}</Text>
                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{t('stats_photos')}</Text>
                    </View>
                    <View style={[styles.statBox, { backgroundColor: theme.card }]}>
                        <Text style={[styles.statValue, { color: theme.text }]}>{stats.rolls}</Text>
                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{t('stats_rolls')}</Text>
                    </View>
                </View>

                {/* Sections */}
                <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>{t('account')}</Text>
                <View style={[styles.listContainer, { backgroundColor: theme.card }]}>
                    <TouchableOpacity
                        style={styles.listItem}
                        onPress={() => router.push('/profile/personal-info')}
                    >
                        <View style={[styles.iconBg, { backgroundColor: 'rgba(74, 144, 226, 0.1)' }]}>
                            <FontAwesome name="user" size={14} color="#4A90E2" />
                        </View>
                        <Text style={[styles.listItemText, { color: theme.text }]}>{t('profile_info')}</Text>
                        <FontAwesome name="chevron-right" size={12} color={theme.textSecondary} />
                    </TouchableOpacity>
                    <View style={[styles.divider, { backgroundColor: theme.border }]} />
                    <TouchableOpacity
                        style={styles.listItem}
                        onPress={() => router.push('/profile/security')}
                    >
                        <View style={[styles.iconBg, { backgroundColor: 'rgba(52, 199, 89, 0.1)' }]}>
                            <FontAwesome name="lock" size={14} color="#34C759" />
                        </View>
                        <Text style={[styles.listItemText, { color: theme.text }]}>{t('security')}</Text>
                        <FontAwesome name="chevron-right" size={12} color={theme.textSecondary} />
                    </TouchableOpacity>
                </View>

                <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>{t('preferences')}</Text>
                <View style={[styles.listContainer, { backgroundColor: theme.card }]}>
                    <View style={styles.listItem}>
                        <View style={[styles.iconBg, { backgroundColor: 'rgba(255, 159, 10, 0.1)' }]}>
                            <FontAwesome name="bell" size={14} color="#FF6B00" />
                        </View>
                        <Text style={[styles.listItemText, { color: theme.text }]}>{t('notifications')}</Text>
                        <Switch
                            value={notificationsEnabled}
                            onValueChange={setNotificationsEnabled}
                            trackColor={{ false: theme.border, true: theme.tint }}
                            thumbColor="#FFF"
                        />
                    </View>
                    <View style={[styles.divider, { backgroundColor: theme.border }]} />
                    <View style={styles.listItem}>
                        <View style={[styles.iconBg, { backgroundColor: 'rgba(175, 82, 222, 0.1)' }]}>
                            <FontAwesome name="download" size={14} color="#AF52DE" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.listItemText, { color: theme.text }]}>{t('save_roll')}</Text>
                            <Text style={styles.listSubText}>{t('auto')}</Text>
                        </View>
                        <Switch
                            value={autoSaveToGallery}
                            onValueChange={setAutoSaveToGallery}
                            trackColor={{ false: theme.border, true: theme.tint }}
                            thumbColor="#FFF"
                        />
                    </View>
                    <View style={[styles.divider, { backgroundColor: theme.border }]} />

                    {/* Dark Mode Toggle */}
                    <View style={styles.listItem}>
                        <View style={[styles.iconBg, { backgroundColor: 'rgba(0, 0, 0, 0.1)' }]}>
                            <FontAwesome name="moon-o" size={14} color={isDark ? theme.tint : theme.textSecondary} />
                        </View>
                        <Text style={[styles.listItemText, { color: theme.text }]}>{t('dark_mode')}</Text>
                        <Switch
                            value={isDark}
                            onValueChange={toggleTheme}
                            trackColor={{ false: '#D1D1D6', true: theme.tint }}
                            thumbColor="#FFF"
                        />
                    </View>

                    <View style={[styles.divider, { backgroundColor: theme.border }]} />

                    {/* Language Switcher */}
                    <TouchableOpacity
                        style={styles.listItem}
                        onPress={() => setLanguage(language === 'es' ? 'en' : 'es')}
                    >
                        <View style={[styles.iconBg, { backgroundColor: 'rgba(92, 199, 89, 0.1)' }]}>
                            <FontAwesome name="globe" size={14} color="#4CD964" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.listItemText, { color: theme.text }]}>{t('language')}</Text>
                            <Text style={styles.listSubText}>{language === 'es' ? 'Español' : 'English'}</Text>
                        </View>
                        <FontAwesome name="refresh" size={14} color={theme.textSecondary} />
                    </TouchableOpacity>
                </View>

                <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>{t('support_section')}</Text>
                <View style={[styles.listContainer, { backgroundColor: theme.card }]}>
                    <TouchableOpacity
                        style={styles.listItem}
                        onPress={() => setSupportModal({ visible: true, type: 'privacy' })}
                    >
                        <View style={[styles.iconBg, { backgroundColor: 'rgba(0, 122, 255, 0.1)' }]}>
                            <FontAwesome name="file-text-o" size={14} color="#007AFF" />
                        </View>
                        <Text style={[styles.listItemText, { color: theme.text }]}>{t('privacy_policy')}</Text>
                        <FontAwesome name="chevron-right" size={12} color={theme.textSecondary} />
                    </TouchableOpacity>
                    <View style={[styles.divider, { backgroundColor: theme.border }]} />
                    <TouchableOpacity
                        style={styles.listItem}
                        onPress={() => setSupportModal({ visible: true, type: 'about' })}
                    >
                        <View style={[styles.iconBg, { backgroundColor: 'rgba(255, 149, 0, 0.1)' }]}>
                            <FontAwesome name="info-circle" size={14} color="#FF9500" />
                        </View>
                        <Text style={[styles.listItemText, { color: theme.text }]}>{t('about_us')}</Text>
                        <FontAwesome name="chevron-right" size={12} color={theme.textSecondary} />
                    </TouchableOpacity>
                    <View style={[styles.divider, { backgroundColor: theme.border }]} />
                    <TouchableOpacity
                        style={styles.listItem}
                        onPress={handleDeleteAccount}
                        disabled={isDeleting}
                    >
                        <View style={[styles.iconBg, { backgroundColor: 'rgba(255, 59, 48, 0.1)' }]}>
                            <FontAwesome name="user-times" size={14} color="#FF3B30" />
                        </View>
                        <Text style={[styles.listItemText, { color: '#FF3B30' }]}>{t('delete_account')}</Text>
                        <FontAwesome name="chevron-right" size={12} color={theme.textSecondary} />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={[styles.logoutButton, { backgroundColor: theme.card }]}
                    onPress={logout}
                >
                    <FontAwesome name="sign-out" size={18} color="#FF3B30" />
                    <Text style={styles.logoutButtonText}>{t('logout')}</Text>
                </TouchableOpacity>

                <View style={{ height: 100 }} />
            </ScrollView>

            <SupportModals
                isVisible={supportModal.visible}
                onClose={() => setSupportModal({ ...supportModal, visible: false })}
                type={supportModal.type}
            />

            {/* Re-auth Modal */}
            <Modal
                visible={isReauthVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setIsReauthVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.reauthContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <View style={[styles.reauthIcon, { backgroundColor: theme.tint + '15' }]}>
                            <FontAwesome name="lock" size={30} color={theme.tint} />
                        </View>
                        <Text style={[styles.reauthTitle, { color: theme.text }]}>{t('reauth_title')}</Text>
                        <Text style={[styles.reauthSubtitle, { color: theme.textSecondary }]}>
                            {t('reauth_required')}
                        </Text>

                        <View style={[styles.reauthInputWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
                            <TextInput
                                style={[styles.reauthInput, { color: theme.text }]}
                                placeholder={t('reauth_placeholder')}
                                placeholderTextColor={theme.textSecondary}
                                secureTextEntry
                                value={reauthPassword}
                                onChangeText={setReauthPassword}
                                autoFocus
                            />
                        </View>

                        <View style={styles.reauthButtons}>
                            <TouchableOpacity
                                style={[styles.reauthButton, styles.cancelButton, { borderColor: theme.border }]}
                                onPress={() => {
                                    setIsReauthVisible(false);
                                    setReauthPassword('');
                                }}
                            >
                                <Text style={[styles.reauthButtonText, { color: theme.textSecondary }]}>{t('cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.reauthButton, styles.confirmButton, { backgroundColor: theme.error }]}
                                onPress={handleReauthAndRetry}
                                disabled={isReauthenticating || !reauthPassword}
                            >
                                {isReauthenticating ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <Text style={[styles.reauthButtonText, { color: '#FFF' }]}>{t('reauth_btn')}</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        // backgroundColor handled by theme.background in component
    },
    header: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingHorizontal: 20,
        paddingBottom: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFF',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#1E1915',
        justifyContent: 'center',
        alignItems: 'center',
    },
    editText: {
        color: '#FF6B00',
        fontWeight: 'bold',
        fontSize: 14,
    },
    content: {
        paddingHorizontal: 20,
    },
    profileHeader: {
        alignItems: 'center',
        marginVertical: 20,
    },
    avatarWrapper: {
        position: 'relative',
        marginBottom: 15,
    },
    avatarCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#1E1915',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#2A221B',
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 50,
    },
    badgeContainer: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#FF6B00',
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#120D0A',
    },
    userName: {
        color: '#FFF',
        fontSize: 24,
        fontWeight: 'bold',
    },
    userHandle: {
        color: '#8E8E93',
        fontSize: 14,
        marginTop: 4,
    },
    handleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 8,
    },
    unverifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        gap: 4,
        backgroundColor: 'rgba(255, 75, 75, 0.1)',
    },
    unverifiedText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#FF4B4B',
    },
    verificationBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 20,
    },
    verificationIcon: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    verificationTitle: {
        fontSize: 15,
        fontWeight: 'bold',
    },
    verificationSubtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30,
        marginTop: 10,
    },
    statBox: {
        flex: 1,
        backgroundColor: '#1E1915',
        borderRadius: 20,
        paddingVertical: 15,
        alignItems: 'center',
        marginHorizontal: 5,
    },
    statValue: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: 'bold',
    },
    statLabel: {
        color: '#8E8E93',
        fontSize: 12,
        marginTop: 2,
    },
    sectionHeader: {
        color: '#8E8E93',
        fontSize: 11,
        fontWeight: 'bold',
        letterSpacing: 1,
        marginBottom: 15,
        marginTop: 10,
    },
    listContainer: {
        backgroundColor: '#1E1915',
        borderRadius: 25,
        paddingHorizontal: 15,
        marginBottom: 20,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
    },
    iconBg: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    listItemText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '500',
        flex: 1,
    },
    listSubText: {
        color: '#FF6B00',
        fontSize: 11,
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: '#2A221B',
        marginLeft: 50,
    },
    anonymousContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    anonIconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#1E1915',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 2,
        borderColor: '#2A221B',
    },
    anonTitle: {
        color: '#FFF',
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 10,
    },
    anonSubtitle: {
        color: '#8E8E93',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 40,
        lineHeight: 22,
    },
    loginButtonLarge: {
        backgroundColor: '#FF6B00',
        width: '100%',
        height: 55,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    loginButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    registerButtonOutline: {
        borderWidth: 1,
        borderColor: '#2A221B',
        width: '100%',
        height: 55,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    registerButtonOutlineText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        paddingVertical: 15,
        backgroundColor: '#1E1915',
        borderRadius: 20,
    },
    logoutButtonText: {
        color: '#FF3B30',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 10,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    reauthContainer: {
        width: '100%',
        maxWidth: 340,
        borderRadius: 30,
        borderWidth: 1,
        padding: 25,
        alignItems: 'center',
    },
    reauthIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    reauthTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    reauthSubtitle: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 20,
    },
    reauthInputWrapper: {
        width: '100%',
        height: 55,
        borderRadius: 15,
        borderWidth: 1,
        paddingHorizontal: 15,
        marginBottom: 20,
    },
    reauthInput: {
        flex: 1,
        fontSize: 16,
    },
    reauthButtons: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    reauthButton: {
        flex: 1,
        height: 50,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelButton: {
        borderWidth: 1,
    },
    confirmButton: {
    },
    reauthButtonText: {
        fontSize: 14,
        fontWeight: 'bold',
    }
});
