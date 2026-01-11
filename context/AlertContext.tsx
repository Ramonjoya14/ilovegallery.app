import { Ionicons } from '@expo/vector-icons';
import React, { createContext, useCallback, useContext, useState } from 'react';
import { Animated, Dimensions, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSettings } from './AppSettingsContext';

const { width } = Dimensions.get('window');

interface AlertButton {
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
}

interface AlertOptions {
    title: string;
    message?: string;
    buttons?: AlertButton[];
    type?: 'info' | 'success' | 'error' | 'warning';
}

interface AlertContextType {
    showAlert: (options: AlertOptions) => void;
    hideAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { theme } = useSettings();
    const [visible, setVisible] = useState(false);
    const [config, setConfig] = useState<AlertOptions | null>(null);
    const [fadeAnim] = useState(new Animated.Value(0));

    const showAlert = useCallback((options: AlertOptions) => {
        setConfig(options);
        setVisible(true);
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [fadeAnim]);

    const hideAlert = useCallback(() => {
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            setVisible(false);
            setConfig(null);
        });
    }, [fadeAnim]);

    const handleButtonPress = (onPress?: () => void) => {
        hideAlert();
        if (onPress) {
            setTimeout(onPress, 250); // Small delay to allow modal to close
        }
    };

    const getIcon = () => {
        switch (config?.type) {
            case 'success': return { name: 'checkmark-circle', color: '#34C759' };
            case 'error': return { name: 'alert-circle', color: '#FF3B30' };
            case 'warning': return { name: 'warning', color: '#FFCC00' };
            default: return { name: 'information-circle', color: theme.tint };
        }
    };

    const icon = getIcon();

    return (
        <AlertContext.Provider value={{ showAlert, hideAlert }}>
            {children}
            {config && (
                <Modal
                    transparent
                    visible={visible}
                    animationType="none"
                    onRequestClose={hideAlert}
                >
                    <View style={styles.overlay}>
                        <Animated.View style={[
                            styles.container,
                            {
                                backgroundColor: theme.card,
                                borderColor: theme.border,
                                opacity: fadeAnim,
                                transform: [{
                                    scale: fadeAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0.85, 1]
                                    })
                                }]
                            }
                        ]}>
                            {/* Decorative elements */}
                            <View style={styles.decorativeCircles}>
                                <View style={[styles.circle, { backgroundColor: theme.tint, opacity: 0.05, top: -20, right: -20 }]} />
                                <View style={[styles.circle, { backgroundColor: theme.tint, opacity: 0.03, bottom: -40, left: -40 }]} />
                            </View>

                            <View style={styles.content}>
                                <View style={[styles.iconContainer, { backgroundColor: icon.color + '15' }]}>
                                    <Ionicons name={icon.name as any} size={36} color={icon.color} />
                                </View>

                                <Text style={[styles.title, { color: theme.text }]}>{config.title}</Text>
                                {config.message && (
                                    <Text style={[styles.message, { color: theme.textSecondary }]}>{config.message}</Text>
                                )}
                            </View>

                            <View style={styles.buttonContainer}>
                                {config.buttons && config.buttons.length > 0 ? (
                                    <View style={config.buttons.length > 2 ? styles.buttonColumn : styles.buttonRow}>
                                        {config.buttons.map((btn, index) => {
                                            const isPrimary = btn.style !== 'cancel' && btn.style !== 'destructive';
                                            const isDestructive = btn.style === 'destructive';

                                            return (
                                                <TouchableOpacity
                                                    key={index}
                                                    style={[
                                                        styles.button,
                                                        isPrimary && { backgroundColor: theme.tint },
                                                        isDestructive && { backgroundColor: '#FF3B3015', borderWidth: 1, borderColor: '#FF3B3030' },
                                                        !isPrimary && !isDestructive && { backgroundColor: theme.border },
                                                        config.buttons!.length <= 2 && styles.buttonFlex
                                                    ]}
                                                    onPress={() => handleButtonPress(btn.onPress)}
                                                >
                                                    <Text style={[
                                                        styles.buttonText,
                                                        { color: isPrimary ? '#FFF' : (isDestructive ? '#FF3B30' : theme.text) },
                                                        isPrimary && { fontWeight: '700' }
                                                    ]}>
                                                        {btn.text}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                ) : (
                                    <TouchableOpacity
                                        style={[styles.button, { backgroundColor: theme.tint, width: '100%' }]}
                                        onPress={() => handleButtonPress()}
                                    >
                                        <Text style={[styles.buttonText, { color: '#FFF', fontWeight: '700' }]}>OK</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </Animated.View>
                    </View>
                </Modal>
            )}
        </AlertContext.Provider>
    );
};

export const useAlert = () => {
    const context = useContext(AlertContext);
    if (!context) {
        throw new Error('useAlert must be used within an AlertProvider');
    }
    return context;
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    container: {
        width: width * 0.85,
        borderRadius: 32,
        borderWidth: 1,
        overflow: 'hidden',
        position: 'relative',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.3,
                shadowRadius: 20,
            },
            android: {
                elevation: 10,
            },
        }),
    },
    decorativeCircles: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
        pointerEvents: 'none',
    },
    circle: {
        position: 'absolute',
        width: 150,
        height: 150,
        borderRadius: 75,
    },
    content: {
        paddingTop: 35,
        paddingHorizontal: 25,
        paddingBottom: 25,
        alignItems: 'center',
    },
    iconContainer: {
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 12,
        letterSpacing: -0.5,
    },
    message: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        opacity: 0.8,
    },
    buttonContainer: {
        paddingHorizontal: 20,
        paddingBottom: 25,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
    },
    buttonColumn: {
        flexDirection: 'column',
        gap: 10,
    },
    buttonFlex: {
        flex: 1,
    },
    button: {
        height: 54,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 15,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
    },
});
