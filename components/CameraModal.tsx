import { useColorScheme } from '@/components/useColorScheme';
import { useAlert } from '@/context/AlertContext';
import { useSettings } from '@/context/AppSettingsContext';
import { FontAwesome } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { CameraType, CameraView, FlashMode, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as NavigationBar from 'expo-navigation-bar';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, Modal, Platform, Image as RNImage, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

interface CameraModalProps {
    isVisible: boolean;
    onClose: () => void;
    onCapture: (uri: string, type: 'image' | 'video') => Promise<void>;
    maxPhotos: number;
    currentPhotos: number;
    eventName: string;
}

export default function CameraModal({ isVisible, onClose, onCapture, maxPhotos, currentPhotos, eventName }: CameraModalProps) {
    const insets = useSafeAreaInsets();
    const [permission, requestPermission] = useCameraPermissions();
    const [micPermission, requestMicPermission] = useMicrophonePermissions();
    const [type, setType] = useState<CameraType>('back');
    const [flash, setFlash] = useState<FlashMode>('off');
    const [mode, setMode] = useState<'picture' | 'video'>('picture');
    const [isRecording, setIsRecording] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);
    const [showRemaining, setShowRemaining] = useState(true);
    const [recordingTime, setRecordingTime] = useState(0);
    const [lastPhotoUri, setLastPhotoUri] = useState<string | null>(null);
    const { showAlert } = useAlert();
    const { theme, t, language } = useSettings();
    const colorScheme = useColorScheme();
    const cameraRef = useRef<CameraView>(null);
    const recordingInterval = useRef<any>(null);

    useEffect(() => {
        if (Platform.OS === 'android') {
            if (isVisible) {
                NavigationBar.setVisibilityAsync('hidden');
            } else {
                NavigationBar.setVisibilityAsync('visible');
                NavigationBar.setPositionAsync('absolute');
                NavigationBar.setBackgroundColorAsync('#00000000');
                NavigationBar.setButtonStyleAsync(colorScheme === 'dark' ? 'light' : 'dark');
            }
        }
    }, [isVisible, colorScheme]);

    useEffect(() => {
        if (isVisible) {
            if (!permission?.granted) requestPermission();
        }
    }, [isVisible, permission]);

    useEffect(() => {
        if (isVisible) {
            setShowRemaining(true);
            const timer = setTimeout(() => setShowRemaining(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [isVisible, currentPhotos]);

    useEffect(() => {
        if (isRecording) {
            setRecordingTime(0);
            recordingInterval.current = setInterval(() => {
                setRecordingTime(prev => {
                    if (prev >= 29) {
                        handleStopRecording();
                        return 30;
                    }
                    return prev + 1;
                });
            }, 1000);
        } else {
            if (recordingInterval.current) clearInterval(recordingInterval.current);
            setRecordingTime(0);
        }
        return () => {
            if (recordingInterval.current) clearInterval(recordingInterval.current);
        };
    }, [isRecording]);

    if (!permission) {
        return <View />;
    }

    if (!permission.granted) {
        return (
            <Modal visible={isVisible} animationType="slide">
                <View style={[styles.permissionContainer, { backgroundColor: theme.background }]}>
                    <Text style={[styles.permissionText, { color: theme.text }]}>
                        {language === 'es'
                            ? "Necesitamos permiso de cámara para tomar fotos"
                            : "We need camera permission to take photos"}
                    </Text>
                    <TouchableOpacity
                        onPress={requestPermission}
                        style={[styles.permissionBtn, { backgroundColor: theme.tint }]}
                    >
                        <Text style={styles.permissionBtnText}>
                            {language === 'es' ? "Conceder Permiso" : "Grant Permission"}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onClose} style={{ marginTop: 20 }}>
                        <Text style={{ color: theme.textSecondary }}>{t('cancel')}</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        );
    }

    const toggleCameraType = () => {
        setType(current => (current === 'back' ? 'front' : 'back'));
    };

    const toggleFlash = () => {
        setFlash(current => (current === 'off' ? 'on' : 'off'));
    };

    const handleStopRecording = () => {
        if (cameraRef.current && isRecording) {
            cameraRef.current.stopRecording();
        }
    };

    const onCaptureProxy = async (uri: string, type: 'image' | 'video') => {
        setLastPhotoUri(uri);
        // Fire and forget: don't await the parent's onCapture to keep shutter instant
        onCapture(uri, type).catch(e => console.error("Bg upload failed", e));
    };

    const handleGalleryUpload = async () => {
        const remaining = maxPhotos - currentPhotos;

        if (remaining <= 0) {
            showAlert({
                title: t('roll_complete_title'),
                message: t('error_limit_reached'),
                type: 'warning'
            });
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images', 'videos'],
            allowsMultipleSelection: true,
            selectionLimit: remaining,
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            // Process all selected assets
            for (const asset of result.assets) {
                const type = asset.type === 'video' ? 'video' : 'image';
                onCaptureProxy(asset.uri, type);
            }
        }
    };

    const handleCapture = async () => {
        if (isCapturing) return;

        if (currentPhotos >= maxPhotos) {
            showAlert({
                title: t('roll_complete_title'),
                message: t('error_limit_reached'),
                type: 'warning'
            });
            return;
        }

        if (mode === 'picture') {
            if (cameraRef.current) {
                try {
                    setIsCapturing(true);

                    const photoPromise = cameraRef.current.takePictureAsync({
                        quality: 0.7,
                        exif: false,
                        skipProcessing: true,
                    });

                    // Don't await the full processing to unblock UI
                    photoPromise.then(photo => {
                        setIsCapturing(false);
                        if (photo) {
                            onCaptureProxy(photo.uri, 'image');
                        }
                    }).catch(err => {
                        console.error("Error processing photo:", err);
                        setIsCapturing(false);
                    });

                } catch (error) {
                    console.error("Error taking photo:", error);
                    setIsCapturing(false);
                    showAlert({
                        title: t('alert_error'),
                        message: language === 'es' ? "No se pudo tomar la foto." : "Could not take photo.",
                        type: 'error'
                    });
                }
            }
        } else {
            if (isRecording) {
                handleStopRecording();
            } else {
                try {
                    setIsRecording(true);
                    cameraRef.current?.recordAsync({
                        maxDuration: 30,
                    }).then(video => {
                        if (video) {
                            onCaptureProxy(video.uri, 'video');
                        }
                    }).catch(e => console.error("Video record error", e))
                        .finally(() => setIsRecording(false));

                } catch (error) {
                    console.error("Error recording video:", error);
                    setIsRecording(false);
                }
            }
        }
    };

    const remaining = maxPhotos - currentPhotos;

    return (
        <Modal visible={isVisible} animationType="slide" transparent={false}>
            <View style={styles.container}>
                <CameraView
                    style={styles.camera}
                    facing={type}
                    flash={flash}
                    ref={cameraRef}
                    mode={mode}
                >
                    <LinearGradient
                        colors={['rgba(0,0,0,0.6)', 'transparent', 'rgba(0,0,0,0.8)']}
                        style={[styles.overlay, { justifyContent: 'space-between' }]}
                    >
                        {/* Top Bar */}
                        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 20) }]}>
                            <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
                                <FontAwesome name="times" size={24} color="#FFF" />
                            </TouchableOpacity>

                            <View style={styles.headerInfoGroup}>
                                <Text style={styles.headerEventName} numberOfLines={1}>{eventName}</Text>
                                <Text style={styles.headerCounter}>{currentPhotos}/{maxPhotos}</Text>
                            </View>

                            <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
                                <FontAwesome name="check" size={22} color="#FF6B00" />
                            </TouchableOpacity>
                        </View>

                        {/* Side Tools */}
                        <View style={styles.sideTools}>
                            <TouchableOpacity onPress={toggleFlash} style={styles.sideBtn}>
                                <FontAwesome name={flash === 'on' ? "bolt" : "toggle-off"} size={22} color="#FFF" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={toggleCameraType} style={styles.sideBtn}>
                                <FontAwesome name="refresh" size={22} color="#FFF" />
                            </TouchableOpacity>
                        </View>

                        {/* Bottom Section */}
                        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                            <View style={styles.modeSelector}>
                                <TouchableOpacity onPress={async () => {
                                    if (isRecording) return;
                                    if (!micPermission?.granted) {
                                        const { granted } = await requestMicPermission();
                                        if (!granted) {
                                            showAlert({
                                                title: language === 'es' ? 'Permiso requerido' : 'Permission required',
                                                message: language === 'es' ? 'Se requiere micrófono para grabar video.' : 'Microphone is required to record video.',
                                                type: 'warning'
                                            });
                                            return;
                                        }
                                    }
                                    setMode('video');
                                }} style={styles.modeItem}>
                                    <View style={styles.modeItemContent}>
                                        <Text style={[styles.modeText, mode === 'video' && styles.modeTextActive]}>30 s</Text>
                                        {isRecording && mode === 'video' && (
                                            <View style={styles.recordingTimerDot} />
                                        )}
                                    </View>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => !isRecording && setMode('picture')} style={styles.modeItem}>
                                    <Text style={[styles.modeText, mode === 'picture' && styles.modeTextActive]}>FOTO</Text>
                                </TouchableOpacity>
                            </View>

                            {isRecording && (
                                <View style={styles.timerBadge}>
                                    <Text style={styles.timerText}>00:{recordingTime < 10 ? `0${recordingTime}` : recordingTime}</Text>
                                </View>
                            )}

                            <View style={styles.captureRow}>
                                <View style={styles.thumbnail}>
                                    {lastPhotoUri ? (
                                        <RNImage source={{ uri: lastPhotoUri }} style={styles.thumbnailImage} />
                                    ) : (
                                        <View style={styles.thumbnailInner} />
                                    )}
                                </View>

                                <TouchableOpacity onPress={handleCapture} activeOpacity={0.8} style={styles.captureBtnContainer}>
                                    <View style={[styles.captureBtnOuter, mode === 'video' && { borderColor: '#FF3B30' }]}>
                                        <View style={[
                                            styles.captureBtnInner,
                                            mode === 'video' ? { backgroundColor: '#FF3B30' } : { backgroundColor: '#FFF' },
                                            isRecording && { borderRadius: 5, transform: [{ scale: 0.6 }] },
                                        ]} />
                                    </View>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.uploadBtn} onPress={handleGalleryUpload}>
                                    <LinearGradient colors={['#FF8C00', '#FF6B00']} style={styles.uploadBtnBg}>
                                        <FontAwesome name="image" size={20} color="#FFF" />
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.usedRollContainer}>
                                <Text style={[styles.usedRollText, { color: theme.tint }]}>{Math.round((currentPhotos / maxPhotos) * 100)}%</Text>
                                <Text style={[styles.usedRollLabel, { color: theme.textSecondary }]}>
                                    {language === 'es' ? 'del rollo usado' : 'of the roll used'}
                                </Text>
                            </View>
                        </View>
                    </LinearGradient>
                </CameraView>

                {/* Remaining Counter Overlay - Centered and Stable outside flex containers */}
                {showRemaining && (
                    <View style={styles.remainingOverlayWrapper} pointerEvents="none">
                        <BlurView intensity={80} tint="dark" style={styles.remainingCard}>
                            <Text style={styles.remainingNumber}>{remaining}</Text>
                            <Text style={[styles.remainingText, { color: theme.textSecondary }]}>
                                {language === 'es' ? 'RESTANTES' : 'REMAINING'}
                            </Text>
                        </BlurView>
                    </View>
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    camera: {
        flex: 1,
    },
    permissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#150F0B',
        padding: 20,
    },
    permissionText: {
        color: '#FFF',
        fontSize: 18,
        textAlign: 'center',
        marginBottom: 20,
    },
    permissionBtn: {
        backgroundColor: '#FF6B00',
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 25,
    },
    permissionBtnText: {
        color: '#FFF',
        fontWeight: 'bold',
    },
    overlay: {
        flex: 1,
        // Using insets.top for better safe area handling
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        // Dynamically add top padding
    },
    headerInfoGroup: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    headerEventName: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    headerCounter: {
        color: '#8E8E93',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2,
    },
    iconBtn: {
        padding: 10,
    },
    sideTools: {
        position: 'absolute',
        right: 15,
        top: 100,
        alignItems: 'center',
    },
    sideBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    remainingOverlayWrapper: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    remainingCard: {
        width: 140,
        height: 140,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    remainingNumber: {
        color: '#FF6B00',
        fontSize: 56,
        fontWeight: 'bold',
    },
    remainingText: {
        fontSize: 12,
        fontWeight: 'bold',
        marginTop: 5,
        letterSpacing: 1,
    },
    bottomBar: {
        // paddingBottom handled dynamically in component
        alignItems: 'center',
    },
    modeSelector: {
        flexDirection: 'row',
        marginBottom: 20,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 8,
    },
    modeItem: {
        marginHorizontal: 15,
    },
    modeText: {
        color: '#AAA',
        fontSize: 13,
        fontWeight: 'bold',
    },
    modeTextActive: {
        color: '#FFF',
    },
    captureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        justifyContent: 'space-evenly',
    },
    captureBtnContainer: {
        width: 80,
        height: 80,
        justifyContent: 'center',
        alignItems: 'center',
    },
    captureBtnOuter: {
        width: 76,
        height: 76,
        borderRadius: 38,
        borderWidth: 4,
        borderColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    captureBtnInner: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#FFF',
    },
    thumbnail: {
        width: 44,
        height: 44,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#FFF',
        overflow: 'hidden',
    },
    thumbnailInner: {
        flex: 1,
        backgroundColor: '#1E1915',
        borderWidth: 1,
        borderColor: '#2A221B',
    },
    thumbnailImage: {
        flex: 1,
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    uploadBtn: {
        width: 50,
        height: 50,
        borderRadius: 25,
        overflow: 'hidden',
    },
    uploadBtnBg: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    usedRollContainer: {
        marginTop: 20,
        alignItems: 'center',
    },
    usedRollText: {
        color: '#FF6B00', // Brand Orange
        fontSize: 16,
        fontWeight: 'bold',
    },
    usedRollLabel: {
        color: '#AAA',
        fontSize: 10,
        marginTop: 2,
    },
    modeItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    recordingTimerDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#FF3B30',
        marginLeft: 6,
    },
    timerBadge: {
        backgroundColor: 'rgba(255, 59, 48, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: 'rgba(255, 59, 48, 0.3)',
    },
    timerText: {
        color: '#FF3B30',
        fontSize: 14,
        fontWeight: 'bold',
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    bgUploadBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: 15,
    },
    bgUploadText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
    }
});
