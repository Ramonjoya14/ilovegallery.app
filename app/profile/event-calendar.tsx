import { Text } from '@/components/Themed';
import { useAlert } from '@/context/AlertContext';
import { useSettings } from '@/context/AppSettingsContext';
import { useAuth } from '@/context/AuthContext';
import { databaseService, Event as EventType } from '@/services/database';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

export default function EventCalendarScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { theme, t, isDark, language } = useSettings();
    const { showAlert } = useAlert();

    const [events, setEvents] = useState<EventType[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [viewDate, setViewDate] = useState(new Date());
    const [selectedDayEvents, setSelectedDayEvents] = useState<EventType[]>([]);

    useEffect(() => {
        if (user) {
            fetchEvents();
        }
    }, [user]);

    useEffect(() => {
        filterEventsByDate(selectedDate);
    }, [selectedDate, events]);

    const fetchEvents = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await databaseService.getEvents(user.uid);
            setEvents(data);
        } catch (error) {
            console.error("Error fetching events for calendar:", error);
        } finally {
            setLoading(false);
        }
    };

    const filterEventsByDate = (date: Date) => {
        const filtered = events.filter(event => {
            if (!event.date) return false;
            const eventDate = event.date.toDate ? event.date.toDate() : new Date(event.date);
            return (
                eventDate.getDate() === date.getDate() &&
                eventDate.getMonth() === date.getMonth() &&
                eventDate.getFullYear() === date.getFullYear()
            );
        });
        setSelectedDayEvents(filtered);
    };

    const renderCalendar = () => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const prevMonthDays = new Date(year, month, 0).getDate();

        const rows = [];
        let cells = [];

        // Previous month days
        for (let i = firstDay - 1; i >= 0; i--) {
            cells.push(
                <View key={`prev-${i}`} style={styles.dayCellContainer}>
                    <Text style={[styles.dayCell, styles.inactiveDay, { color: theme.border }]}>
                        {prevMonthDays - i}
                    </Text>
                </View>
            );
        }

        // Current month days
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, month, d);
            const isSelected = selectedDate.getDate() === d &&
                selectedDate.getMonth() === month &&
                selectedDate.getFullYear() === year;

            const hasEvents = events.some(event => {
                if (!event.date) return false;
                const ed = event.date.toDate ? event.date.toDate() : new Date(event.date);
                return ed.getDate() === d && ed.getMonth() === month && ed.getFullYear() === year;
            });

            const isToday = new Date().toDateString() === date.toDateString();

            cells.push(
                <TouchableOpacity
                    key={`day-${d}`}
                    activeOpacity={0.7}
                    style={[
                        styles.dayCellContainer,
                        isSelected && { backgroundColor: theme.tint, borderRadius: 14 }
                    ]}
                    onPress={() => setSelectedDate(date)}
                >
                    <Text style={[
                        styles.dayCell,
                        { color: theme.text },
                        isSelected && { color: '#FFF', fontWeight: 'bold' },
                        isToday && !isSelected && { color: theme.tint, fontWeight: 'bold' }
                    ]}>
                        {d}
                    </Text>
                    {hasEvents && (
                        <View style={[
                            styles.eventDot,
                            { backgroundColor: isSelected ? '#FFF' : theme.tint }
                        ]} />
                    )}
                </TouchableOpacity>
            );
        }

        // Fill remaining cells
        const totalCells = cells.length;
        const remaining = (7 - (totalCells % 7)) % 7;
        for (let i = 1; i <= remaining; i++) {
            cells.push(
                <View key={`next-${i}`} style={styles.dayCellContainer}>
                    <Text style={[styles.dayCell, styles.inactiveDay, { color: theme.border }]}>
                        {i}
                    </Text>
                </View>
            );
        }

        for (let i = 0; i < cells.length; i += 7) {
            rows.push(
                <View key={`row-${i}`} style={styles.calendarRow}>
                    {cells.slice(i, i + 7)}
                </View>
            );
        }

        return rows;
    };

    const changeMonth = (offset: number) => {
        const next = new Date(viewDate);
        next.setMonth(next.getMonth() + offset);
        setViewDate(next);
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <LinearGradient
                colors={isDark ? ['#251A14', '#120D0A', '#120D0A'] : [theme.background, theme.background, theme.background]}
                style={StyleSheet.absoluteFill}
            />

            {/* Custom Premium Header */}
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
                <TouchableOpacity
                    style={[styles.headerBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}
                    onPress={() => router.back()}
                >
                    <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>
                        {language === 'es' ? 'Tu Historia' : 'Your History'}
                    </Text>
                    <View style={styles.headerStatus}>
                        <View style={[styles.statusDot, { backgroundColor: theme.tint }]} />
                        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
                            {events.length} {language === 'es' ? 'momentos' : 'moments'}
                        </Text>
                    </View>
                </View>
                <TouchableOpacity
                    style={[styles.headerBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}
                    onPress={fetchEvents}
                >
                    <Ionicons name="sync" size={18} color={theme.text} />
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 120 }}
            >
                {/* Month Selector */}
                <View style={styles.monthSelectorWrapper}>
                    <BlurView intensity={30} tint={isDark ? "dark" : "light"} style={[styles.calendarHeader, { borderColor: theme.border }]}>
                        <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthNavBtn}>
                            <Ionicons name="chevron-back" size={20} color={theme.text} />
                        </TouchableOpacity>
                        <Text style={[styles.monthDisplay, { color: theme.text }]}>
                            {viewDate.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { month: 'long', year: 'numeric' }).toUpperCase()}
                        </Text>
                        <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthNavBtn}>
                            <Ionicons name="chevron-forward" size={20} color={theme.text} />
                        </TouchableOpacity>
                    </BlurView>
                </View>

                {/* Calendar Card */}
                <View style={styles.calendarContainer}>
                    <BlurView intensity={15} tint={isDark ? "dark" : "light"} style={[styles.calendarCard, { borderColor: theme.border }]}>
                        <View style={styles.weekdaysRow}>
                            {(language === 'es' ? ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']).map((day, i) => (
                                <Text key={i} style={[styles.weekdayText, { color: theme.textSecondary }]}>{day}</Text>
                            ))}
                        </View>

                        <View style={styles.daysGrid}>
                            {renderCalendar()}
                        </View>
                    </BlurView>
                </View>

                {/* Events Section Decoration */}
                <View style={styles.sectionDivider}>
                    <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
                    <Ionicons name="sparkles" size={14} color={theme.tint} style={styles.dividerIcon} />
                    <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
                </View>

                {/* Events for selected day */}
                <View style={styles.resultsContainer}>
                    <View style={styles.selectedDayHeader}>
                        <View style={styles.selectedDayTitleLine}>
                            <Text style={[styles.selectedDayTitle, { color: theme.text }]}>
                                {selectedDate.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'long' })}
                            </Text>
                            {selectedDayEvents.length > 0 && (
                                <View style={[styles.dateBadge, { backgroundColor: theme.tint }]}>
                                    <Text style={styles.dateBadgeText}>
                                        {selectedDayEvents.length}
                                    </Text>
                                </View>
                            )}
                        </View>
                        <Text style={[styles.selectedDaySubtitle, { color: theme.textSecondary }]}>
                            {selectedDayEvents.length > 0
                                ? (language === 'es' ? 'Momentos destacados de este día' : 'Highlights from this day')
                                : (language === 'es' ? 'Sin recuerdos este día' : 'No memories this day')
                            }
                        </Text>
                    </View>

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="small" color={theme.tint} />
                        </View>
                    ) : selectedDayEvents.length > 0 ? (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.eventsScroll}
                            snapToInterval={170} // Card width 150 + gap 20
                            decelerationRate="fast"
                        >
                            {selectedDayEvents.map(event => (
                                <TouchableOpacity
                                    key={event.id}
                                    activeOpacity={0.9}
                                    style={[styles.smallEventCard, { borderColor: theme.border, backgroundColor: theme.card }]}
                                    onPress={() => router.push(`/event/${event.id}`)}
                                >
                                    <View style={styles.smallImageContainer}>
                                        {event.pin && event.pin.trim() !== '' ? (
                                            <View style={[styles.smallImage, { backgroundColor: theme.card, justifyContent: 'center', alignItems: 'center' }]}>
                                                <FontAwesome name="lock" size={26} color={theme.tint} />
                                                <Text style={styles.privateText}>{language === 'es' ? 'PRIVADO' : 'PRIVATE'}</Text>
                                            </View>
                                        ) : (
                                            <Image
                                                source={{ uri: event.coverImage || "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400" }}
                                                style={styles.smallImage}
                                                contentFit="cover"
                                                transition={300}
                                            />
                                        )}
                                        <LinearGradient
                                            colors={['transparent', 'rgba(0,0,0,0.8)']}
                                            style={StyleSheet.absoluteFill}
                                        />
                                        <View style={styles.smallBadge}>
                                            <FontAwesome name="camera" size={8} color="#FFF" />
                                            <Text style={styles.smallBadgeText}>{event.photoCount}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.smallInfo}>
                                        <Text style={[styles.smallName, { color: theme.text }]} numberOfLines={1}>
                                            {event.name}
                                        </Text>
                                        <View style={styles.smallLocationRow}>
                                            <Ionicons name="location" size={10} color={theme.tint} />
                                            <Text style={[styles.smallLocation, { color: theme.textSecondary }]} numberOfLines={1}>
                                                {event.location || (language === 'es' ? 'Explorando' : 'Exploring')}
                                            </Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    ) : (
                        <View style={styles.emptyContainer}>
                            <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }]}>
                                <Ionicons name="calendar-outline" size={32} color={theme.textSecondary} />
                            </View>
                            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                                {language === 'es' ? 'No hay eventos en esta fecha.\n¡Sigue capturando momentos!' : 'No events on this date.\nKeep capturing moments!'}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Footer Section - Design Polish */}
                <View style={styles.footerSpacing}>
                    <LinearGradient
                        colors={[isDark ? 'rgba(255,107,0,0.05)' : 'rgba(255,107,0,0.02)', 'transparent']}
                        style={styles.footerGradient}
                    />
                    <View style={styles.footerBrand}>
                        <View style={styles.brandDot} />
                        <Text style={[styles.brandText, { color: theme.textSecondary, opacity: 0.5 }]}>ILOVEGALLERY MEMORIES</Text>
                        <View style={styles.brandDot} />
                    </View>
                    <Text style={[styles.footerYear, { color: theme.textSecondary }]}>{new Date().getFullYear()}</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 20,
        justifyContent: 'space-between',
        zIndex: 10,
    },
    headerBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    headerTitleContainer: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#FFF',
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    headerStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    statusDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        marginRight: 6,
    },
    headerSubtitle: {
        fontSize: 10,
        color: '#8E8E93',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    monthSelectorWrapper: {
        paddingHorizontal: 25,
        marginBottom: 15,
        marginTop: 10,
    },
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 25,
        borderWidth: 1,
        overflow: 'hidden',
    },
    monthNavBtn: {
        padding: 5,
    },
    monthDisplay: {
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 2,
    },
    calendarContainer: {
        paddingHorizontal: 25,
        marginBottom: 25,
    },
    calendarCard: {
        padding: 20,
        borderRadius: 30,
        borderWidth: 1,
        overflow: 'hidden',
    },
    weekdaysRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 25,
    },
    weekdayText: {
        width: (width - 120) / 7,
        textAlign: 'center',
        fontSize: 9,
        fontWeight: '900',
        textTransform: 'uppercase',
    },
    daysGrid: {
        gap: 15,
    },
    calendarRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    dayCellContainer: {
        width: (width - 130) / 7,
        height: (width - 130) / 7,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dayCell: {
        fontSize: 16,
        fontWeight: '600',
    },
    inactiveDay: {
        opacity: 0.1,
    },
    eventDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        position: 'absolute',
        bottom: 4,
    },
    sectionDivider: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 30,
        marginBottom: 25,
    },
    dividerLine: {
        flex: 1,
        height: 1,
    },
    dividerIcon: {
        marginHorizontal: 15,
        opacity: 0.5,
    },
    resultsContainer: {
        flex: 1,
    },
    selectedDayHeader: {
        paddingHorizontal: 30,
        marginBottom: 20,
    },
    selectedDayTitleLine: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    selectedDayTitle: {
        fontSize: 24,
        fontWeight: '900',
    },
    selectedDaySubtitle: {
        fontSize: 12,
        marginTop: 6,
        letterSpacing: 0.5,
    },
    dateBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dateBadgeText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '900',
    },
    loadingContainer: {
        padding: 50,
        alignItems: 'center',
    },
    eventsScroll: {
        paddingLeft: 30,
        paddingRight: 30,
        gap: 20,
        paddingBottom: 20,
    },
    smallEventCard: {
        width: 150,
        borderRadius: 25,
        borderWidth: 1,
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    smallImageContainer: {
        width: '100%',
        height: 180,
    },
    smallImage: {
        width: '100%',
        height: '100%',
    },
    smallBadge: {
        position: 'absolute',
        top: 15,
        right: 15,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
        backgroundColor: 'rgba(0,0,0,0.6)',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    smallBadgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '900',
    },
    privateText: {
        color: '#FF6B00',
        fontSize: 10,
        fontWeight: '900',
        marginTop: 10,
        letterSpacing: 2,
    },
    smallInfo: {
        padding: 15,
    },
    smallName: {
        fontSize: 14,
        fontWeight: '900',
        color: '#FFF',
        marginBottom: 6,
    },
    smallLocationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    smallLocation: {
        fontSize: 10,
        color: '#8E8E93',
        fontWeight: '600',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 20,
        paddingHorizontal: 50,
    },
    emptyIconCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    emptyText: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 20,
        color: '#8E8E93',
        fontWeight: '500',
    },
    footerSpacing: {
        marginTop: 80,
        alignItems: 'center',
        paddingBottom: 40,
    },
    footerGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 100,
    },
    footerBrand: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 10,
    },
    brandDot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: '#FF6B00',
    },
    brandText: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.1)',
        fontWeight: '900',
        letterSpacing: 3,
    },
    footerYear: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.05)',
        fontWeight: 'bold',
    },
});
