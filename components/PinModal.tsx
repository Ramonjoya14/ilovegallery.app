import { useSettings } from '@/context/AppSettingsContext';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    Vibration,
    View
} from 'react-native';

interface PinModalProps {
    isVisible: boolean;
    correctPin: string;
    onSuccess: () => void;
    onClose: () => void;
}

export default function PinModal({ isVisible, correctPin, onSuccess, onClose }: PinModalProps) {
    const { t } = useSettings();
    const [pin, setPin] = useState('');
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (pin.length === 6) {
            handleVerify();
        }
    }, [pin]);

    const handleVerify = async () => {
        setLoading(true);
        // Add a small delay for feel
        await new Promise(resolve => setTimeout(resolve, 500));

        if (pin === correctPin) {
            onSuccess();
        } else {
            setError(true);
            setPin('');
            Vibration.vibrate();
            setTimeout(() => setError(false), 2000);
        }
        setLoading(false);
    };

    const handleNumberPress = (num: string) => {
        if (pin.length < 6) {
            setPin(prev => prev + num);
        }
    };

    const handleDelete = () => {
        setPin(prev => prev.slice(0, -1));
    };

    const renderDot = (index: number) => {
        const isActive = pin.length > index;
        return (
            <View
                key={index}
                style={[
                    styles.dot,
                    isActive && styles.dotActive,
                    error && styles.dotError
                ]}
            />
        );
    };

    return (
        <Modal
            visible={isVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                {Platform.OS !== 'web' ? (
                    <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
                ) : (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.9)' }]} />
                )}

                <View style={styles.content}>
                    <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                        <Ionicons name="close" size={24} color="#FFF" />
                    </TouchableOpacity>

                    <View style={styles.iconContainer}>
                        <View style={styles.lockIconCircle}>
                            <FontAwesome name="lock" size={30} color="#FF6B00" />
                        </View>
                    </View>

                    <Text style={styles.title}>{t('event_private_title')}</Text>
                    <Text style={styles.subtitle}>{t('event_private_subtitle')}</Text>

                    <View style={styles.dotsContainer}>
                        {[0, 1, 2, 3, 4, 5].map(renderDot)}
                    </View>

                    {error && (
                        <Text style={styles.errorText}>{t('pin_error')}</Text>
                    )}

                    {loading && (
                        <ActivityIndicator color="#FF6B00" style={{ marginTop: 20 }} />
                    )}

                    <View style={styles.keypad}>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                            <TouchableOpacity
                                key={num}
                                style={styles.key}
                                onPress={() => handleNumberPress(num.toString())}
                            >
                                <Text style={styles.keyText}>{num}</Text>
                            </TouchableOpacity>
                        ))}
                        <View style={styles.keyPlaceholder} />
                        <TouchableOpacity
                            style={styles.key}
                            onPress={() => handleNumberPress('0')}
                        >
                            <Text style={styles.keyText}>0</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.key}
                            onPress={handleDelete}
                        >
                            <Ionicons name="backspace-outline" size={24} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        width: '90%',
        maxWidth: 400,
        backgroundColor: '#1E1915',
        borderRadius: 40,
        padding: 30,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#2A221B',
    },
    closeBtn: {
        position: 'absolute',
        top: 20,
        right: 20,
    },
    iconContainer: {
        marginBottom: 20,
    },
    lockIconCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(255, 107, 0, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        color: '#FFF',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    subtitle: {
        color: '#8E8E93',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 20,
    },
    dotsContainer: {
        flexDirection: 'row',
        gap: 20,
        marginBottom: 30,
    },
    dot: {
        width: 15,
        height: 15,
        borderRadius: 7.5,
        backgroundColor: '#2A221B',
        borderWidth: 1,
        borderColor: '#3E3228',
    },
    dotActive: {
        backgroundColor: '#FF6B00',
        borderColor: '#FF6B00',
    },
    dotError: {
        backgroundColor: '#FF3B30',
        borderColor: '#FF3B30',
    },
    errorText: {
        color: '#FF3B30',
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 20,
    },
    keypad: {
        width: '100%',
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
    },
    key: {
        width: '30%',
        height: 70,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    keyPlaceholder: {
        width: '30%',
    },
    keyText: {
        color: '#FFF',
        fontSize: 24,
        fontWeight: '600',
    },
});
