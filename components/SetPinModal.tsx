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
    View
} from 'react-native';

interface SetPinModalProps {
    isVisible: boolean;
    onSuccess: (pin: string) => void;
    onClose: () => void;
}

export default function SetPinModal({ isVisible, onSuccess, onClose }: SetPinModalProps) {
    const { theme, t } = useSettings();
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (pin.length === 6) {
            handleComplete();
        }
    }, [pin]);

    const handleComplete = async () => {
        setLoading(true);
        // Add a small delay for feel
        await new Promise(resolve => setTimeout(resolve, 300));
        onSuccess(pin);
        setPin('');
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
                    { borderColor: theme.border }
                ]}
            />
        );
    };

    return (
        <Modal
            visible={isVisible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                {Platform.OS !== 'web' ? (
                    <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
                ) : (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.9)' }]} />
                )}

                <View style={[styles.content, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                        <Ionicons name="close" size={24} color={theme.text} />
                    </TouchableOpacity>

                    <View style={styles.iconContainer}>
                        <View style={[styles.lockIconCircle, { backgroundColor: theme.tint + '10' }]}>
                            <FontAwesome name="shield" size={30} color={theme.tint} />
                        </View>
                    </View>

                    <Text style={[styles.title, { color: theme.text }]}>{t('action_make_private')}</Text>
                    <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                        {t('enter_pin_prompt')}
                    </Text>

                    <View style={styles.dotsContainer}>
                        {[0, 1, 2, 3, 4, 5].map(renderDot)}
                    </View>

                    {loading && (
                        <ActivityIndicator color={theme.tint} style={{ marginBottom: 20 }} />
                    )}

                    <View style={styles.keypad}>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                            <TouchableOpacity
                                key={num}
                                style={styles.key}
                                onPress={() => handleNumberPress(num.toString())}
                            >
                                <Text style={[styles.keyText, { color: theme.text }]}>{num}</Text>
                            </TouchableOpacity>
                        ))}
                        <View style={styles.keyPlaceholder} />
                        <TouchableOpacity
                            style={styles.key}
                            onPress={() => handleNumberPress('0')}
                        >
                            <Text style={[styles.keyText, { color: theme.text }]}>0</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.key}
                            onPress={handleDelete}
                        >
                            <Ionicons name="backspace-outline" size={24} color={theme.text} />
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
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    content: {
        width: '90%',
        maxWidth: 400,
        borderRadius: 40,
        padding: 30,
        alignItems: 'center',
        borderWidth: 1,
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
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    subtitle: {
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
        backgroundColor: 'rgba(128,128,128,0.1)',
        borderWidth: 1,
    },
    dotActive: {
        backgroundColor: '#FF6B00',
        borderColor: '#FF6B00',
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
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    keyPlaceholder: {
        width: '30%',
    },
    keyText: {
        fontSize: 24,
        fontWeight: '600',
    },
});
