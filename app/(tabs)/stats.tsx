import { Text } from '@/components/Themed';
import { useSettings } from '@/context/AppSettingsContext';
import { useAuth } from '@/context/AuthContext';
import { databaseService, Event as EventType } from '@/services/database';
import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Dimensions, Image, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

export default function StatsScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const { theme, t, isDark, language } = useSettings();
    const [range, setRange] = useState('time_all');
    const [stats, setStats] = useState({
        photos: 0,
        events: 0,
        completedRolls: 0,
        clonedCount: 0,
    });
    const [totalStats, setTotalStats] = useState({ photos: 0, events: 0, rolls: 0 });
    const [weeklyActivity, setWeeklyActivity] = useState([0, 0, 0, 0]);
    const [bestMemories, setBestMemories] = useState<EventType[]>([]);
    const [growth, setGrowth] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, [user, range]);

    const fetchStats = async () => {
        if (!user) {
            setStats({ photos: 0, events: 0, completedRolls: 0, clonedCount: 0 });
            setTotalStats({ photos: 0, events: 0, rolls: 0 });
            setWeeklyActivity([0, 0, 0, 0]);
            setBestMemories([]);
            setGrowth(0);
            return;
        }
        setLoading(true);
        try {
            const allEvents = await databaseService.getEvents(user.uid);
            const allPhotos = await databaseService.getPhotosByUser(user.uid); // Fetch all to filter locally

            // Apply Date Filters
            const now = new Date();
            let filteredEvents = allEvents;
            let filteredPhotos = allPhotos;

            if (range === 'time_month') {
                filteredEvents = allEvents.filter(e => {
                    if (!e.date) return false;
                    const d = e.date.toDate ? e.date.toDate() : new Date(e.date);
                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                });
                filteredPhotos = allPhotos.filter(p => {
                    if (!p.timestamp) return false;
                    const d = p.timestamp.toDate ? p.timestamp.toDate() : new Date(p.timestamp);
                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                });
            } else if (range === 'time_year') {
                filteredEvents = allEvents.filter(e => {
                    if (!e.date) return false;
                    const d = e.date.toDate ? e.date.toDate() : new Date(e.date);
                    return d.getFullYear() === now.getFullYear();
                });
                filteredPhotos = allPhotos.filter(p => {
                    if (!p.timestamp) return false;
                    const d = p.timestamp.toDate ? p.timestamp.toDate() : new Date(p.timestamp);
                    return d.getFullYear() === now.getFullYear();
                });
            }

            const totalPhotos = filteredPhotos.length;
            const finishedCount = filteredEvents.filter(e => e.status === 'expired').length;

            // Shared Stats for all time (usually shared stats are global)
            const sharedStats = await databaseService.getSharedStats(user.uid);

            setStats({
                photos: totalPhotos,
                events: filteredEvents.length,
                completedRolls: filteredEvents.filter(e => e.status === 'expired' && (e.photoCount || 0) >= (e.maxPhotos || 24)).length,
                clonedCount: sharedStats.clonedCount,
            });

            // Calculate GLOBAL stats for the Level system (always based on total progress)
            setTotalStats({
                photos: allPhotos.length,
                events: allEvents.length,
                rolls: allEvents.filter(e => e.status === 'expired' && (e.photoCount || 0) >= (e.maxPhotos || 24)).length
            });

            // Calculate Activity (Keep chart weekly for current month always? or adapt? 
            // The prompt asks for "datos" (data) to work. 
            // The chart is specifically labeled "Sem 1..4". 
            // Let's keep the chart showing "Current Month Activity" as a general indicator 
            // OR we could make it strictly data-bound. 
            // Given the limited UI for the chart (labels Sem 1-4), keeping it as "Monthly Activity" 
            // (maybe even labeled as such) is safer than breaking the visual with year data.
            // However, to be helpful, let's still calculate growth based on the global activity or 
            // maybe keep the chart as "Recent Activity" regardless of filter.
            // Original code: "Calculate Activity (Photos per week in the current month)"
            // I will preserve the original logic for the *Chart* to ensure it doesn't break, 
            // but the *Summary Numbers* above it will now be filtered.

            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();

            const activity = [0, 0, 0, 0];
            let currentWeekPhotos = 0;
            let lastWeekPhotos = 0;
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

            // Note: We use allPhotos for the activity chart to show 'current status' regardless of filter?
            // Or should the chart reflect the filter? 
            // If filter is 'Year', a 4-week chart is meaningless. 
            // Let's use 'allPhotos' for the Reference Chart (Monthly Activity) to keep it consistent 
            // as a "Dashboard" widget, while the Stats Cards reflect the specific filter.

            allPhotos.forEach(photo => {
                const date = photo.timestamp?.toDate ? photo.timestamp.toDate() : new Date(photo.timestamp);

                // Monthly Chart (Always Current Month for the UI widget)
                if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
                    const day = date.getDate();
                    const week = Math.min(Math.floor((day - 1) / 7), 3);
                    activity[week]++;
                }

                // Growth calc
                if (date > sevenDaysAgo) currentWeekPhotos++;
                else if (date > fourteenDaysAgo) lastWeekPhotos++;
            });
            setWeeklyActivity(activity);

            const growthVal = lastWeekPhotos === 0 ? (currentWeekPhotos > 0 ? 100 : 0) : Math.round(((currentWeekPhotos - lastWeekPhotos) / lastWeekPhotos) * 100);
            setGrowth(growthVal);

            // Best Memories: Sort FILTERED events by user interaction
            // We prioritize events with more views and more photos
            const sortedMemories = [...filteredEvents].sort((a, b) => {
                const interactA = (a.views || 0) * 2 + (a.photoCount || 0);
                const interactB = (b.views || 0) * 2 + (b.photoCount || 0);
                return interactB - interactA;
            });
            setBestMemories(sortedMemories.slice(0, 10)); // Show up to 10 best memories

        } catch (error) {
            console.error("Error fetching stats:", error);
        } finally {
            setLoading(false);
        }
    };

    const getLevelInfo = () => {
        const { events, photos, rolls } = totalStats;

        // thresholds: 
        // Profesional: 20 events OR 200 photos OR 10 rolls
        // Avanzado: 10 events OR 100 photos OR 5 rolls
        // Aficionado: 4 events OR 40 photos OR 1 roll

        if (events >= 20 || photos >= 200 || rolls >= 10) {
            return {
                name: t('level_profesional'),
                desc: t('level_desc_master'),
                progress: 1,
            };
        } else if (events >= 10 || photos >= 100 || rolls >= 5) {
            return {
                name: t('level_avanzado'),
                desc: t('level_desc_pro', { count: Math.max(1, 10 - rolls) }),
                progress: Math.max(0.1, rolls / 10),
            };
        } else if (events >= 4 || photos >= 40 || rolls >= 1) {
            return {
                name: t('level_aficionado'),
                desc: t('level_desc_advanced', { count: Math.max(1, 5 - rolls) }),
                progress: Math.max(0.1, rolls / 5),
            };
        } else {
            return {
                name: t('level_novato'),
                desc: rolls === 0 ? t('level_desc_hobbyist_empty') : t('level_desc_hobbyist', { count: 4 - events }),
                progress: Math.max(0.1, events / 4),
            };
        }
    };

    const levelInfo = getLevelInfo();

    // Chart scale calculation
    const maxActivity = Math.max(...weeklyActivity, 1);
    const getDotBottom = (val: number) => {
        return (val / maxActivity) * 80 + 20; // Scale from 20 to 100
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <View style={{ width: 40 }} />
                <Text style={[styles.headerTitle, { color: theme.text }]}>{t('stats_title')}</Text>
                <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.card }]} onPress={fetchStats}>
                    <FontAwesome name={loading ? "spinner" : "refresh"} size={14} color={loading ? theme.tint : theme.text} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={[styles.chipsRow, { backgroundColor: theme.card }]}>
                    {(['time_all', 'time_year', 'time_month'] as const).map(c => (
                        <TouchableOpacity
                            key={c}
                            style={[styles.chip, range === c && { backgroundColor: theme.tint }]}
                            onPress={() => setRange(c)}
                        >
                            <Text style={[styles.chipText, { color: theme.textSecondary }, range === c && styles.activeChipText]}>{t(c)}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Level Card */}
                <View style={[styles.levelCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.levelLabel}>{t('stats_your_level')}</Text>
                        <Text style={[styles.levelTitle, { color: theme.text }]}>{levelInfo.name}</Text>
                        <Text style={[styles.levelSub, { color: theme.textSecondary }]}>{levelInfo.desc}</Text>

                        <View style={styles.miniProgressBg}>
                            <View style={[styles.miniProgressFill, { width: `${levelInfo.progress * 100}%` }]} />
                        </View>
                    </View>

                    <View style={styles.levelBadge}>
                        <FontAwesome name="trophy" size={24} color="#FF6B00" />
                    </View>
                </View>

                {/* Resumen */}
                <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('stats_summary_title')}</Text>
                <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>{t('stats_summary_subtitle')}</Text>

                <View style={styles.summaryGrid}>
                    <View style={[styles.summaryCard, { backgroundColor: theme.card }]}>
                        <View style={styles.summaryTop}>
                            <FontAwesome name="image" size={10} color={theme.tint} />
                            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>{t('stats_photos').toUpperCase()}</Text>
                        </View>
                        <Text style={[styles.summaryValue, { color: theme.text }]}>{stats.photos}</Text>
                    </View>
                    <View style={[styles.summaryCard, { backgroundColor: theme.card }]}>
                        <View style={styles.summaryTop}>
                            <FontAwesome name="calendar" size={10} color="#4A90E2" />
                            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>{t('stats_events').toUpperCase()}</Text>
                        </View>
                        <Text style={[styles.summaryValue, { color: theme.text }]}>{stats.events}</Text>
                    </View>
                    <View style={[styles.summaryCard, { backgroundColor: theme.card }]}>
                        <View style={styles.summaryTop}>
                            <FontAwesome name="check-circle" size={10} color="#34C759" />
                            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>{t('stats_completed')}</Text>
                        </View>
                        <Text style={[styles.summaryValue, { color: theme.text }]}>{stats.completedRolls}</Text>
                    </View>
                    <View style={[styles.summaryCard, { backgroundColor: theme.card }]}>
                        <View style={styles.summaryTop}>
                            <FontAwesome name="share-alt" size={10} color="#AF52DE" />
                            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>{t('stats_shared')}</Text>
                        </View>
                        <Text style={[styles.summaryValue, { color: theme.text }]}>{stats.clonedCount}</Text>
                    </View>
                </View>

                {/* Chart Area */}
                <View style={[styles.sectionHeader, { marginTop: 10 }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('stats_monthly_activity')}</Text>
                    <Text style={[styles.growthText, { color: theme.tint }]}>
                        {growth >= 0 ? "+" : ""}{growth}% <FontAwesome name={growth >= 0 ? "caret-up" : "caret-down"} size={14} />
                    </Text>
                </View>

                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => router.push('/profile/event-calendar')}
                    style={[styles.chartPlaceholder, { backgroundColor: theme.card, borderColor: theme.border }]}
                >
                    <LinearGradient
                        colors={[isDark ? 'rgba(255, 107, 0, 0.15)' : 'rgba(255, 107, 0, 0.05)', 'transparent']}
                        style={styles.chartGradientBg}
                    />

                    <View style={styles.chartInfoIcon}>
                        <FontAwesome name="info-circle" size={16} color={theme.tint} />
                    </View>

                    <View style={styles.chartLineContainer}>
                        {/* Horizontal Grid Lines */}
                        <View style={[styles.gridLine, { bottom: 20, backgroundColor: theme.border }]} />
                        <View style={[styles.gridLine, { bottom: 60, backgroundColor: theme.border }]} />
                        <View style={[styles.gridLine, { bottom: 100, backgroundColor: theme.border }]} />

                        {/* Connection Lines (Simplified visuals) */}
                        {weeklyActivity.slice(0, -1).map((val, idx) => {
                            const nextVal = weeklyActivity[idx + 1];
                            const x1 = 15 + idx * 23.33;
                            const x2 = 15 + (idx + 1) * 23.33;
                            const y1 = getDotBottom(val);
                            const y2 = getDotBottom(nextVal);

                            // Calculate angle and distance for a visual line segment
                            const dx = (x2 - x1) * (width - 80) / 100;
                            const dy = y2 - y1;
                            const dist = Math.sqrt(dx * dx + dy * dy);
                            const angle = Math.atan2(dy, dx);

                            return (
                                <View
                                    key={`line-${idx}`}
                                    style={[
                                        styles.connectionLine,
                                        {
                                            left: `${x1}%`,
                                            bottom: y1 + 4, // center dot
                                            width: dist,
                                            transform: [
                                                { rotate: `${-angle}rad` },
                                                { translateX: 0 }
                                            ],
                                            backgroundColor: theme.tint,
                                        }
                                    ]}
                                />
                            );
                        })}

                        {/* Activity Dots with Glow */}
                        {weeklyActivity.map((val, idx) => (
                            <View
                                key={idx}
                                style={[
                                    styles.pointContainer,
                                    {
                                        left: `${15 + idx * 23.33}%`,
                                        bottom: getDotBottom(val)
                                    }
                                ]}
                            >
                                <View style={[styles.pointGlow, { backgroundColor: theme.tint }]} />
                                <View style={[styles.pointOuter, { backgroundColor: theme.card, borderColor: theme.tint }]}>
                                    <View style={[styles.pointInner, { backgroundColor: theme.tint }]} />
                                </View>
                            </View>
                        ))}
                    </View>
                    <View style={styles.chartLabels}>
                        <Text style={[styles.chartDay, { color: theme.textSecondary }]}>{t('stats_week')} 1</Text>
                        <Text style={[styles.chartDay, { color: theme.textSecondary }]}>{t('stats_week')} 2</Text>
                        <Text style={[styles.chartDay, { color: theme.textSecondary }]}>{t('stats_week')} 3</Text>
                        <Text style={[styles.chartDay, { color: theme.textSecondary }]}>{t('stats_week')} 4</Text>
                    </View>
                </TouchableOpacity>

                {/* Mejores Recuerdos */}
                {
                    bestMemories.length > 0 && (
                        <>
                            <View style={styles.sectionHeader}>
                                <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('stats_best_memories')}</Text>
                                <TouchableOpacity onPress={() => router.push('/(tabs)/gallery')}>
                                    <Text style={[styles.seeAllText, { color: theme.tint }]}>{t('view_all')}</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>{t('stats_best_memories_subtitle')}</Text>

                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={styles.horizontalScroll}
                                contentContainerStyle={{ paddingRight: 20 }}
                            >
                                {bestMemories.map((event) => (
                                    <TouchableOpacity
                                        key={event.id}
                                        style={styles.bestMemoryCard}
                                        onPress={() => router.push(`/event/${event.id}`)}
                                    >
                                        <View style={[styles.bestMemoryThumb, { backgroundColor: theme.card }]}>
                                            {event.pin && event.pin.trim() !== '' ? (
                                                <View style={styles.privateOverlay}>
                                                    <FontAwesome name="lock" size={26} color={theme.tint} />
                                                    <Text style={styles.privateText}>{language === 'es' ? 'PRIVADO' : 'PRIVATE'}</Text>
                                                </View>
                                            ) : (
                                                <Image
                                                    source={{ uri: event.coverImage || "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400" }}
                                                    style={styles.memoryImage}
                                                />
                                            )}
                                            <View style={styles.memoryBadge}>
                                                <Text style={styles.memoryBadgeText}>{event.photoCount}</Text>
                                            </View>
                                        </View>
                                        <Text style={[styles.bestMemoryTitle, { color: theme.text }]} numberOfLines={1}>
                                            {event.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </>
                    )
                }

                <View style={{ height: 100 }} />
            </ScrollView >
        </View >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#120D0A',
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
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFF',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#1E1915',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        paddingHorizontal: 20,
    },
    chipsRow: {
        flexDirection: 'row',
        marginBottom: 25,
        backgroundColor: '#1E1915',
        borderRadius: 25,
        padding: 5,
    },
    chip: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 20,
        alignItems: 'center',
    },
    activeChip: {
        backgroundColor: '#FF6B00',
    },
    chipText: {
        color: '#8E8E93',
        fontSize: 12,
        fontWeight: '600',
    },
    activeChipText: {
        color: '#FFF',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFF',
    },
    sectionSubtitle: {
        fontSize: 12,
        color: '#8E8E93',
        marginTop: 4,
        marginBottom: 20,
    },
    summaryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 15,
        marginBottom: 25,
    },
    summaryCard: {
        width: (width - 55) / 2,
        backgroundColor: '#1E1915',
        borderRadius: 20,
        padding: 15,
        justifyContent: 'space-between',
    },
    summaryTop: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    summaryLabel: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#8E8E93',
        marginLeft: 6,
        letterSpacing: 0.5,
    },
    summaryValue: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFF',
    },
    levelCard: {
        backgroundColor: '#1E1915',
        borderRadius: 20,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 30,
        borderWidth: 1,
        borderColor: '#2A1810',
    },
    levelLabel: {
        fontSize: 9,
        color: '#FF6B00',
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    levelTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFF',
        marginVertical: 4,
    },
    levelSub: {
        fontSize: 11,
        color: '#8E8E93',
    },
    levelBadge: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255, 107, 0, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 107, 0, 0.2)',
    },
    miniProgressBg: {
        height: 4,
        backgroundColor: '#2A221B',
        borderRadius: 2,
        marginTop: 15,
        width: '80%',
    },
    miniProgressFill: {
        height: '100%',
        backgroundColor: '#FF6B00',
        borderRadius: 2,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    growthText: {
        color: '#FF6B00',
        fontSize: 13,
        fontWeight: 'bold',
    },
    chartPlaceholder: {
        backgroundColor: '#1E1915',
        borderRadius: 25,
        padding: 20,
        marginBottom: 30,
        height: 200,
        justifyContent: 'flex-end',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#2A221B',
    },
    chartGradientBg: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    chartInfoIcon: {
        position: 'absolute',
        top: 15,
        right: 15,
        zIndex: 10,
        opacity: 0.8,
    },
    chartLineContainer: {
        height: 140,
        width: '100%',
        position: 'relative',
    },
    gridLine: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
    },
    connectionLine: {
        position: 'absolute',
        height: 2,
        backgroundColor: '#FF6B00',
        transformOrigin: 'left',
        opacity: 0.8,
    },
    pointContainer: {
        position: 'absolute',
        width: 20,
        height: 20,
        marginLeft: -10,
        marginBottom: -10,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 5,
    },
    pointGlow: {
        position: 'absolute',
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#FF6B00',
        opacity: 0.2,
    },
    pointOuter: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#1E1915',
        borderWidth: 2,
        borderColor: '#FF6B00',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pointInner: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#FF6B00',
    },
    chartLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 15,
        paddingHorizontal: 10,
    },
    chartDay: {
        color: '#48484A',
        fontSize: 10,
        fontWeight: '500',
    },
    seeAllText: {
        color: '#FF6B00',
        fontSize: 13,
    },
    horizontalScroll: {
        marginLeft: -20,
        paddingLeft: 20,
    },
    bestMemoryCard: {
        width: 110,
        marginRight: 15,
    },
    bestMemoryThumb: {
        width: 110,
        height: 140,
        backgroundColor: '#1E1915',
        borderRadius: 20,
        marginBottom: 8,
    },
    bestMemoryTitle: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '500',
        textAlign: 'center',
    },
    privateOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
        backgroundColor: '#1E1915',
    },
    privateText: {
        color: '#FF6B00',
        fontSize: 10,
        fontWeight: '900',
        marginTop: 10,
        letterSpacing: 2,
    },
    memoryImage: {
        width: '100%',
        height: '100%',
        borderRadius: 20,
    },
    memoryBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
    },
    memoryBadgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
});