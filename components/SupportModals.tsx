import { useSettings } from '@/context/AppSettingsContext';
import { FontAwesome } from '@expo/vector-icons';
import React from 'react';
import { Image, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SupportModalsProps {
    isVisible: boolean;
    onClose: () => void;
    type: 'privacy' | 'about';
}

export default function SupportModals({ isVisible, onClose, type }: SupportModalsProps) {
    const { theme, t } = useSettings();
    const insets = useSafeAreaInsets();

    const renderPrivacy = () => (
        <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[styles.title, { color: theme.text }]}>{t('privacy_title')}</Text>
            <Text style={[styles.date, { color: theme.textSecondary }]}>{t('privacy_last_update')}</Text>

            <Text style={[styles.bodyText, { color: theme.text }]}>
                {t('privacy_intro')}
                {"\n\n"}
                1. <Text style={styles.bold}>{t('privacy_item_1_title')}</Text> {t('privacy_item_1_desc')}
                {"\n\n"}
                2. <Text style={styles.bold}>{t('privacy_item_2_title')}</Text> {t('privacy_item_2_desc')}
                {"\n\n"}
                3. <Text style={styles.bold}>{t('privacy_item_3_title')}</Text> {t('privacy_item_3_desc')}
                {"\n\n"}
                4. <Text style={styles.bold}>{t('privacy_item_4_title')}</Text> {t('privacy_item_4_desc')}
            </Text>
        </ScrollView>
    );

    const renderAbout = () => (
        <View style={styles.aboutContainer}>
            <View style={[styles.logoContainer, { backgroundColor: theme.card }]}>
                <Image
                    source={require('../assets/images/icon.png')}
                    style={styles.logo}
                />
            </View>
            <Text style={[styles.appName, { color: theme.text }]}>iLoveGallery</Text>
            <Text style={[styles.version, { color: theme.tint }]}>{t('about_version', { version: '1.0.0' })}</Text>

            <Text style={[styles.aboutText, { color: theme.textSecondary }]}>
                {t('about_desc')}
            </Text>

            <View style={[styles.footer, { borderTopColor: theme.border }]}>
                <Text style={[styles.footerText, { color: theme.textSecondary }]}>{t('about_footer')}</Text>
            </View>
        </View>
    );

    return (
        <Modal
            visible={isVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.modalContent, { backgroundColor: theme.background, paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: theme.card }]}>
                            <FontAwesome name="times" size={16} color={theme.text} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.innerContent}>
                        {type === 'privacy' ? renderPrivacy() : renderAbout()}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        height: '80%',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 24,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 10,
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    innerContent: {
        flex: 1,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    date: {
        fontSize: 12,
        marginBottom: 24,
    },
    bodyText: {
        fontSize: 15,
        lineHeight: 24,
    },
    bold: {
        fontWeight: 'bold',
    },
    aboutContainer: {
        alignItems: 'center',
        flex: 1,
    },
    logoContainer: {
        width: 100,
        height: 100,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 10,
            },
            android: {
                elevation: 8,
            }
        })
    },
    logo: {
        width: 60,
        height: 60,
        resizeMode: 'contain',
    },
    appName: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    version: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 30,
    },
    aboutText: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: 10,
    },
    footer: {
        marginTop: 'auto',
        paddingTop: 20,
        borderTopWidth: 1,
        width: '100%',
        alignItems: 'center',
    },
    footerText: {
        fontSize: 12,
        fontStyle: 'italic',
    }
});
