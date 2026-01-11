import { useAlert } from '@/context/AlertContext';
import { useSettings } from '@/context/AppSettingsContext';
import { useAuth } from '@/context/AuthContext';
import { databaseService } from '@/services/database';
import { storageService } from '@/services/storage';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

export default function PersonalInfoScreen() {
    const { user, updateProfile } = useAuth();
    const { showAlert } = useAlert();
    const router = useRouter();
    const { theme, t } = useSettings();
    const [name, setName] = useState(user?.displayName || '');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState(user?.email || '');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [image, setImage] = useState<string | null>(user?.photoURL || null);
    const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');

    React.useEffect(() => {
        const fetchUserData = async () => {
            if (!user) {
                setName('');
                setUsername('');
                setEmail('');
                setPhone('');
                setImage(null);
                return;
            }

            setName(user.displayName || '');
            setEmail(user.email || '');
            setImage(user.photoURL || null);

            // Fetch extra info from Firestore (like username)
            try {
                const profile = await databaseService.getUserProfile(user.uid);
                if (profile) {
                    if (profile.username) setUsername(profile.username);
                    if (profile.phone) setPhone(profile.phone);
                }
            } catch (err) {
                console.error("Error fetching profile:", err);
            }
        };

        fetchUserData();
    }, [user]);

    // Check availability only when username changes
    React.useEffect(() => {
        if (!username || username === '') {
            setUsernameStatus('idle');
            return;
        }

        // Validate format: letters, numbers, dots, hyphens, no spaces
        const formatValid = /^[a-zA-Z0-9.-]+$/.test(username);
        if (!formatValid) {
            setUsernameStatus('invalid');
            return;
        }

        const timeoutId = setTimeout(async () => {
            if (!user) return;
            setUsernameStatus('checking');
            const isAvailable = await databaseService.checkUsernameAvailability(username, user.uid);
            setUsernameStatus(isAvailable ? 'available' : 'taken');
        }, 500); // 500ms debounce

        return () => clearTimeout(timeoutId);
    }, [username, user]);

    const handlePickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    const handleSave = async () => {
        if (!user) return;

        if (usernameStatus === 'taken') {
            showAlert({
                title: t('alert_error'),
                message: t('error_username_taken_alert'),
                type: 'error'
            });
            return;
        }

        if (usernameStatus === 'invalid') {
            showAlert({
                title: t('alert_error'),
                message: t('error_username_invalid_alert'),
                type: 'error'
            });
            return;
        }

        setLoading(true);
        try {
            let photoUrl = image;

            // 1. Upload new image if it's local
            if (image && !image.startsWith('http')) {
                const fileName = `profiles/${user.uid}/${Date.now()}.jpg`;
                photoUrl = await storageService.uploadImage(image, fileName);
            }

            // 2. Update Auth profile
            await updateProfile({
                displayName: name,
                photoURL: photoUrl || undefined
            });

            // 3. Update Firestore Profile
            await databaseService.updateUserProfile(user.uid, {
                displayName: name,
                username: username.toLowerCase(),
                phone: phone,
                email: user.email,
                photoURL: photoUrl
            });

            showAlert({
                title: t('success'),
                message: t('success_update'),
                type: 'success',
                buttons: [{ text: 'OK', onPress: () => router.back() }]
            });
        } catch (error) {
            console.error("Error saving profile:", error);
            showAlert({
                title: t('alert_error'),
                message: t('error_save_generic'),
                type: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.container, { backgroundColor: theme.background }]}
        >
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.header}>
                <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.card }]} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>{t('profile_info')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.avatarContainer}>
                    <View style={styles.avatarWrapper}>
                        {image ? (
                            <Image source={{ uri: image }} style={[styles.avatar, { borderColor: theme.card }]} />
                        ) : (
                            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: theme.card, borderColor: theme.card }]}>
                                <FontAwesome name="user" size={40} color={theme.textSecondary} />
                            </View>
                        )}
                        <TouchableOpacity style={[styles.editBadge, { borderColor: theme.background }]} onPress={handlePickImage}>
                            <FontAwesome name="pencil" size={12} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity onPress={handlePickImage}>
                        <Text style={styles.changePhotoText}>{t('change_photo')}</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.textSecondary }]}>{t('full_name')}</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: theme.card, borderColor: theme.border }]}>
                            <TextInput
                                style={[styles.input, { color: theme.text }]}
                                value={name}
                                onChangeText={setName}
                                placeholder={t('placeholder_name')}
                                placeholderTextColor={theme.textSecondary}
                            />
                            {name.length > 0 && (
                                <Ionicons name="checkmark-circle" size={20} color="#34C759" />
                            )}
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.textSecondary }]}>{t('username')}</Text>
                        <View style={[
                            styles.inputWrapper,
                            { backgroundColor: theme.card, borderColor: theme.border },
                            usernameStatus === 'taken' || usernameStatus === 'invalid' ? { borderColor: '#FF3B30' } : null,
                            usernameStatus === 'available' ? { borderColor: '#34C759' } : null
                        ]}>
                            <Text style={[styles.inputIcon, { color: theme.textSecondary }]}>@</Text>
                            <TextInput
                                style={[styles.input, { color: theme.text }]}
                                value={username}
                                onChangeText={(val) => setUsername(val.toLowerCase().trim())}
                                placeholder={t('placeholder_username')}
                                placeholderTextColor={theme.textSecondary}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            {usernameStatus === 'checking' && <ActivityIndicator size="small" color={theme.tint} />}
                            {usernameStatus === 'available' && <Ionicons name="checkmark-circle" size={20} color="#34C759" />}
                            {(usernameStatus === 'taken' || usernameStatus === 'invalid') && <Ionicons name="close-circle" size={20} color="#FF3B30" />}
                        </View>
                        {usernameStatus === 'invalid' && (
                            <Text style={{ color: '#FF3B30', fontSize: 10, marginLeft: 5 }}>{t('error_username_invalid')}</Text>
                        )}
                        {usernameStatus === 'taken' && (
                            <Text style={{ color: '#FF3B30', fontSize: 10, marginLeft: 5 }}>{t('error_username_taken')}</Text>
                        )}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.textSecondary }]}>{t('email')}</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: theme.card, borderColor: theme.border }]}>
                            <Ionicons name="mail-outline" size={18} color={theme.textSecondary} style={styles.inputIconLeft} />
                            <TextInput
                                style={[styles.input, { color: theme.textSecondary }]}
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                editable={false} // Usually controlled by auth provider
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.textSecondary }]}>{t('phone')}</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: theme.card, borderColor: theme.border }]}>
                            <Ionicons name="call-outline" size={18} color={theme.textSecondary} style={styles.inputIconLeft} />
                            <TextInput
                                style={[styles.input, { color: theme.text }]}
                                value={phone}
                                onChangeText={setPhone}
                                keyboardType="phone-pad"
                                placeholder="+34 000 000 000"
                                placeholderTextColor={theme.textSecondary}
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.saveButton, { backgroundColor: theme.tint }, loading && styles.disabledButton]}
                        onPress={handleSave}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <>
                                <FontAwesome name="lock" size={16} color="#FFF" style={{ marginRight: 10 }} />
                                <Text style={styles.saveButtonText}>{t('save_changes')}</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <Text style={[styles.footerInfo, { color: theme.textSecondary }]}>
                        {t('last_update', { time: t('time_2_days') })}
                    </Text>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        // backgroundColor handled by theme
    },
    header: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingHorizontal: 20,
        paddingBottom: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        // backgroundColor handled by theme
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        // color handled by theme
    },
    content: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    avatarContainer: {
        alignItems: 'center',
        marginVertical: 30,
    },
    avatarWrapper: {
        position: 'relative',
        marginBottom: 15,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 3,
        // borderColor handled by theme
    },
    avatarPlaceholder: {
        // backgroundColor handled by theme
        justifyContent: 'center',
        alignItems: 'center',
    },
    editBadge: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        backgroundColor: '#FF6B00',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        // borderColor handled by theme
    },
    changePhotoText: {
        color: '#FF6B00',
        fontWeight: 'bold',
        fontSize: 14,
    },
    form: {
        gap: 20,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        // color handled by theme
        fontSize: 12,
        fontWeight: 'bold',
        marginLeft: 5,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        // backgroundColor handled by theme
        height: 55,
        borderRadius: 18,
        paddingHorizontal: 15,
        borderWidth: 1,
        // borderColor handled by theme
    },
    inputIcon: {
        // color handled by theme
        fontSize: 16,
        marginRight: 5,
        fontWeight: 'bold',
    },
    inputIconLeft: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        // color handled by theme
        fontSize: 15,
    },
    saveButton: {
        // backgroundColor handled by theme
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
    saveButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    footerInfo: {
        // color handled by theme
        fontSize: 11,
        textAlign: 'center',
        marginTop: 15,
    },
});
