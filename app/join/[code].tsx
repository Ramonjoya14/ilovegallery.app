import PinModal from '@/components/PinModal';
import { Text } from '@/components/Themed';
import { useAlert } from '@/context/AlertContext';
import { useSettings } from '@/context/AppSettingsContext';
import { useAuth } from '@/context/AuthContext';
import { databaseService, Event as EventType } from '@/services/database';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function JoinEventScreen() {
    const { code } = useLocalSearchParams();
    const { user } = useAuth();
    const router = useRouter();
    const { theme, t, language } = useSettings();
    const { showAlert } = useAlert();
    const [event, setEvent] = useState<EventType | null>(null);
    const [loading, setLoading] = useState(true);
    const [cloning, setCloning] = useState(false);
    const [pinVisible, setPinVisible] = useState(false);

    useEffect(() => {
        if (code) {
            fetchEventByCode();
        }
    }, [code]);

    const fetchEventByCode = async () => {
        setLoading(true);
        try {
            const eventData = await databaseService.getEventByCode(code as string);
            if (eventData) {
                setEvent(eventData);
            } else {
                showAlert({
                    title: t('alert_error'),
                    message: t('event_not_found'),
                    type: 'error',
                    buttons: [{ text: t('back'), onPress: () => router.replace('/(tabs)') }]
                });
            }
        } catch (error) {
            console.error("Error fetching event by code:", error);
            showAlert({
                title: t('alert_error'),
                message: t('error_save_generic'),
                type: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async () => {
        if (!user || !event) return;

        // If event has PIN and we haven't verified it yet
        if (event.pin) {
            setPinVisible(true);
            return;
        }

        // Clone if no PIN
        cloneEvent();
    };

    const cloneEvent = async () => {
        if (!user || !event) return;

        setCloning(true);
        try {
            // Create a sanitized event object to avoid undefined values which crash Firebase
            const eventData: any = {
                name: event.name,
                organizer: user.displayName || t('guest'),
                organizerId: user.uid,
                date: new Date(),
                photoCount: 0,
                maxPhotos: event.maxPhotos || 24,
                status: 'active',
                description: event.description || '',
                location: event.location || '',
                code: Math.random().toString(36).substring(2, 8).toUpperCase(),
                template: event.template || 'default',
                rootId: event.rootId || event.id
            };

            // Only add these if they actually exist
            if (event.pin) eventData.pin = event.pin;
            if (event.coverImage) eventData.coverImage = event.coverImage;
            if (event.coverStoragePath) eventData.coverStoragePath = event.coverStoragePath;

            const newEventId = await databaseService.createEvent(eventData);

            // Fetch and clone the photos from the original event
            const originalPhotos = await databaseService.getPhotosByEvent(event.id!);

            // Clone each photo to the new event
            for (const photo of originalPhotos) {
                await databaseService.addPhoto({
                    url: photo.url,
                    eventId: newEventId,
                    userId: user.uid,
                    userName: user.displayName || t('guest'),
                    timestamp: photo.timestamp,
                    type: photo.type || 'image',
                    storagePath: photo.storagePath
                });
            }

            showAlert({
                title: t('alert_success'),
                message: language === 'es'
                    ? `Se ha creado una copia de "${event.name}" con todas sus fotos en tu galería.`
                    : `A copy of "${event.name}" has been created with all its photos in your gallery.`,
                type: 'success'
            });

            router.replace(`/event/${newEventId}`);
        } catch (error) {
            console.error("Error cloning event:", error);
            showAlert({
                title: t('alert_error'),
                message: t('error_save_generic'),
                type: 'error'
            });
        } finally {
            setCloning(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.tint} />
            </View>
        );
    }

    if (!event) return null;

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <LinearGradient
                colors={[theme.tint + '15', 'transparent']}
                style={StyleSheet.absoluteFill}
            />

            <View style={styles.card}>
                <View style={[styles.iconContainer, { backgroundColor: theme.tint + '20' }]}>
                    <Ionicons name="camera-outline" size={40} color={theme.tint} />
                </View>

                <Text style={[styles.title, { color: theme.text }]}>
                    {language === 'es' ? '¿Quieres unirte a este evento?' : 'Do you want to join this event?'}
                </Text>

                <View style={[styles.eventPreview, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Text style={[styles.eventName, { color: theme.text }]}>{event.name}</Text>
                    <Text style={[styles.eventOrganizer, { color: theme.textSecondary }]}>
                        {language === 'es' ? 'Organizado por:' : 'Organized by:'} {event.organizer}
                    </Text>
                    <View style={styles.infoRow}>
                        <Ionicons name="images-outline" size={16} color={theme.tint} />
                        <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                            {event.maxPhotos} {language === 'es' ? 'exposiciones disponibles' : 'exposures available'}
                        </Text>
                    </View>
                </View>

                <Text style={[styles.disclaimer, { color: theme.textSecondary }]}>
                    {language === 'es'
                        ? 'Se creará una copia independiente en tu galería. Las fotos que tomes serán solo para ti.'
                        : 'An independent copy will be created in your gallery. The photos you take will be for you only.'}
                </Text>

                <TouchableOpacity
                    style={[styles.joinBtn, { backgroundColor: theme.tint }]}
                    onPress={handleJoin}
                    disabled={cloning}
                >
                    {cloning ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <>
                            <Ionicons name="copy-outline" size={20} color="#FFF" style={{ marginRight: 10 }} />
                            <Text style={styles.joinBtnText}>
                                {language === 'es' ? 'Clonar Evento' : 'Clone Event'}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => router.replace('/(tabs)')}
                    disabled={cloning}
                >
                    <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>{t('cancel')}</Text>
                </TouchableOpacity>
            </View>

            <PinModal
                isVisible={pinVisible}
                correctPin={event.pin || ''}
                onSuccess={() => {
                    setPinVisible(false);
                    cloneEvent();
                }}
                onClose={() => setPinVisible(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    card: {
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 25,
    },
    eventPreview: {
        width: '100%',
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        marginBottom: 20,
        alignItems: 'center',
    },
    eventName: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    eventOrganizer: {
        fontSize: 14,
        marginBottom: 12,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    infoText: {
        fontSize: 13,
    },
    disclaimer: {
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 18,
        paddingHorizontal: 20,
        marginBottom: 30,
    },
    joinBtn: {
        width: '100%',
        height: 56,
        borderRadius: 18,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    joinBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    cancelBtn: {
        padding: 10,
    },
    cancelBtnText: {
        fontSize: 14,
        fontWeight: '500',
    },
});
