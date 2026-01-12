import { useAlert } from '@/context/AlertContext';
import { useSettings } from '@/context/AppSettingsContext';
import { auth } from '@/lib/firebase';
import { databaseService } from '@/services/database';
import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import * as NavigationBar from 'expo-navigation-bar';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Modal,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Photo {
    id?: string;
    url: string;
    type?: 'image' | 'video';
    timestamp?: any;
    userName?: string;
    caption?: string;
    isLiked?: boolean;
}

interface PhotoViewerModalProps {
    isVisible: boolean;
    onClose: () => void;
    photos: Photo[];
    initialIndex: number;
    onDelete?: (photoId: string) => void;
    onToggleLike?: (photoId: string, isLiked: boolean) => void;
    eventName?: string;
    showExtraActions?: boolean;
}

const { width, height } = Dimensions.get('window');

const MediaItem = React.memo(({ item, isFocused }: { item: Photo, isFocused: boolean }) => {
    const { width, height } = Dimensions.get('window');
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [retryKey, setRetryKey] = useState(0);

    useEffect(() => {
        setIsLoading(true);
        setHasError(false);
    }, [item.url, item.type, retryKey]);

    const handleRetry = () => {
        setRetryKey(prev => prev + 1);
    };

    if (item.type === 'video') {
        return (
            <View style={[styles.mediaContainer, { width, height }]}>
                {isLoading && (
                    <ActivityIndicator size="large" color="#FFF" style={StyleSheet.absoluteFill} />
                )}
                <Video
                    key={`${item.url}-${retryKey}`}
                    source={{ uri: item.url }}
                    style={styles.media}
                    resizeMode={ResizeMode.CONTAIN}
                    shouldPlay={isFocused}
                    useNativeControls
                    isLooping
                    onLoadStart={() => setIsLoading(true)}
                    onLoad={() => setIsLoading(false)}
                    onError={() => { setIsLoading(false); setHasError(true); }}
                />
                {hasError && (
                    <View style={StyleSheet.absoluteFillObject}>
                        <Ionicons name="alert-circle" size={50} color="#FF6B00" style={{ alignSelf: 'center', top: '45%' }} />
                        <Text style={{ color: '#FFF', textAlign: 'center', top: '45%' }}>Error loading video</Text>
                        <TouchableOpacity onPress={handleRetry} style={{ alignSelf: 'center', top: '50%', padding: 10 }}>
                            <Text style={{ color: '#FF6B00', fontWeight: 'bold' }}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    }

    return (
        <View style={[styles.mediaContainer, { width, height }]}>
            {isLoading && (
                <ActivityIndicator size="large" color="#FFF" style={StyleSheet.absoluteFill} />
            )}
            <Image
                key={`${item.url}-${retryKey}`}
                source={{ uri: item.url }}
                style={styles.media}
                contentFit="contain" // Changed from resizeMode
                transition={200} // Added transition
                onLoadStart={() => setIsLoading(true)}
                onLoad={() => setIsLoading(false)} // Changed from onLoadEnd to onLoad for expo-image
                onError={(e) => {
                    console.log("Image load error:", e.error, item.url); // Changed e.nativeEvent.error to e.error
                    setIsLoading(false);
                    setHasError(true);
                }}
            />
            {hasError && (
                <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}>
                    <Ionicons name="image-outline" size={60} color="#333" />
                    <Text style={{ color: '#666', marginTop: 10 }}>Could not load image</Text>
                    <TouchableOpacity onPress={handleRetry} style={{ marginTop: 20, backgroundColor: '#333', padding: 10, borderRadius: 5 }}>
                        <Text style={{ color: '#FFF' }}>Tap to Retry</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
});

export default function PhotoViewerModal({
    isVisible,
    onClose,
    photos,
    initialIndex,
    onDelete,
    onToggleLike,
    eventName,
    showExtraActions = true
}: PhotoViewerModalProps) {
    const { theme, t } = useSettings();
    const { showAlert } = useAlert();
    const insets = useSafeAreaInsets();
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [localLikedPhotos, setLocalLikedPhotos] = useState<Record<string, boolean>>({});
    const flatListRef = useRef<FlatList>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (Platform.OS === 'android') {
            if (isVisible) {
                NavigationBar.setVisibilityAsync('hidden');
            } else {
                // Return visibility ONLY if we are closing the viewer and camera is NOT visible
                // But since CameraModal also handles this, it's safer to just set it to visible when closing
                NavigationBar.setVisibilityAsync('visible');
            }
        }
    }, [isVisible]);

    // Sync initial index when modal opens
    useEffect(() => {
        if (isVisible && photos.length > 0) {
            setCurrentIndex(initialIndex);
            // Initialize local likes map from photos prop
            const likesMap: Record<string, boolean> = {};
            photos.forEach(p => {
                if (p.id) likesMap[p.id] = p.isLiked || false;
            });
            setLocalLikedPhotos(likesMap);

            // Small timeout to allow layout to settle before scrolling
            setTimeout(() => {
                flatListRef.current?.scrollToIndex({ index: initialIndex, animated: false });
            }, 100);
        }
    }, [isVisible, initialIndex, photos]);

    const currentPhoto = photos[currentIndex];

    // Handle Scroll
    const onMomentumScrollEnd = (e: any) => {
        const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
        if (newIndex >= 0 && newIndex < photos.length) {
            setCurrentIndex(newIndex);
        }
    };

    // Actions
    const handleToggleLike = async () => {
        if (!currentPhoto || !currentPhoto.id) return;

        const newLikedStatus = !isLiked;

        // Update local state for immediate feedback
        setLocalLikedPhotos(prev => ({
            ...prev,
            [currentPhoto.id!]: newLikedStatus
        }));

        try {
            await databaseService.togglePhotoLike(currentPhoto.id, newLikedStatus);
            if (onToggleLike) {
                onToggleLike(currentPhoto.id, newLikedStatus);
            }
        } catch (error) {
            console.error("Error toggling like:", error);
            // Rollback local state on error
            setLocalLikedPhotos(prev => ({
                ...prev,
                [currentPhoto.id!]: !newLikedStatus
            }));
        }
    };

    const isLiked = currentPhoto?.id ? (localLikedPhotos[currentPhoto.id] || false) : false;

    const handleShare = async () => {
        if (!currentPhoto) return;
        try {
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(currentPhoto.url);
            } else {
                showAlert({
                    title: t('alert_error'),
                    message: t('photo_viewer_share_error'),
                    type: 'error'
                });
            }
        } catch (error) {
            console.error("Error sharing:", error);
        }
    };

    const handleSave = async () => {
        if (!currentPhoto) return;
        setIsSaving(true);
        console.log("Iniciando guardado de:", currentPhoto.url, "Tipo:", currentPhoto.type);

        try {
            // 1. Web Download
            if (Platform.OS === 'web') {
                try {
                    const response = await fetch(currentPhoto.url);
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', `iLoveGallery_${Date.now()}${currentPhoto.type === 'video' ? '.mp4' : '.jpg'}`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                    // Success feedback
                    showAlert({
                        title: t('action_save'),
                        message: t('photo_viewer_saved_msg', { type: currentPhoto.type === 'video' ? t('type_video') : t('type_photo') }),
                        type: 'success'
                    });

                    // Add notification
                    if (auth.currentUser) {
                        await databaseService.addNotification({
                            userId: auth.currentUser.uid,
                            type: 'download_success',
                            title: t('notif_download_title'),
                            message: t('notif_download_msg', { type: currentPhoto.type === 'video' ? t('type_video') : t('type_photo') }),
                        });
                    }
                } catch (webErr) {
                    console.error("Error web:", webErr);
                    window.open(currentPhoto.url, '_blank');
                }
                return;
            }

            // 2. Native: Ask Permissions
            try {
                // Request full permissions to ensure we can both SAVE and READ (for albums)
                await MediaLibrary.requestPermissionsAsync();
            } catch (permErr) {
                console.warn("Error requesting permissions:", permErr);
            }

            // 3. Download File
            const fileExt = currentPhoto.type === 'video' ? '.mp4' : '.jpg';
            const fileName = `save_${Date.now()}${fileExt}`;
            const fileUri = (FileSystem.documentDirectory || '') + fileName;

            console.log("Descargando a:", fileUri);
            const { uri } = await FileSystem.downloadAsync(currentPhoto.url, fileUri);
            console.log("Archivo descargado en:", uri);

            // 4. Save to Gallery
            try {
                if (Platform.OS === 'android') {
                    const asset = await MediaLibrary.createAssetAsync(uri);

                    // Optional: Try to organize into custom album
                    try {
                        const albumName = 'iLoveGallery';
                        const album = await MediaLibrary.getAlbumAsync(albumName);
                        if (album == null) {
                            await MediaLibrary.createAlbumAsync(albumName, asset, false);
                        } else {
                            await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
                        }
                    } catch (albumError) {
                        console.warn("Could not add to album, but asset was saved:", albumError);
                    }
                } else {
                    // iOS
                    await MediaLibrary.saveToLibraryAsync(uri);
                }

                showAlert({
                    title: t('photo_viewer_saved_title'),
                    message: t('photo_viewer_saved_msg', { type: currentPhoto.type === 'video' ? t('type_video') : t('type_photo') }),
                    type: 'success'
                });

                // Add notification
                if (auth.currentUser) {
                    await databaseService.addNotification({
                        userId: auth.currentUser.uid,
                        type: 'download_success',
                        title: t('notif_download_title'),
                        message: t('notif_download_msg', { type: currentPhoto.type === 'video' ? t('type_video') : t('type_photo') }),
                    });
                }

            } catch (saveErr: any) {
                console.error("Fallo al guardar en galería:", saveErr);

                // Fallback: Sharing
                if (await Sharing.isAvailableAsync()) {
                    showAlert({
                        title: t('alert_warning'),
                        message: t('photo_viewer_save_warning'),
                        type: 'warning',
                        buttons: [
                            { text: "OK", onPress: async () => await Sharing.shareAsync(uri) }
                        ]
                    });
                } else {
                    throw saveErr;
                }
            }

            // Cleanup
            try {
                await FileSystem.deleteAsync(uri, { idempotent: true });
            } catch (e) { }

        } catch (error: any) {
            console.error("Error general en handleSave:", error);
            showAlert({
                title: "Error",
                message: "No se pudo descargar el archivo. Intentando abrir enlace directo...",
                type: 'error',
                buttons: [
                    {
                        text: "Abrir Enlace",
                        onPress: () => {
                            if (currentPhoto.url) {
                                import('react-native').then(({ Linking }) => Linking.openURL(currentPhoto.url));
                            }
                        }
                    },
                    { text: "Cancelar", style: "cancel" }
                ]
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = () => {
        if (!currentPhoto || !onDelete) return;

        showAlert({
            title: t('action_delete'),
            message: t('confirm_delete_photo'),
            type: 'error',
            buttons: [
                { text: t('cancel'), style: "cancel" },
                {
                    text: t('action_delete'),
                    style: "destructive",
                    onPress: () => {
                        onDelete(currentPhoto.id!);
                        if (photos.length === 1) {
                            onClose();
                        }
                    }
                }
            ]
        });
    };

    const handleInfo = () => {
        if (!currentPhoto) return;
        const date = currentPhoto.timestamp?.toDate ? currentPhoto.timestamp.toDate() : new Date();
        showAlert({
            title: t('action_details'),
            message: `${t('photo_viewer_details_taken_by')}: ${currentPhoto.userName || t('guest')}\n${t('photo_viewer_details_date')}: ${date.toLocaleString()}`,
            type: 'info'
        });
    };

    if (!isVisible) return null;

    if (photos.length === 0) return null;

    return (
        <Modal
            visible={isVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor="#000" />
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.iconButton}>
                        <Ionicons name="chevron-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.counterText}>{currentIndex + 1} / {photos.length}</Text>
                    {showExtraActions ? (
                        <TouchableOpacity style={styles.iconButton} onPress={handleInfo}>
                            <Ionicons name="ellipsis-horizontal" size={24} color="#FFF" />
                        </TouchableOpacity>
                    ) : (
                        <View style={{ width: 40 }} />
                    )}
                </View>

                {/* Main Content */}
                <FlatList
                    ref={flatListRef}
                    data={photos}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(item, index) => item.id || index.toString()}
                    onMomentumScrollEnd={onMomentumScrollEnd}
                    getItemLayout={(_, index) => ({
                        length: width,
                        offset: width * index,
                        index,
                    })}
                    renderItem={({ item, index }) => (
                        <MediaItem item={item} isFocused={index === currentIndex} />
                    )}
                />

                {/* Bottom Action Bar */}
                <View style={[
                    styles.bottomBar,
                    { paddingBottom: Math.max(insets.bottom, 30) + 15 },
                    !showExtraActions && { justifyContent: 'flex-end' }
                ]}>


                    <TouchableOpacity
                        style={[styles.actionItem, !showExtraActions && { marginRight: 25 }]}
                        onPress={handleSave}
                    >
                        <View style={styles.actionIconCircle}>
                            {isSaving ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <Ionicons name="download-outline" size={20} color="#FFF" />
                            )}
                        </View>
                        <Text style={styles.actionText}>{t('action_save')}</Text>
                    </TouchableOpacity>

                    {showExtraActions && (
                        <>
                            <TouchableOpacity style={styles.actionItem} onPress={handleToggleLike}>
                                <View style={styles.actionIconCircle}>
                                    <Ionicons
                                        name={isLiked ? "heart" : "heart-outline"}
                                        size={22}
                                        color={isLiked ? "#FF3B30" : "#FFF"}
                                    />
                                </View>
                                <Text style={styles.actionText}>{isLiked ? t('action_unlike' as any) : t('action_like' as any)}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.actionItem} onPress={handleInfo}>
                                <View style={styles.actionIconCircle}>
                                    <Ionicons name="information-circle-outline" size={20} color="#FFF" />
                                </View>
                                <Text style={styles.actionText}>{t('action_details')}</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    <TouchableOpacity style={styles.actionItem} onPress={handleDelete}>
                        <View style={styles.actionIconCircle}>
                            <Ionicons name="trash-outline" size={20} color="#FFF" />
                        </View>
                        <Text style={styles.actionText}>{t('action_delete')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 15,
        backgroundColor: '#000',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        zIndex: 10,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.5)', // slightly visible bg for better tap target
        justifyContent: 'center',
        alignItems: 'center',
    },
    counterText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
    mediaContainer: {
        width: width,
        height: height,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
    },
    media: {
        width: '100%',
        height: '80%', // Leave space for header/footer
    },
    // infoOverlay styles removed
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingBottom: Platform.OS === 'ios' ? 40 : 25,
        paddingTop: 20,
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#000',
    },
    actionItem: {
        alignItems: 'center',
    },
    actionIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#1C1C1E', // Darker circle background
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    actionText: {
        color: '#8E8E93',
        fontSize: 10,
    },
});
