import { useSettings } from '@/context/AppSettingsContext';
import { databaseService, Notification } from '@/services/database';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface NotificationsModalProps {
    isVisible: boolean;
    onClose: () => void;
    userId: string;
    theme: any;
}

export default function NotificationsModal({ isVisible, onClose, userId, theme }: NotificationsModalProps) {
    const { t } = useSettings();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isVisible && userId) {
            fetchNotifications();
        }
    }, [isVisible, userId]);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const data = await databaseService.getNotifications(userId);
            setNotifications(data);
        } catch (error) {
            console.error("Error fetching notifications:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsRead = async (id: string) => {
        try {
            await databaseService.markNotificationAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        } catch (error) {
            console.error("Error marking as read:", error);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'event_created':
                return { name: 'calendar', color: '#FF6B00' };
            case 'download_success':
                return { name: 'download', color: '#4CD964' };
            case 'monthly_summary':
                return { name: 'bar-chart', color: '#5856D6' };
            default:
                return { name: 'bell', color: '#8E8E93' };
        }
    };

    const formatTime = (timestamp: any) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();

        const minutes = Math.floor(diff / 60000);
        if (minutes < 60) return `${minutes}${t('time_unit_m')}`;

        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}${t('time_unit_h')}`;

        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}${t('time_unit_d')}`;

        return date.toLocaleDateString();
    };

    const renderItem = ({ item }: { item: Notification }) => {
        const icon = getIcon(item.type);

        return (
            <TouchableOpacity
                style={[
                    styles.notificationItem,
                    { backgroundColor: theme.card, borderColor: theme.border },
                    !item.isRead && styles.unreadItem
                ]}
                onPress={() => item.id && handleMarkAsRead(item.id)}
            >
                <View style={[styles.iconContainer, { backgroundColor: icon.color + '20' }]}>
                    <FontAwesome name={icon.name as any} size={20} color={icon.color} />
                </View>

                <View style={styles.textContainer}>
                    <View style={styles.itemHeader}>
                        <Text style={[styles.itemTitle, { color: theme.text }]}>{item.title}</Text>
                        <Text style={[styles.itemTime, { color: theme.textSecondary }]}>{formatTime(item.timestamp)}</Text>
                    </View>
                    <Text style={[styles.itemMessage, { color: theme.textSecondary }]} numberOfLines={2}>
                        {item.message}
                    </Text>
                </View>

                {!item.isRead && <View style={styles.unreadDot} />}
            </TouchableOpacity>
        );
    };

    return (
        <Modal visible={isVisible} animationType="slide" transparent={true}>
            <View style={styles.modalOverlay}>
                <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
                <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
                    <View style={styles.header}>
                        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('notifications_title')}</Text>
                        <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: theme.card }]}>
                            <Ionicons name="close" size={24} color={theme.text} />
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View style={styles.centerContainer}>
                            <ActivityIndicator size="large" color="#FF6B00" />
                        </View>
                    ) : notifications.length > 0 ? (
                        <FlatList
                            data={notifications}
                            renderItem={renderItem}
                            keyExtractor={item => item.id || Math.random().toString()}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={false}
                        />
                    ) : (
                        <View style={styles.centerContainer}>
                            <View style={styles.emptyIconContainer}>
                                <Ionicons name="notifications-off-outline" size={60} color={theme.border} />
                            </View>
                            <Text style={[styles.emptyTitle, { color: theme.text }]}>{t('notifications_empty_title')}</Text>
                            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                                {t('notifications_empty_subtitle')}
                            </Text>
                        </View>
                    )}
                </SafeAreaView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    container: {
        height: '85%',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 25,
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 20,
    },
    notificationItem: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
        borderWidth: 1,
        alignItems: 'center',
    },
    unreadItem: {
        borderColor: '#FF6B0040',
        backgroundColor: '#FF6B0005',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    textContainer: {
        flex: 1,
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    itemTime: {
        fontSize: 12,
    },
    itemMessage: {
        fontSize: 14,
        lineHeight: 20,
    },
    unreadDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#FF6B00',
        marginLeft: 10,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyIconContainer: {
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    emptySubtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
    },
});
