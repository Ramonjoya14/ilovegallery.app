import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import React, { useState } from 'react';
import {
    Animated,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useAlert } from '../context/AlertContext';
import { useSettings } from '../context/AppSettingsContext';

interface EventShareModalProps {
    isVisible: boolean;
    onClose: () => void;
    eventCode: string;
    eventName: string;
    photoCount: number;
    isFinished: boolean;
}

export default function EventShareModal({ isVisible, onClose, eventCode, eventName, photoCount, isFinished }: EventShareModalProps) {
    const { theme, t, language } = useSettings();
    const { showAlert } = useAlert();
    const [copied, setCopied] = useState(false);
    const scaleAnim = React.useRef(new Animated.Value(0.9)).current;
    const opacityAnim = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        if (isVisible) {
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    useNativeDriver: true,
                    tension: 50,
                    friction: 7
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true
                })
            ]).start();
        } else {
            scaleAnim.setValue(0.9);
            opacityAnim.setValue(0);
            setCopied(false);
        }
    }, [isVisible]);

    const handleCopyCode = async () => {
        await Clipboard.setStringAsync(eventCode);
        showAlert({
            title: language === 'es' ? "¡Código Copiado!" : "Code Copied!",
            message: language === 'es' ? "Usa este código en la app para unirte al evento." : "Use this code in the app to join the event.",
            type: 'success'
        });
    };

    if (!isVisible) return null;

    return (
        <Modal
            transparent
            visible={isVisible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    onPress={onClose}
                    activeOpacity={1}
                />

                <Animated.View
                    style={[
                        styles.content,
                        {
                            backgroundColor: theme.card,
                            borderColor: theme.border,
                            transform: [{ scale: scaleAnim }],
                            opacity: opacityAnim
                        }
                    ]}
                >
                    {/* Decorative Background Circles */}
                    <View style={[styles.decorCircle, { backgroundColor: theme.tint, top: -20, right: -20 }]} />
                    <View style={[styles.decorCircle, { backgroundColor: theme.tint, bottom: -40, left: -40, width: 100, height: 100 }]} />

                    <View style={styles.header}>
                        <View style={[styles.iconContainer, { backgroundColor: theme.tint + '20' }]}>
                            <Ionicons name="key-outline" size={32} color={theme.tint} />
                        </View>
                        <Text style={[styles.title, { color: theme.text }]}>
                            {language === 'es' ? 'Código de Acceso' : 'Access Code'}
                        </Text>
                    </View>

                    {photoCount >= 3 && isFinished ? (
                        <>
                            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                                {language === 'es'
                                    ? `Comparte este código con tus amigos para que puedan clonar tu carrete "${eventName}"`
                                    : `Share this code with your friends so they can clone your roll "${eventName}"`
                                }
                            </Text>

                            <View style={styles.codeSection}>
                                <TouchableOpacity style={[styles.codeCard, { backgroundColor: theme.background, borderColor: theme.border, width: '100%', justifyContent: 'center' }]} onPress={handleCopyCode}>
                                    <Text style={[styles.codeValue, { color: theme.tint }]}>{eventCode}</Text>
                                    <Ionicons name="copy-outline" size={20} color={theme.textSecondary} style={{ marginLeft: 10 }} />
                                </TouchableOpacity>
                                <Text style={[styles.copyHint, { color: theme.textSecondary }]}>
                                    {language === 'es' ? 'Toca para copiar código' : 'Tap to copy code'}
                                </Text>
                            </View>

                            <View style={[styles.footer, { marginTop: 10 }]}>
                                <View style={styles.infoRow}>
                                    <Ionicons name="sync-outline" size={16} color={theme.tint} />
                                    <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                                        {language === 'es' ? 'Cada copia es independiente' : 'Each copy is independent'}
                                    </Text>
                                </View>
                            </View>
                        </>
                    ) : (
                        <View style={styles.requirementSection}>
                            <View style={[styles.warningIconBg, { backgroundColor: '#FF3B3020' }]}>
                                <Ionicons name="alert-circle-outline" size={40} color="#FF3B30" />
                            </View>
                            <Text style={[styles.requirementTitle, { color: theme.text }]}>
                                {language === 'es' ? 'Aún no puedes compartir' : 'Cannnot share yet'}
                            </Text>
                            <Text style={[styles.requirementText, { color: theme.textSecondary }]}>
                                {language === 'es'
                                    ? 'Para compartir este carrete, debes tener al menos 3 fotos y el evento debe estar revelado.'
                                    : 'To share this roll, you must have at least 3 photos and the event must be revealed.'
                                }
                            </Text>

                            <View style={styles.statsRow}>
                                <View style={styles.statItem}>
                                    <Ionicons name={photoCount >= 3 ? "checkmark-circle" : "close-circle"} size={20} color={photoCount >= 3 ? "#4CAF50" : "#FF3B30"} />
                                    <Text style={[styles.statText, { color: theme.text }]}>{photoCount}/3 {t('stats_photos')}</Text>
                                </View>
                                <View style={styles.statItem}>
                                    <Ionicons name={isFinished ? "checkmark-circle" : "close-circle"} size={20} color={isFinished ? "#4CAF50" : "#FF3B30"} />
                                    <Text style={[styles.statText, { color: theme.text }]}>{isFinished ? (language === 'es' ? 'Revelado' : 'Revealed') : (language === 'es' ? 'En Vivo' : 'Live')}</Text>
                                </View>
                            </View>
                        </View>
                    )}

                    <TouchableOpacity
                        style={[styles.closeButton, { backgroundColor: theme.border }]}
                        onPress={onClose}
                    >
                        <Text style={[styles.closeButtonText, { color: theme.text }]}>{t('cancel')}</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    content: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 32,
        padding: 30,
        borderWidth: 1,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    decorCircle: {
        position: 'absolute',
        width: 80,
        height: 80,
        borderRadius: 40,
        opacity: 0.05,
    },
    header: {
        alignItems: 'center',
        marginBottom: 25,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: 10,
    },
    linkTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 8,
        letterSpacing: 1,
        textAlign: 'center',
    },
    codeSection: {
        width: '100%',
        alignItems: 'center',
        marginBottom: 20,
    },
    codeLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 8,
        letterSpacing: 1,
    },
    codeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        gap: 10,
    },
    codeValue: {
        fontSize: 24,
        fontWeight: 'bold',
        letterSpacing: 4,
    },
    linkContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 25,
    },
    linkText: {
        flex: 1,
        fontSize: 13,
        marginRight: 10,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    copyBtn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
    },
    footer: {
        marginBottom: 25,
        gap: 12,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    infoText: {
        fontSize: 13,
        fontWeight: '500',
    },
    closeButton: {
        height: 54,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    requirementSection: {
        alignItems: 'center',
        paddingVertical: 10,
    },
    warningIconBg: {
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    requirementTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    requirementText: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 15,
        marginBottom: 25,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(0,0,0,0.05)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    copyHint: {
        fontSize: 12,
        marginTop: 8,
        textAlign: 'center',
    },
});
