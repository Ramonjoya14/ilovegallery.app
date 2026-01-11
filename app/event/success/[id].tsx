import { Text } from '@/components/Themed';
import { useSettings } from '@/context/AppSettingsContext';
import { databaseService, Event as EventType } from '@/services/database';
import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function EventSuccessScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { theme, t, language, isDark } = useSettings();
    const insets = useSafeAreaInsets();
    const [event, setEvent] = useState<EventType | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            fetchEventDetails();
        }
    }, [id]);

    const fetchEventDetails = async () => {
        setLoading(true);
        try {
            const eventData = await databaseService.getEventById(id as string);
            if (eventData) {
                setEvent(eventData);
            }
        } catch (error) {
            console.error("Error fetching event details:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.tint} />
            </View>
        );
    }

    if (!event) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
                <Text style={{ color: theme.text }}>{t('event_not_found')}</Text>
                <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={{ marginTop: 20 }}>
                    <Text style={{ color: theme.tint }}>{t('back_to_home')}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.content, { paddingTop: insets.top + (Platform.OS === 'ios' ? 10 : 20) }]}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={styles.closeButton}>
                        <FontAwesome name="times" size={20} color={theme.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: theme.textSecondary }]}>{t('new_event').toUpperCase()}</Text>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom }]}>
                    {/* Success Icon */}
                    <View style={styles.successIconContainer}>
                        <View style={[styles.successCircle, { backgroundColor: theme.tint, shadowColor: theme.tint }]}>
                            <FontAwesome name="check" size={30} color="#FFF" />
                        </View>
                    </View>

                    <Text style={[styles.successTitle, { color: theme.text }]}>{t('success_event_created_title')}</Text>
                    <Text style={[styles.successSubtitle, { color: theme.textSecondary }]}>{t('success_event_created_subtitle')}</Text>

                    {/* Event Preview Card */}
                    <View style={[styles.eventPreviewCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <View style={styles.previewImageContainer}>
                            {event?.coverImage ? (
                                <Image source={{ uri: event.coverImage }} style={styles.previewImage} />
                            ) : (
                                <LinearGradient colors={['#3D2818', '#1E1915']} style={styles.previewImage} />
                            )}
                            <View style={styles.cameraBadge}>
                                <Text style={styles.cameraBadgeText}>{t('camera_label')} #01</Text>
                            </View>
                        </View>

                        <View style={styles.previewBody}>
                            <Text style={[styles.previewName, { color: theme.text }]}>{event?.name}</Text>
                            <Text style={[styles.previewDesc, { color: theme.textSecondary }]} numberOfLines={2}>
                                {event?.description || t('default_description')}
                            </Text>

                            <View style={styles.dateTimeRow}>
                                <View style={styles.dateTimeItem}>
                                    <View style={[styles.dateTimeIcon, { backgroundColor: isDark ? '#2A1D15' : '#FFF4EA' }]}>
                                        <FontAwesome name="calendar" size={12} color={theme.tint} />
                                    </View>
                                    <View>
                                        <Text style={[styles.dateTimeLabel, { color: theme.textSecondary }]}>{t('date_label')}</Text>
                                        <Text style={[styles.dateTimeValue, { color: theme.text }]}>
                                            {event?.date ? (
                                                new Date(event.date.seconds ? event.date.seconds * 1000 : event.date).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short' })
                                            ) : t('today')}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.dateTimeItem}>
                                    <View style={[styles.dateTimeIcon, { backgroundColor: isDark ? '#2A1D15' : '#FFF4EA' }]}>
                                        <FontAwesome name="clock-o" size={12} color={theme.tint} />
                                    </View>
                                    <View>
                                        <Text style={[styles.dateTimeLabel, { color: theme.textSecondary }]}>{t('time_label')}</Text>
                                        <Text style={[styles.dateTimeValue, { color: theme.text }]}>
                                            {event?.date ? (
                                                new Date(event.date.seconds ? event.date.seconds * 1000 : event.date).toLocaleTimeString(language === 'es' ? 'es-ES' : 'en-US', { hour: '2-digit', minute: '2-digit' })
                                            ) : new Date().toLocaleTimeString(language === 'es' ? 'es-ES' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.shotsRow}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <FontAwesome name="dot-circle-o" size={14} color={theme.tint} style={{ marginRight: 8 }} />
                                    <Text style={[styles.shotsLabel, { color: theme.text }]}>{t('shots_available')}</Text>
                                </View>
                                <Text style={[styles.shotsValue, { color: theme.tint }]}>{event.maxPhotos || 24} {t('stats_photos')}</Text>
                            </View>
                            <View style={[styles.progressBg, { backgroundColor: theme.border }]}>
                                <View style={[styles.progressFill, { backgroundColor: theme.tint }]} />
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.inviteButton}>
                        <FontAwesome name="share-alt" size={14} color={theme.textSecondary} style={{ marginRight: 10 }} />
                        <Text style={[styles.inviteText, { color: theme.textSecondary }]}>{t('invite_friends')}</Text>
                    </TouchableOpacity>
                </ScrollView>

                {/* Bottom Button */}
                <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 30, backgroundColor: theme.background }]}>
                    <TouchableOpacity
                        style={[styles.openCameraButton, { backgroundColor: theme.tint, shadowColor: theme.tint }]}
                        onPress={() => router.replace(`/event/${id}`)}
                    >
                        <FontAwesome name="camera" size={18} color="#FFF" style={{ marginRight: 10 }} />
                        <Text style={styles.openCameraText}>{t('open_camera')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
    },
    header: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    closeButton: {
        position: 'absolute',
        left: 20,
        padding: 10,
    },
    headerTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    scrollContent: {
        paddingHorizontal: 25,
        alignItems: 'center',
    },
    successIconContainer: {
        marginTop: 20,
        marginBottom: 20,
    },
    successCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 10,
    },
    successTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    successSubtitle: {
        fontSize: 16,
        marginBottom: 30,
    },
    eventPreviewCard: {
        width: '100%',
        borderRadius: 35,
        overflow: 'hidden',
        marginBottom: 30,
        borderWidth: 1,
    },
    previewImageContainer: {
        width: '100%',
        height: 180,
    },
    previewImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    cameraBadge: {
        position: 'absolute',
        bottom: 15,
        left: 15,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    cameraBadgeText: {
        color: '#AAA',
        fontSize: 10,
        fontWeight: 'bold',
    },
    previewBody: {
        padding: 25,
    },
    previewName: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    previewDesc: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 25,
    },
    dateTimeRow: {
        flexDirection: 'row',
        marginBottom: 30,
        gap: 30,
    },
    dateTimeItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dateTimeIcon: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    dateTimeLabel: {
        fontSize: 9,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    dateTimeValue: {
        fontSize: 14,
        fontWeight: 'bold',
        marginTop: 2,
    },
    shotsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    shotsLabel: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    shotsValue: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    progressBg: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        width: '100%',
        height: '100%',
    },
    inviteButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    inviteText: {
        fontSize: 14,
        fontWeight: '500',
    },
    bottomContainer: {
        paddingHorizontal: 25,
    },
    openCameraButton: {
        width: '100%',
        height: 65,
        borderRadius: 25,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 15,
    },
    openCameraText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
