import CameraModal from '@/components/CameraModal';
import EventShareModal from '@/components/EventShareModal';
import PhotoViewerModal from '@/components/PhotoViewerModal';
import PinModal from '@/components/PinModal';
import SetPinModal from '@/components/SetPinModal';
import { Text } from '@/components/Themed';
import { useAlert } from '@/context/AlertContext';
import { useSettings } from '@/context/AppSettingsContext';
import { useAuth } from '@/context/AuthContext';
import { databaseService, Event as EventType, Photo } from '@/services/database';
import { storageService } from '@/services/storage';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as MediaLibrary from 'expo-media-library';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Modal, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 50) / 2;

// Event Detail Screen - Updated with Save Roll functionality
export default function EventDetailScreen() {
    const { id } = useLocalSearchParams();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const router = useRouter();
    const navigation = useNavigation();
    const { theme, isDark, t, language, autoSaveToGallery } = useSettings();
    const { showAlert } = useAlert();
    const [event, setEvent] = useState<EventType | null>(null);
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [pendingPhotos, setPendingPhotos] = useState<Photo[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [isCameraVisible, setIsCameraVisible] = useState(false);
    const [viewerVisible, setViewerVisible] = useState(false);
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
    const [pinVisible, setPinVisible] = useState(false);
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [isSetPinVisible, setIsSetPinVisible] = useState(false);
    const [shareModalVisible, setShareModalVisible] = useState(false);
    const [participants, setParticipants] = useState<{ uid: string; displayName: string; photoURL: string | null }[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [sessionHistory, setSessionHistory] = useState<Photo[]>([]);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [tempDate, setTempDate] = useState(new Date());

    const isOrganizer = user && event && user.uid === event.organizerId;

    useEffect(() => {
        if (id) {
            fetchEventDetails();
            databaseService.incrementEventViews(id as string);
        }
    }, [id]);

    const fetchEventDetails = async (silent = false) => {
        if (!user) {
            setEvent(null);
            setPhotos([]);
            setLoading(false);
            return;
        }

        if (!silent) setLoading(true);
        try {
            const eventData = await databaseService.getEventById(id as string);
            if (eventData) {
                setEvent(eventData);

                const rootId = eventData.rootId || eventData.id;
                if (rootId) {
                    const participantsData = await databaseService.getEventParticipants(rootId as string);
                    setParticipants(participantsData);
                }

                const photoData = await databaseService.getPhotosByEvent(id as string);
                setPhotos(photoData);

                if (eventData.pin && eventData.pin.trim() !== '' && !isUnlocked) {
                    setPinVisible(true);
                }
            }
        } catch (error) {
            console.error("Error fetching event details:", error);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const handleBack = () => {
        if (navigation.canGoBack()) {
            router.back();
        } else {
            router.replace('/(tabs)/gallery');
        }
    };


    const handleUploadFromGallery = async () => {
        if (!user) {
            showAlert({ title: t('alert_error'), message: t('error_login_photo'), type: 'error' });
            return;
        }
        if (!event) return;

        if (event.status !== 'active') {
            showAlert({ title: t('finished'), message: t('error_event_finished'), type: 'warning' });
            return;
        }

        if ((event.photoCount || 0) + pendingPhotos.length >= event.maxPhotos) {
            showAlert({ title: t('roll_complete_title'), message: t('roll_complete_msg'), type: 'warning' });
            return;
        }

        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                showAlert({ title: t('permission_denied_title'), message: t('permission_denied_gallery_msg'), type: 'error' });
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.All,
                allowsEditing: false,
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const captures = result.assets.map(asset => ({
                    uri: asset.uri,
                    type: (asset.type === 'video' ? 'video' : 'image') as 'image' | 'video'
                }));
                onCapture(captures);
            }
        } catch (error) {
            console.error("Error picking from gallery:", error);
            showAlert({ title: t('alert_error'), message: t('error_open_gallery'), type: 'error' });
        }
    };

    const handleTakePhoto = () => {
        if (!user || !event) return;
        if (event.status !== 'active') {
            showAlert({ title: t('finished'), message: t('error_event_finished'), type: 'warning' });
            return;
        }

        setIsCameraVisible(true);
    };

    const onCapture = async (captures: { uri: string, type: 'image' | 'video' }[]) => {
        if (!user || !event) return;

        const isBatch = captures.length > 1;
        if (isBatch) setIsProcessing(true);

        const newPendingPhotos: Photo[] = captures.map(c => ({
            id: `temp-${Date.now()}-${Math.random()}`,
            url: c.uri,
            eventId: event.id as string,
            userId: user.uid,
            userName: user.displayName || t('guest'),
            timestamp: new Date(),
            type: c.type
        }));

        setPendingPhotos(prev => [...newPendingPhotos, ...prev]);

        // Process uploads in parallel for speed
        // We split into chunks of 5 to avoid overwhelming the network/device if 24 items are selected
        const chunkSize = 5;
        for (let i = 0; i < newPendingPhotos.length; i += chunkSize) {
            const chunk = newPendingPhotos.slice(i, i + chunkSize);
            await Promise.all(chunk.map(photo =>
                processSingleUpload(photo.url, photo.type as 'image' | 'video', photo.id!)
            ));
        }

        if (isBatch) {
            setIsProcessing(false);
            // Refresh details once at the end of batch
            fetchEventDetails(true);
        }
    };

    const processSingleUpload = async (uri: string, type: 'image' | 'video', tempId: string) => {
        if (!user || !event) return;

        try {
            if (Platform.OS !== 'web') {
                MediaLibrary.requestPermissionsAsync().then(({ status }) => {
                    if (status === 'granted') {
                        MediaLibrary.saveToLibraryAsync(uri);
                    }
                }).catch(e => console.warn("Gallery save failed", e));
            }

            const ext = type === 'video' ? 'mp4' : 'jpg';
            const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            const fileName = `photos/${event.id}/${uniqueId}.${ext}`;
            const downloadUrl = await storageService.uploadImage(uri, fileName);

            const photoData: Photo = {
                url: downloadUrl,
                eventId: event.id as string,
                userId: user.uid,
                userName: user.displayName || t('guest'),
                timestamp: new Date(),
                type: type,
                storagePath: fileName
            };

            const newPhotoId = await databaseService.addPhoto(photoData);
            const savedPhoto = { ...photoData, id: newPhotoId };

            // Update states efficiently
            setSessionHistory(prev => [savedPhoto, ...prev]);
            setPendingPhotos(prev => prev.filter(p => p.id !== tempId));

            // Only fetch if not in a batch (to avoid spamming)
            if (!isProcessing) {
                await fetchEventDetails(true);
            } else {
                // Update local count manually for the UI while batching
                setEvent(prev => prev ? { ...prev, photoCount: (prev.photoCount || 0) + 1 } : null);
            }
        } catch (error: any) {
            console.error("Background upload failed:", error);
            setPendingPhotos(prev => prev.filter(p => p.id !== tempId));
            showAlert({ title: t('alert_error'), message: t('error_save_generic'), type: 'error' });
        }
    };

    const handleReveal = async () => {
        if (!event || ((event.photoCount || 0) + pendingPhotos.length) === 0) {
            showAlert({
                title: t('alert_error'),
                message: language === 'es' ? 'No hay fotos para revelar. Debes tomar al menos una foto.' : 'No photos to reveal. You must take at least one photo.',
                type: 'warning'
            });
            return;
        }

        const msg = t('confirm_reveal');
        const onConfirm = async () => {
            try {
                setLoading(true);

                // Critical Step: Update status in DB
                await databaseService.updateEventStatus(id as string, 'expired');

                // Update local state immediately
                setEvent(prev => prev ? { ...prev, status: 'expired' } : null);

                // Non-critical steps: Fetch photos and auto-save
                try {
                    const photoData = await databaseService.getPhotosByEvent(id as string);
                    setPhotos(photoData);

                    if (autoSaveToGallery && photoData.length > 0 && Platform.OS !== 'web') {
                        const { status } = await MediaLibrary.requestPermissionsAsync();
                        if (status === 'granted') {
                            showAlert({
                                title: t('loading'),
                                message: language === 'es' ? 'Guardando carrete en tu galería...' : 'Saving roll to your gallery...',
                                type: 'info'
                            });

                            // Don't await the loop to prevent blocking UI, or handle carefully
                            // For now, we await it but catch errors locally
                            for (const photo of photoData) {
                                try {
                                    const ext = photo.type === 'video' ? 'mp4' : 'jpg';
                                    const localUri = (FileSystem.cacheDirectory || FileSystem.documentDirectory || '') + `${photo.id}.${ext}`;
                                    await FileSystem.downloadAsync(photo.url, localUri);
                                    await MediaLibrary.saveToLibraryAsync(localUri);
                                } catch (e) {
                                    console.log("Skipping individual photo save error");
                                }
                            }
                        }
                    }
                } catch (secondaryError) {
                    console.warn("Secondary reveal steps failed, but reveal succeeded:", secondaryError);
                }

                // Refresh details
                try {
                    await fetchEventDetails(true);
                } catch (e) { console.log('Fetch details failed'); }

                showAlert({ title: t('alert_success'), message: t('success_reveal_msg'), type: 'success' });
            } catch (error) {
                console.error("Reveal critical error:", error);
                showAlert({ title: t('alert_error'), message: t('error_reveal_roll'), type: 'error' });
            } finally {
                setLoading(false);
            }
        };

        showAlert({
            title: t('action_reveal'),
            message: msg,
            type: 'warning',
            buttons: [
                { text: t('cancel'), style: 'cancel' },
                { text: t('action_reveal'), onPress: onConfirm }
            ]
        });
    };

    const handleDeletePhoto = (photoId: string) => {
        const isPending = photoId.startsWith('temp-');
        const msg = t('confirm_delete_photo');

        const onConfirm = async () => {
            if (isPending) {
                setPendingPhotos(prev => prev.filter(p => p.id !== photoId));
                return;
            }

            try {
                // If it was a session photo, remove it from history too
                setSessionHistory(prev => prev.filter(p => p.id !== photoId));

                await databaseService.deletePhoto(photoId, id as string);

                // Update local count immediately for the camera UI
                setEvent(prev => prev ? { ...prev, photoCount: Math.max((prev.photoCount || 1) - 1, 0) } : null);

                // Refresh full details
                await fetchEventDetails(true);
            } catch (error) {
                showAlert({ title: t('alert_error'), message: t('error_delete_photo'), type: 'error' });
            }
        };

        showAlert({
            title: t('action_delete'),
            message: msg,
            type: 'error',
            buttons: [
                { text: t('cancel'), style: 'cancel' },
                { text: t('action_delete'), style: 'destructive', onPress: onConfirm }
            ]
        });
    };

    const handleToggleLikePhoto = (photoId: string, isLiked: boolean) => {
        setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, isLiked } : p));
    };

    const handleDeleteEvent = () => {
        const msg = t('confirm_delete_event');
        const onConfirm = async () => {
            try {
                setLoading(true);
                await databaseService.deleteEvent(id as string);
                router.replace('/(tabs)/gallery');
            } catch (error) {
                showAlert({ title: t('alert_error'), message: t('error_delete_event'), type: 'error' });
                setLoading(false);
            }
        };

        showAlert({
            title: t('action_delete'),
            message: msg,
            type: 'error',
            buttons: [
                { text: t('cancel'), style: 'cancel' },
                { text: t('action_delete'), style: 'destructive', onPress: onConfirm }
            ]
        });
    };

    const handleToggleArchive = async () => {
        if (!event) return;
        const newStatus = !event.isArchived;
        try {
            await databaseService.toggleEventArchive(id as string, newStatus);
            await fetchEventDetails(true);
            showAlert({ title: t('alert_success'), message: newStatus ? t('action_archive') : t('action_unarchive'), type: 'success' });
        } catch (error) {
            console.error("Error toggling archive:", error);
        }
    };

    const handleToggleFavorite = async () => {
        if (!event) return;
        const newStatus = !event.isFavorite;
        try {
            await databaseService.toggleEventFavorite(id as string, newStatus);
            await fetchEventDetails(true);
            showAlert({ title: t('alert_success'), message: newStatus ? t('action_favorite') : t('action_unfavorite'), type: 'success' });
        } catch (error) {
            console.error("Error toggling favorite:", error);
        }
    };

    const handleTogglePrivacy = () => {
        setShowMenu(false);
        if (event?.pin) {
            showAlert({
                title: t('action_make_public'),
                message: t('remove_pin_confirm'),
                type: 'warning',
                buttons: [
                    { text: t('cancel'), style: 'cancel' },
                    {
                        text: t('action_remove_pin'), style: 'destructive', onPress: async () => {
                            try {
                                await databaseService.updateEventPin(id as string, null);
                                await fetchEventDetails(true);
                                showAlert({ title: t('alert_success'), message: t('action_make_public'), type: 'success' });
                            } catch (error) {
                                console.error("Error removing PIN:", error);
                            }
                        }
                    }
                ]
            });
        } else {
            setIsSetPinVisible(true);
        }
    };

    const handleSetPinSuccess = async (newPin: string) => {
        try {
            await databaseService.updateEventPin(id as string, newPin);
            setIsSetPinVisible(false);
            setIsUnlocked(true);
            await fetchEventDetails(true);
            showAlert({ title: t('alert_success'), message: t('action_make_private'), type: 'success' });
        } catch (error) {
            console.error("Error setting PIN:", error);
            showAlert({ title: t('alert_error'), message: t('alert_error'), type: 'error' });
        }
    };

    const handleOpenTimePicker = () => {
        if (!isOrganizer) return;
        setTempDate(getEventDate());
        setShowTimePicker(true);
    };

    const saveNewTime = async (newTime: Date) => {
        const currentDate = getEventDate();
        const newDate = new Date(currentDate);
        newDate.setHours(newTime.getHours());
        newDate.setMinutes(newTime.getMinutes());
        newDate.setSeconds(0);

        try {
            // Optimistic update
            setEvent(prev => prev ? { ...prev, date: newDate } : null);
            await databaseService.updateEventDate(id as string, newDate);
            // No alert needed for success to keep it smooth, or maybe a small toast?
        } catch (error) {
            console.error("Error updating time:", error);
            showAlert({ title: t('alert_error'), message: t('error_save_generic'), type: 'error' });
            // Revert if needed (fetch details)
            fetchEventDetails(true);
        }
    };

    const onAndroidTimeChange = (event: any, selectedDate?: Date) => {
        setShowTimePicker(false);
        if (event.type === 'set' && selectedDate) {
            saveNewTime(selectedDate);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.center, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.tint} />
            </View>
        );
    }

    if (!event) {
        return (
            <View style={[styles.container, styles.center, { backgroundColor: theme.background }]}>
                <Text style={{ color: theme.text }}>{t('event_not_found')}</Text>
                <TouchableOpacity onPress={handleBack} style={{ marginTop: 20 }}>
                    <Text style={{ color: theme.tint }}>{t('nav_back')}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const getEventDate = () => {
        if (!event?.date) return new Date();
        if (event.date.toDate) return event.date.toDate();
        if (event.date.seconds) return new Date(event.date.seconds * 1000);
        return new Date(event.date);
    };

    const eventDate = getEventDate();
    const formattedDate = isNaN(eventDate.getTime()) ? t('coming_soon') : eventDate.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();
    const formattedTime = isNaN(eventDate.getTime()) ? '--:--' : eventDate.toLocaleTimeString(language === 'es' ? 'es-ES' : 'en-US', { hour: '2-digit', minute: '2-digit' });

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.coverSection}>
                {event.coverImage ? (
                    <Image
                        source={{ uri: event.coverImage }}
                        style={styles.coverImage}
                        cachePolicy="disk"
                    />
                ) : (
                    <View style={[styles.coverImage, { backgroundColor: theme.card }]} />
                )}
                <LinearGradient
                    colors={['rgba(0,0,0,0.4)', 'transparent', 'rgba(0,0,0,0.8)']}
                    style={[styles.coverOverlay, { paddingTop: insets.top + 10 }]}
                >
                    <View style={styles.topNav}>
                        <TouchableOpacity style={styles.circleBtn} onPress={handleBack}>
                            <FontAwesome name="chevron-left" size={12} color="#FFF" />
                        </TouchableOpacity>
                        <View style={styles.topNavRight}>
                            <TouchableOpacity style={styles.circleBtn} onPress={handleUploadFromGallery}>
                                <Ionicons name="cloud-upload-outline" size={18} color="#FFF" />
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.circleBtn, { marginLeft: 12 }]} onPress={() => setShareModalVisible(true)}>
                                <Ionicons name="share-social-outline" size={18} color="#FFF" />
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.circleBtn, { marginLeft: 12 }]} onPress={() => setShowMenu(true)}>
                                <FontAwesome name="ellipsis-h" size={16} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.coverInfo}>
                        <View style={[styles.tagContainer, { backgroundColor: theme.tint }]}>
                            <FontAwesome name="camera" size={10} color="#FFF" />
                            <Text style={styles.tagText}>{event.status === 'active' ? t('active') : t('finished')}</Text>
                        </View>
                        <Text style={styles.eventTitle}>{event.name}</Text>
                        <View style={styles.locationContainer}>
                            <FontAwesome name="map-marker" size={14} color="#FFF" />
                            <Text style={styles.locationText}>{event.location || t('location_not_specified')}</Text>
                        </View>
                    </View>
                </LinearGradient>
            </View>

            {!isUnlocked && event.pin && event.pin.trim() !== '' && (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.background, zIndex: 1000, justifyContent: 'center', alignItems: 'center' }]}>
                    <View style={styles.lockedContainer}>
                        <View style={[styles.lockedIconBg, { backgroundColor: theme.tint + '15' }]}>
                            <FontAwesome name="lock" size={40} color={theme.tint} />
                        </View>
                        <Text style={[styles.lockedTitle, { color: theme.text }]}>{t('event_private_title')}</Text>
                        <Text style={[styles.lockedSubtitle, { color: theme.textSecondary }]}>{t('event_private_subtitle')}</Text>
                        <TouchableOpacity style={[styles.lockedButton, { backgroundColor: theme.tint }]} onPress={() => setPinVisible(true)}>
                            <Text style={styles.lockedButtonText}>{t('enter_pin_btn')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{ marginTop: 20 }} onPress={handleBack}>
                            <Text style={{ color: theme.textSecondary, fontWeight: 'bold' }}>{t('back_btn_bold')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            <PinModal
                isVisible={pinVisible}
                onClose={() => { if (!isUnlocked) handleBack(); setPinVisible(false); }}
                onSuccess={() => { setIsUnlocked(true); setPinVisible(false); }}
                correctPin={event.pin || ""}
            />

            <Modal transparent visible={showMenu} animationType="fade" onRequestClose={() => setShowMenu(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowMenu(false)}>
                    <View style={[styles.menuContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />
                        <TouchableOpacity style={[styles.menuItem, { borderBottomColor: theme.border }]} onPress={() => { setShowMenu(false); handleToggleFavorite(); }}>
                            <FontAwesome name={event.isFavorite ? "star" : "star-o"} size={18} color="#FFD700" />
                            <Text style={[styles.menuText, { color: theme.text }]}>{event.isFavorite ? t('action_unfavorite') : t('action_favorite')}</Text>
                        </TouchableOpacity>
                        {isOrganizer && (
                            <TouchableOpacity style={[styles.menuItem, { borderBottomColor: theme.border }]} onPress={handleTogglePrivacy}>
                                <FontAwesome name={event.pin ? "unlock" : "lock"} size={18} color={theme.tint} />
                                <Text style={[styles.menuText, { color: theme.text }]}>{event.pin ? t('action_remove_pin') : t('action_make_private')}</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity style={[styles.menuItem, { borderBottomColor: theme.border }]} onPress={() => { setShowMenu(false); handleToggleArchive(); }}>
                            <FontAwesome name={event.isArchived ? "upload" : "archive"} size={18} color={theme.textSecondary} />
                            <Text style={[styles.menuText, { color: theme.text }]}>{event.isArchived ? t('action_unarchive') : t('action_archive')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.menuItem, { borderBottomColor: theme.border }]} onPress={() => { setShowMenu(false); handleDeleteEvent(); }}>
                            <FontAwesome name="trash" size={18} color="#FF3B30" />
                            <Text style={styles.menuTextDestructive}>{t('action_delete')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => setShowMenu(false)}>
                            <FontAwesome name="times" size={18} color={theme.text} />
                            <Text style={[styles.menuText, { color: theme.text }]}>{t('cancel')}</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            <StatusBar style={isDark ? 'light' : 'dark'} translucent />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 20 }}>
                <View style={[styles.infoGridContainer, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 10 }]}>
                    <View style={styles.infoGrid}>
                        <View style={styles.infoCard}>
                            <View style={[styles.infoIconBg, { backgroundColor: theme.background }]}>
                                <FontAwesome name="calendar" size={12} color={theme.tint} />
                            </View>
                            <View style={styles.infoTextContainer}>
                                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{t('date_label')}</Text>
                                <Text style={[styles.infoValue, { color: theme.text }]}>{formattedDate}</Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={styles.infoCard}
                            onPress={handleOpenTimePicker}
                            activeOpacity={isOrganizer ? 0.7 : 1}
                        >
                            <View style={[styles.infoIconBg, { backgroundColor: theme.background }]}>
                                <FontAwesome name="clock-o" size={12} color={theme.tint} />
                            </View>
                            <View style={styles.infoTextContainer}>
                                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{t('time_label')}</Text>
                                <Text style={[styles.infoValue, { color: theme.text }]}>{formattedTime}</Text>
                            </View>
                            {isOrganizer && (
                                <View style={{ position: 'absolute', right: 10, top: 10, opacity: 0.5 }}>
                                    <FontAwesome name="pencil" size={10} color={theme.textSecondary} />
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                    <View style={[styles.infoGrid, { marginTop: 10 }]}>
                        <View style={styles.infoCard}>
                            <View style={[styles.infoIconBg, { backgroundColor: theme.background }]}>
                                <FontAwesome name={(() => {
                                    switch (event.template) {
                                        case 'boda': return 'heart';
                                        case 'cumple': return 'gift';
                                        case 'fiesta': return 'glass';
                                        case 'corporativo': return 'briefcase';
                                        case 'familiar': return 'home';
                                        case 'personal': return 'star';
                                        default: return 'star';
                                    }
                                })()} size={12} color={theme.tint} />
                            </View>
                            <View style={styles.infoTextContainer}>
                                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{t('template_label')}</Text>
                                <Text style={[styles.infoValue, { color: theme.text }]}>
                                    {event.template ? t(`template_${event.template}` as any) : t('template_personal')}
                                </Text>
                            </View>
                        </View>
                    </View>
                    <View style={{ marginTop: 20, marginBottom: 15 }}>
                        <Text style={[styles.eventDescription, { color: theme.text }]}>{event.name}</Text>
                    </View>
                    <View style={styles.attendeesContainer}>
                        <View style={styles.avatarStack}>
                            <View style={[styles.avatar, { borderColor: theme.card }]}>
                                <View style={[styles.avatarImage, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
                                    <Ionicons name="person" size={14} color={theme.textSecondary} />
                                </View>
                            </View>
                        </View>
                        <Text style={[styles.attendeesText, { color: theme.textSecondary, fontSize: 13 }]}>
                            {participants.length === 0 ?
                                (language === 'es' ? 'Nadie más tiene este evento aún' : 'No one else has this event yet') :
                                (language === 'es' ?
                                    (participants.length === 1 ? '1 vez compartido' : `${participants.length} veces compartido`) :
                                    (participants.length === 1 ? '1 time shared' : `${participants.length} times shared`))
                            }
                        </Text>
                    </View>
                </View>

                {event.status === 'active' && (
                    <View style={[styles.pendingCard, { backgroundColor: theme.card, borderColor: theme.border, paddingVertical: 40, marginTop: 20 }]}>
                        <View style={styles.perforationsLeft}>{[1, 2, 3, 4, 5, 6, 7, 8].map(i => <View key={i} style={[styles.perfDot, { backgroundColor: theme.background }]} />)}</View>
                        <View style={styles.perforationsRight}>{[1, 2, 3, 4, 5, 6, 7, 8].map(i => <View key={i} style={[styles.perfDot, { backgroundColor: theme.background }]} />)}</View>
                        <View style={[styles.pendingIconContainer, { backgroundColor: theme.tint + '15' }]}>
                            <FontAwesome name="hourglass-half" size={24} color={theme.tint} />
                        </View>
                        <Text style={[styles.pendingTitle, { color: theme.text }]}>{language === 'es' ? 'Rollo Pendiente' : 'Pending Roll'}</Text>
                        <Text style={[styles.pendingSubtitle, { color: theme.textSecondary, textAlign: 'center', marginBottom: 25, paddingHorizontal: 20 }]}>
                            {language === 'es' ? 'Tienes ' : 'You have '}
                            <Text style={{ color: theme.tint, fontWeight: 'bold' }}>{(event.photoCount || 0) + pendingPhotos.length} {t('stats_photos')}</Text>
                            {language === 'es' ? ' esperando a ser reveladas' : ' waiting to be revealed'}
                        </Text>
                        <TouchableOpacity style={[styles.revealBtn, { backgroundColor: theme.tint }]} onPress={handleReveal}>
                            <FontAwesome name="magic" size={14} color="#FFF" style={{ marginRight: 8 }} />
                            <Text style={{ color: '#FFF', fontSize: 15, fontWeight: 'bold' }}>{t('action_reveal')}</Text>
                        </TouchableOpacity>
                        <Text style={[styles.waitText, { color: theme.textSecondary, marginTop: 20 }]}>{t('wait_time_instant')}</Text>
                    </View>
                )}

                {/* Revealed Roll Card */}
                {(event.status === 'expired' || event.status === 'finished') && (
                    <View style={[styles.pendingCard, { backgroundColor: theme.card, borderColor: theme.border, paddingVertical: 40, marginTop: 20 }]}>
                        <View style={styles.perforationsLeft}>{[1, 2, 3, 4, 5, 6, 7, 8].map(i => <View key={i} style={[styles.perfDot, { backgroundColor: theme.background }]} />)}</View>
                        <View style={styles.perforationsRight}>{[1, 2, 3, 4, 5, 6, 7, 8].map(i => <View key={i} style={[styles.perfDot, { backgroundColor: theme.background }]} />)}</View>
                        <View style={[styles.pendingIconContainer, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
                            <FontAwesome name="check" size={28} color="#4CAF50" />
                        </View>
                        <Text style={[styles.pendingTitle, { color: theme.text }]}>{t('revealed_roll')}</Text>
                        <Text style={[styles.pendingSubtitle, { color: theme.textSecondary, textAlign: 'center', marginBottom: 0, paddingHorizontal: 20 }]}>
                            {language === 'es' ? '¡Tu carrete ha sido revelado! Tienes ' : 'Your roll has been revealed! You have '}
                            <Text style={{ color: '#4CAF50', fontWeight: 'bold' }}>{photos.length} {t('stats_photos')}</Text>
                            {language === 'es' ? ' listas para ver.' : ' ready to view.'}
                        </Text>
                    </View>
                )}

                <View style={[styles.galleryHeader, { marginTop: 30 }]}>
                    <Text style={[styles.galleryTitle, { color: theme.text }]}>{t('gallery_title')}</Text>
                    <Text style={[styles.galleryCount, { color: theme.tint }]}>{(event.photoCount || 0) + pendingPhotos.length}/{event.maxPhotos} {t('stats_photos')}</Text>
                </View>

                <View style={styles.grid}>
                    {[...pendingPhotos, ...photos].map((photo, index) => {
                        const isRevealed = event.status === 'expired' || event.status === 'finished' || photo.id?.toString().startsWith('temp-');
                        const isPending = photo.id?.toString().startsWith('temp-');

                        return (
                            <TouchableOpacity
                                key={photo.id || index}
                                style={[styles.photoCard, { backgroundColor: theme.card }]}
                                onPress={() => {
                                    if (!isPending) {
                                        setSelectedPhotoIndex(index);
                                        setViewerVisible(true);
                                    }
                                }}
                                disabled={!isRevealed || isPending}
                                activeOpacity={0.8}
                            >
                                {isRevealed ? (
                                    <>
                                        <Image
                                            source={{ uri: photo.url }}
                                            style={[styles.photo, isPending && { opacity: 0.6 }]}
                                            contentFit="cover"
                                            transition={200}
                                            cachePolicy="disk"
                                        />
                                        {photo.type === 'video' && (
                                            <View style={styles.videoIndicator}>
                                                <FontAwesome name="play" size={10} color="#FFF" />
                                            </View>
                                        )}
                                        {isPending && (
                                            <View style={styles.pendingIndicator}>
                                                <ActivityIndicator size="small" color={theme.tint} />
                                            </View>
                                        )}
                                        <Text style={[styles.photoTimestamp, { color: '#FFF' }]}>
                                            {new Date(photo.timestamp?.toDate ? photo.timestamp.toDate() : photo.timestamp).toLocaleTimeString(language === 'es' ? 'es-ES' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                    </>
                                ) : (
                                    <View style={[styles.hiddenPhoto, { backgroundColor: theme.card }]}>
                                        <FontAwesome name="lock" size={20} color={theme.textSecondary} />
                                        <Text style={[styles.hiddenText, { color: theme.text }]}>{t('see_on_reveal')}</Text>
                                        <Text style={[styles.hiddenSubText, { color: theme.textSecondary }]}>
                                            {photo.userName || t('visitor')}
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}

                    {event.status === 'active' && ([...pendingPhotos, ...photos]).length < event.maxPhotos && (
                        <TouchableOpacity
                            style={[styles.photoPlaceholder, { borderColor: theme.border }]}
                            onPress={isUnlocked || !event.pin ? handleTakePhoto : () => setPinVisible(true)}
                        >
                            <FontAwesome name="plus" size={20} color={theme.border} />
                            <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>{t('capture_more')}</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {([...pendingPhotos, ...photos]).length === 0 && (
                    <View style={styles.emptyContainer}>
                        <FontAwesome name="camera-retro" size={40} color={theme.textSecondary} />
                        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{t('empty_roll')}</Text>
                    </View>
                )}

                <View style={{ height: 60 + insets.bottom }} />
            </ScrollView>

            {event.status === 'active' && (
                <TouchableOpacity
                    style={[styles.fab, { bottom: 30 + insets.bottom, backgroundColor: theme.tint }]}
                    onPress={handleTakePhoto}
                >
                    <LinearGradient colors={[theme.tint, theme.tint]} style={styles.fabGradient}>
                        <FontAwesome name="camera" size={24} color="#FFF" />
                    </LinearGradient>
                </TouchableOpacity>
            )}

            <CameraModal
                isVisible={isCameraVisible}
                onClose={() => setIsCameraVisible(false)}
                onCapture={onCapture}
                maxPhotos={event.maxPhotos}
                currentPhotos={(event.photoCount || 0) + pendingPhotos.length}
                pendingPhotos={pendingPhotos}
                sessionHistory={sessionHistory}
                allPhotos={photos}
                isProcessing={isProcessing}
                onDeletePhoto={handleDeletePhoto}
                eventName={event.name}
            />

            {/* iOS Time Picker Modal */}
            {Platform.OS === 'ios' && showTimePicker && (
                <Modal
                    transparent
                    animationType="fade"
                    visible={showTimePicker}
                    onRequestClose={() => setShowTimePicker(false)}
                >
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setShowTimePicker(false)}
                    >
                        <View style={[styles.menuContent, { backgroundColor: theme.card, padding: 20, width: '90%', borderRadius: 25, alignItems: 'center' }]}>
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.text, marginBottom: 15 }}>{t('time_label')}</Text>
                            <DateTimePicker
                                value={tempDate}
                                mode="time"
                                display="spinner"
                                onChange={(_, date) => date && setTempDate(date)}
                                textColor={theme.text}
                                style={{ width: '100%', height: 150 }}
                            />
                            <View style={{ flexDirection: 'row', marginTop: 20, width: '100%', justifyContent: 'space-between' }}>
                                <TouchableOpacity
                                    onPress={() => setShowTimePicker(false)}
                                    style={{ padding: 15, flex: 1, alignItems: 'center' }}
                                >
                                    <Text style={{ color: theme.textSecondary }}>{t('cancel')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => { setShowTimePicker(false); saveNewTime(tempDate); }}
                                    style={{ padding: 15, flex: 1, alignItems: 'center', backgroundColor: theme.tint, borderRadius: 15 }}
                                >
                                    <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{language === 'es' ? 'Guardar' : 'Save'}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableOpacity>
                </Modal>
            )}

            {/* Android Time Picker */}
            {Platform.OS === 'android' && showTimePicker && (
                <DateTimePicker
                    value={tempDate}
                    mode="time"
                    display="default"
                    onChange={onAndroidTimeChange}
                />
            )}
            <PhotoViewerModal
                isVisible={viewerVisible}
                onClose={() => setViewerVisible(false)}
                photos={[...pendingPhotos, ...photos]}
                initialIndex={selectedPhotoIndex}
                onDelete={handleDeletePhoto}
                onToggleLike={handleToggleLikePhoto}
                eventName={event.name}
            />
            <EventShareModal
                isVisible={shareModalVisible}
                onClose={() => setShareModalVisible(false)}
                eventCode={event.code || ""}
                eventName={event.name}
                photoCount={(event.photoCount || 0) + pendingPhotos.length}
                isFinished={event.status === 'finished' || event.status === 'expired'}
            />
            <SetPinModal
                isVisible={isSetPinVisible}
                onClose={() => setIsSetPinVisible(false)}
                onSuccess={handleSetPinSuccess}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    coverSection: {
        height: 380,
        position: 'relative',
    },
    coverImage: {
        width: '100%',
        height: '100%',
    },
    coverOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
        padding: 20,
    },
    topNav: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    topNavRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    circleBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    coverInfo: {
        marginBottom: 20,
    },
    tagContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        alignSelf: 'flex-start',
        marginBottom: 12,
        gap: 6,
    },
    tagText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    eventTitle: {
        color: '#FFF',
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    locationText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        fontWeight: '500',
    },
    infoGridContainer: {
        borderRadius: 30,
        padding: 25,
        borderWidth: 1,
    },
    infoGrid: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        gap: 20,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    infoIconBg: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoTextContainer: {
        marginLeft: 12,
    },
    infoLabel: {
        fontSize: 9,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    infoValue: {
        fontSize: 13,
        fontWeight: 'bold',
        marginTop: 2,
    },
    eventDescription: {
        fontSize: 14,
        lineHeight: 22,
    },
    attendeesContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarStack: {
        flexDirection: 'row',
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    attendeesText: {
        fontSize: 12,
        marginLeft: 10,
    },
    pendingCard: {
        borderRadius: 25,
        padding: 25,
        alignItems: 'center',
        marginBottom: 30,
        borderWidth: 1,
        position: 'relative',
        overflow: 'hidden',
    },
    pendingIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
        zIndex: 2,
    },
    perforationsLeft: {
        position: 'absolute',
        left: 8,
        top: 0,
        bottom: 0,
        justifyContent: 'space-around',
        paddingVertical: 10,
    },
    perforationsRight: {
        position: 'absolute',
        right: 8,
        top: 0,
        bottom: 0,
        justifyContent: 'space-around',
        paddingVertical: 10,
    },
    perfDot: {
        width: 4,
        height: 8,
        borderRadius: 2,
    },
    pendingTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    pendingSubtitle: {
        fontSize: 11,
        marginBottom: 20,
    },
    revealBtn: {
        paddingHorizontal: 25,
        paddingVertical: 12,
        borderRadius: 15,
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    fab: {
        position: 'absolute',
        bottom: 30,
        right: 20,
        width: 60,
        height: 60,
        borderRadius: 30,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        zIndex: 999,
    },
    fabGradient: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 30,
    },
    waitText: {
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    galleryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    galleryTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    galleryCount: {
        fontSize: 11,
        fontWeight: 'bold',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    photoCard: {
        width: COLUMN_WIDTH,
        height: COLUMN_WIDTH * 1.3,
        borderRadius: 15,
        overflow: 'hidden',
    },
    photoPlaceholder: {
        width: COLUMN_WIDTH,
        height: COLUMN_WIDTH * 1.3,
        borderRadius: 15,
        borderWidth: 1,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    placeholderText: {
        fontSize: 10,
        textAlign: 'center',
        marginTop: 10,
    },
    photo: {
        width: '100%',
        height: '100%',
    },
    hiddenPhoto: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 10,
    },
    hiddenText: {
        fontSize: 12,
        fontWeight: 'bold',
        marginTop: 10,
    },
    hiddenSubText: {
        fontSize: 10,
        textAlign: 'center',
        marginTop: 4,
    },
    photoTimestamp: {
        position: 'absolute',
        bottom: 12,
        left: 12,
        fontSize: 9,
        fontWeight: 'bold',
        opacity: 0.8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    menuContent: {
        borderTopLeftRadius: 35,
        borderTopRightRadius: 35,
        padding: 30,
        borderWidth: 1,
        borderBottomWidth: 0,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 18,
        borderBottomWidth: 1,
    },
    menuText: {
        fontSize: 16,
        marginLeft: 15,
        fontWeight: 'bold',
    },
    menuTextDestructive: {
        color: '#FF3B30',
        fontSize: 16,
        marginLeft: 15,
        fontWeight: 'bold',
    },
    emptyContainer: {
        width: '100%',
        paddingVertical: 50,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
        marginTop: 15,
    },
    videoIndicator: {
        position: 'absolute',
        top: 10,
        left: 10,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pendingIndicator: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    lockedContainer: {
        alignItems: 'center',
        padding: 30,
        width: '100%',
    },
    lockedIconBg: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 25,
    },
    lockedTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    lockedSubtitle: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 30,
        paddingHorizontal: 40,
        lineHeight: 20,
    },
    lockedButton: {
        paddingHorizontal: 40,
        paddingVertical: 15,
        borderRadius: 20,
        shadowColor: '#FF6B00',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    lockedButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    modalHandle: {
        width: 40,
        height: 5,
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 25,
    },
});
