import { Text } from '@/components/Themed';
import { useSettings } from '@/context/AppSettingsContext';
import { useAuth } from '@/context/AuthContext';
import { databaseService, Event as EventType } from '@/services/database';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Dimensions, Modal, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 50) / 2;

export default function GalleryScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const { theme, t, language } = useSettings();
    const [filter, setFilter] = useState(t('all'));
    const [events, setEvents] = useState<EventType[]>([]);
    const [loading, setLoading] = useState(true);
    const [isJoinModalVisible, setIsJoinModalVisible] = useState(false);
    const [joinCode, setJoinCode] = useState('');

    const fetchEvents = useCallback(async (silent = false) => {
        if (!user) {
            setEvents([]);
            setLoading(false);
            return;
        }
        if (!silent) setLoading(true);
        try {
            const userEvents = await databaseService.getEvents(user.uid);
            setEvents(userEvents);
        } catch (error) {
            console.error("Error fetching events:", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useFocusEffect(
        useCallback(() => {
            fetchEvents(events.length > 0);
        }, [fetchEvents, events.length])
    );

    const filteredEvents = events.filter(e => {
        if (filter === t('all')) return !e.isArchived;
        if (filter === t('in_process')) return e.status === 'active' && !e.isArchived;
        if (filter === t('archived')) return e.isArchived === true;
        if (filter === t('favorites')) return e.isFavorite === true;
        return true;
    });

    const isEmpty = events.length === 0;

    const displayRolls = filteredEvents.map(e => ({
        id: e.id || e.code,
        title: e.name,
        location: e.organizer,
        photos: e.photoCount,
        status: e.status === 'active' ? 'EN VIVO' : 'REVELADO',
        image: e.coverImage || null,
        isFavorite: e.isFavorite,
        hasPin: e.pin && e.pin.trim() !== ''
    }));

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <View>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>{t('my_rolls')}</Text>
                    <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>{isEmpty ? t('empty_events') : t('my_rolls')}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                        style={[styles.iconButton, { backgroundColor: theme.card }]}
                        onPress={() => setIsJoinModalVisible(true)}
                    >
                        <Ionicons name="add" size={24} color={theme.text} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.iconButton, { backgroundColor: theme.card }]} onPress={() => fetchEvents()}>
                        <FontAwesome name={loading ? "spinner" : "refresh"} size={18} color={loading ? theme.tint : theme.text} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.content, isEmpty && { flex: 1, justifyContent: 'center' }]}
            >
                {!isEmpty ? (
                    <>
                        {/* Banner for most recent PUBLIC event if exists */}
                        {(() => {
                            const latestPublic = filteredEvents.find(e => !e.pin || e.pin.trim() === '');
                            if (!latestPublic) return null;

                            return (
                                <View style={[styles.bannerContainer, { backgroundColor: theme.card }]}>
                                    {latestPublic.coverImage && (
                                        <Image
                                            source={{ uri: latestPublic.coverImage }}
                                            style={StyleSheet.absoluteFillObject}
                                            contentFit="cover"
                                            transition={200}
                                            cachePolicy="disk"
                                        />
                                    )}
                                    <LinearGradient colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.7)']} style={styles.bannerGradient}>
                                        <View style={[styles.revealedTag, { backgroundColor: theme.tint }]}>
                                            <Text style={styles.revealedText}>{latestPublic.status === 'active' ? t('active').toUpperCase() : t('finished').toUpperCase()}</Text>
                                        </View>
                                        <Text style={styles.bannerTitle}>{latestPublic.name}</Text>
                                        <Text style={styles.bannerSubtitle}>
                                            {latestPublic.photoCount} {t('stats_photos').toLowerCase()} • {latestPublic.status === 'active' ? t('active') : t('finished')}
                                        </Text>
                                    </LinearGradient>
                                </View>
                            );
                        })()}

                        {/* Filters */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={{ paddingRight: 20 }}>
                            {[t('all'), t('in_process'), t('archived'), t('favorites')].map((f) => (
                                <TouchableOpacity
                                    key={f}
                                    style={[styles.filterChip, { backgroundColor: theme.card }, filter === f && { backgroundColor: theme.tint }]}
                                    onPress={() => setFilter(f)}
                                >
                                    <Text style={[styles.filterText, { color: theme.textSecondary }, filter === f && { color: '#FFF' }]}>{f}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Grid */}
                        <View style={styles.grid}>
                            {displayRolls.length > 0 ? (
                                displayRolls.map((roll) => (
                                    <TouchableOpacity
                                        key={roll.id}
                                        style={styles.rollCard}
                                        onPress={() => router.push(`/event/${roll.id}`)}
                                    >
                                        <View style={[styles.rollThumb, { backgroundColor: theme.card }]}>
                                            {roll.image && !roll.hasPin && (
                                                <Image
                                                    source={{ uri: roll.image }}
                                                    style={StyleSheet.absoluteFillObject}
                                                    contentFit="cover"
                                                    transition={200}
                                                    cachePolicy="disk"
                                                />
                                            )}
                                            <View style={styles.photoCountBadge}>
                                                <FontAwesome name="image" size={8} color="#FFF" style={{ marginRight: 4 }} />
                                                <Text style={styles.badgeText}>{roll.photos}</Text>
                                            </View>
                                            {roll.hasPin && (
                                                <View style={styles.lockOverlay}>
                                                    <FontAwesome name="lock" size={30} color={theme.tint} />
                                                    <Text style={[styles.lockText, { color: theme.tint }]}>PRIVADO</Text>
                                                </View>
                                            )}
                                            {roll.isFavorite && (
                                                <View style={styles.favoriteBadge}>
                                                    <FontAwesome name="star" size={10} color="#FFD700" />
                                                </View>
                                            )}
                                            {roll.status === 'EN VIVO' && (
                                                <View style={styles.liveIndicator}>
                                                    <View style={styles.liveDot} />
                                                    <Text style={styles.liveText}>{t('active')}</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={[styles.rollTitle, { color: theme.text }]} numberOfLines={1}>{roll.title}</Text>
                                        <Text style={[styles.rollLocation, { color: theme.textSecondary }]} numberOfLines={1}>{roll.location}</Text>
                                    </TouchableOpacity>
                                ))
                            ) : (
                                <View style={[styles.filterEmptyState, { backgroundColor: theme.card, borderColor: theme.border }]}>
                                    <FontAwesome
                                        name={
                                            filter === t('favorites') ? 'star-o' :
                                                filter === t('archived') ? 'archive' :
                                                    'hourglass-o'
                                        }
                                        size={40}
                                        color={theme.textSecondary}
                                    />
                                    <Text style={[styles.filterEmptyTitle, { color: theme.text }]}>
                                        {filter === t('in_process') ? t('empty_events') :
                                            filter === t('archived') ? t('empty_archived') :
                                                filter === t('favorites') ? t('empty_favorites') :
                                                    t('empty_events')}
                                    </Text>
                                    <Text style={[styles.filterEmptySubtitle, { color: theme.textSecondary }]}>
                                        {filter === t('in_process') ? t('empty_events') :
                                            filter === t('archived') ? t('empty_archived') :
                                                filter === t('favorites') ? t('empty_favorites') :
                                                    '--'}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </>
                ) : (
                    <View style={styles.emptyState}>
                        <FontAwesome name="camera-retro" size={50} color={theme.textSecondary} />
                        <Text style={[styles.emptyTitle, { color: theme.text }]}>{t('empty_events')}</Text>
                        <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>{t('empty_events')}</Text>
                        <TouchableOpacity style={[styles.createButton, { backgroundColor: theme.tint }]} onPress={() => router.push('/(tabs)/create')}>
                            <Text style={styles.createButtonText}>{t('new_event')}</Text>
                        </TouchableOpacity>
                    </View>
                )}
                <View style={{ height: 100 }} />
            </ScrollView>

            <Modal
                visible={isJoinModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsJoinModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        onPress={() => setIsJoinModalVisible(false)}
                    />
                    <View style={[styles.joinModalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <View style={styles.joinModalHeader}>
                            <Text style={[styles.joinModalTitle, { color: theme.text }]}>
                                {t('join_event_title')}
                            </Text>
                            <TouchableOpacity onPress={() => setIsJoinModalVisible(false)}>
                                <Ionicons name="close" size={24} color={theme.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.joinModalSubtitle, { color: theme.textSecondary }]}>
                            {t('join_event_subtitle')}
                        </Text>

                        <TextInput
                            style={[styles.joinInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
                            placeholder="ABCDEF"
                            placeholderTextColor={theme.textSecondary}
                            autoCapitalize="characters"
                            maxLength={6}
                            value={joinCode}
                            onChangeText={setJoinCode}
                        />

                        <TouchableOpacity
                            style={[styles.joinSubmitBtn, { backgroundColor: theme.tint }]}
                            onPress={() => {
                                if (joinCode.length === 6) {
                                    setIsJoinModalVisible(false);
                                    const code = joinCode.toUpperCase();
                                    setJoinCode('');
                                    router.push(`/join/${code}`);
                                }
                            }}
                        >
                            <Text style={styles.joinSubmitBtnText}>
                                {t('join_btn')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingHorizontal: 20,
        paddingBottom: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    headerSubtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        paddingHorizontal: 20,
    },
    bannerContainer: {
        height: 180,
        borderRadius: 25,
        overflow: 'hidden',
        marginBottom: 25,
    },
    bannerGradient: {
        flex: 1,
        padding: 20,
        justifyContent: 'flex-end',
    },
    revealedTag: {
        position: 'absolute',
        top: 20,
        left: 20,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
    },
    revealedText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
    bannerTitle: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: 'bold',
    },
    bannerSubtitle: {
        color: '#AAA',
        fontSize: 12,
        marginTop: 4,
    },
    filterScroll: {
        marginBottom: 20,
        marginLeft: -20,
        paddingLeft: 20,
    },
    filterChip: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 25,
        marginRight: 10,
    },
    filterText: {
        fontSize: 14,
        fontWeight: '600',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    rollCard: {
        width: COLUMN_WIDTH,
        marginBottom: 20,
    },
    rollThumb: {
        width: COLUMN_WIDTH,
        height: COLUMN_WIDTH * 1.3,
        borderRadius: 25,
        marginBottom: 10,
        overflow: 'hidden',
    },
    photoCountBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
        zIndex: 2,
    },
    badgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
    rollTitle: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    rollLocation: {
        fontSize: 12,
        marginTop: 2,
    },
    favoriteBadge: {
        position: 'absolute',
        top: 10,
        left: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 5,
        borderRadius: 10,
        zIndex: 2,
    },
    lockOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    lockText: {
        fontSize: 10,
        fontWeight: 'bold',
        marginTop: 8,
        letterSpacing: 1,
    },
    liveIndicator: {
        position: 'absolute',
        top: 10,
        left: 10,
        backgroundColor: 'rgba(0,0,0,0.6)',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#34C759',
        marginRight: 5,
    },
    liveText: {
        color: '#FFF',
        fontSize: 9,
        fontWeight: 'bold',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 100,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 20,
    },
    emptySubtitle: {
        fontSize: 14,
        textAlign: 'center',
        marginTop: 10,
        paddingHorizontal: 40,
    },
    createButton: {
        paddingHorizontal: 25,
        paddingVertical: 12,
        borderRadius: 15,
        marginTop: 30,
    },
    createButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
    },
    filterEmptyState: {
        width: '100%',
        alignItems: 'center',
        paddingVertical: 60,
        borderRadius: 30,
        marginTop: 10,
        borderWidth: 1,
    },
    filterEmptyTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 15,
    },
    filterEmptySubtitle: {
        fontSize: 12,
        textAlign: 'center',
        marginTop: 8,
        paddingHorizontal: 30,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    joinModalContent: {
        width: '100%',
        maxWidth: 340,
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
    },
    joinModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    joinModalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    joinModalSubtitle: {
        fontSize: 14,
        marginBottom: 20,
        lineHeight: 20,
    },
    joinInput: {
        height: 56,
        borderWidth: 1,
        borderRadius: 12,
        fontSize: 24,
        textAlign: 'center',
        fontWeight: 'bold',
        letterSpacing: 4,
        marginBottom: 20,
    },
    joinSubmitBtn: {
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    joinSubmitBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
