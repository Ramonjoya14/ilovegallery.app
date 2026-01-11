import NotificationsModal from '@/components/NotificationsModal';
import { Text } from '@/components/Themed';
import { useAuth } from '@/context/AuthContext';
import { databaseService, Event as EventType } from '@/services/database';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { ResizeMode, Video } from 'expo-av';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

const StatCard = ({ icon, label, value, iconBg, iconColor, theme }: { icon: any, label: string, value: string | number, iconBg: string, iconColor: string, theme: any }) => (
  <View style={[styles.quickStatCard, { backgroundColor: theme.card }]}>
    <View style={[styles.statIconCircle, { backgroundColor: iconBg }]}>
      <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
    </View>
    <View style={styles.statInfo}>
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  </View>
);

import { useSettings } from '@/context/AppSettingsContext';

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { theme, t, language, notificationsEnabled } = useSettings();
  const [events, setEvents] = useState<EventType[]>([]);
  const [featuredPhotos, setFeaturedPhotos] = useState<{ url: string, type?: 'image' | 'video' }[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    photosTaken: 0,
    photosRevealed: 0,
    eventsCreated: 0,
    eventsAttended: 0,
    completedRolls: 0,
    sharedWithCount: 0
  });

  const [showNotifications, setShowNotifications] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('--:--:--');

  const userName = user?.displayName ? user.displayName.split(' ')[0] : (user?.isAnonymous ? t('guest') : t('visitor'));

  const fetchData = useCallback(async (silent = false) => {
    if (!user) {
      setEvents([]);
      setStats({
        photosTaken: 0,
        photosRevealed: 0,
        eventsCreated: 0,
        eventsAttended: 0,
        completedRolls: 0,
        sharedWithCount: 0
      });
      setFeaturedPhotos([]);
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    try {
      // 1. Fetch user's own events (where they are organizer)
      const userEvents = await databaseService.getEvents(user.uid);
      setEvents(userEvents);

      // 2. Fetch all photos taken by the user (across any event)
      const userPhotos = await databaseService.getPhotosByUser(user.uid);

      // 3. Stats calculation
      const photosTaken = userPhotos.length;

      // To calculate events attended and revealed photos correctly, we need the events info
      const uniqueEventIds = [...new Set(userPhotos.map(p => p.eventId))];
      const eventsInfo = await Promise.all(uniqueEventIds.map(id => databaseService.getEventById(id)));
      const eventsMap = eventsInfo.reduce((acc, e) => {
        if (e) acc[e.id!] = e;
        return acc;
      }, {} as Record<string, EventType>);

      const photosRevealedCount = userPhotos.filter(p => {
        const evt = eventsMap[p.eventId];
        return evt && evt.status === 'expired';
      }).length;

      // 4. Shared Stats
      const sharedStats = await databaseService.getSharedStats(user.uid);

      setStats({
        photosTaken: photosTaken,
        eventsCreated: userEvents.length,
        photosRevealed: photosRevealedCount,
        eventsAttended: uniqueEventIds.length,
        completedRolls: userEvents.filter(e => e.status === 'expired' && (e.photoCount || 0) >= (e.maxPhotos || 24)).length,
        sharedWithCount: sharedStats.uniqueUsers
      });

      // 4. Filter featured photos (latest photos from user, only from events WITHOUT a PIN)
      const publicPhotos = userPhotos.filter(p => {
        const evt = eventsMap[p.eventId];
        // Only show photos from events that have BEEN REVEALED (expired) and have NO PIN (public)
        return evt && evt.status === 'expired' && (!evt.pin || evt.pin.trim() === '');
      });

      if (publicPhotos.length > 0) {
        // Sort: Liked photos first
        const sortedPhotos = [...publicPhotos].sort((a, b) => {
          if (a.isLiked && !b.isLiked) return -1;
          if (!a.isLiked && b.isLiked) return 1;
          return 0;
        });

        setFeaturedPhotos(sortedPhotos.slice(0, 10).map(p => ({ url: p.url, type: p.type })));
      } else {
        setFeaturedPhotos([]);
      }

      // 5. Check notifications for red dot
      const notifs = await databaseService.getNotifications(user.uid);
      setHasUnread(notifs.some(n => !n.isRead));

      // 6. Monthly Activity Summary logic
      const now = new Date();
      const currentMonthKey = `${now.getFullYear()}-${now.getMonth()}`;
      const userProfile = await databaseService.getUserProfile(user.uid);

      if (userProfile && userProfile.lastSummaryMonth !== currentMonthKey) {
        // First time this month
        if (photosTaken > 0 || userEvents.length > 0) {
          await databaseService.addNotification({
            userId: user.uid,
            type: 'monthly_summary',
            title: t('notif_summary_title'),
            message: t('notif_summary_msg', {
              photos: photosTaken,
              revealed: photosRevealedCount,
              events: userEvents.length
            }),
          });
          // Mark month as checked
          await databaseService.updateUserProfile(user.uid, { lastSummaryMonth: currentMonthKey });
        }
      }
    } catch (error: any) {
      console.error("Error fetching homepage data:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchData(events.length > 0); // Use silent fetch if we already have data
    }, [fetchData, events.length])
  );

  // Filter non-archived events for the main display
  // CRITICAL: We ONLY show PUBLIC events (No PIN) here for maximum privacy.
  // Private events must be accessed via Gallery or directly, and will require a PIN.
  // Filter non-archived events for the main display
  // CRITICAL: We ONLY show PUBLIC events (No PIN) here for maximum privacy.
  // Private events must be accessed via Gallery or directly, and will require a PIN.
  const nonArchivedEvents = events.filter((e: EventType) => {
    if (e.isArchived) return false;
    const isPublic = !e.pin || e.pin.trim() === '';
    return isPublic;
  });

  // Current active event or the most recent revealed one
  const activeEvents = nonArchivedEvents.filter((e: EventType) => e.status === 'active');
  const finishedEvents = nonArchivedEvents.filter((e: EventType) => e.status === 'expired');

  const currentEvent = activeEvents.length > 0 ? activeEvents[0] : (finishedEvents.length > 0 ? finishedEvents[0] : null);
  const hasEvents = nonArchivedEvents.length > 0;

  useEffect(() => {
    let interval: any;

    if (currentEvent && currentEvent.status === 'active' && currentEvent.createdAt && user) {
      const calculateTimeLeft = async () => {
        const createdDate = currentEvent.createdAt.toDate ? currentEvent.createdAt.toDate() : new Date(currentEvent.createdAt);
        const expireDate = new Date(createdDate.getTime() + 5 * 60 * 60 * 1000); // 5 hours limit
        const now = new Date();
        const diff = expireDate.getTime() - now.getTime();

        if (diff <= 0) {
          setTimeLeft(t('home_finished'));
          // Auto reveal!
          if (currentEvent.id && currentEvent.status === 'active') {
            // We do this immediately in state to reflect UI change
            fetchData(); // This will refresh and pick up the new status

            // In backend
            await databaseService.updateEventStatus(currentEvent.id, 'expired');
            await databaseService.addNotification({
              userId: user.uid,
              type: 'system',
              title: t('notif_revealed_title'),
              message: t('notif_revealed_msg', { name: currentEvent.name }),
            });
          }
          if (interval) clearInterval(interval);
          return;
        }

        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);

        setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      };

      calculateTimeLeft();
      interval = setInterval(calculateTimeLeft, 1000);
    } else {
      setTimeLeft(t('home_finished'));
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentEvent, user]);

  // Formatting date like "Jueves, 24 Oct"
  const getFormattedDate = () => {
    const d = new Date();
    const formattedDate = d.toLocaleDateString(language === 'en' ? 'en-US' : 'es-ES', { weekday: 'long', day: 'numeric', month: 'short' });
    return formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.dateText, { color: theme.textSecondary }]}>{getFormattedDate()}</Text>
            <Text style={[styles.greetingText, { color: theme.text }]}>{t('home_greeting', { name: userName })}</Text>
          </View>
          {notificationsEnabled && (
            <TouchableOpacity
              style={[styles.notificationButton, { backgroundColor: theme.card }]}
              onPress={() => setShowNotifications(true)}
            >
              <View style={styles.bellContainer}>
                <Ionicons name="notifications" size={24} color={theme.text} />
                {hasUnread && <View style={styles.redDot} />}
              </View>
            </TouchableOpacity>
          )}
        </View>

        <NotificationsModal
          isVisible={showNotifications}
          onClose={() => {
            setShowNotifications(false);
            setHasUnread(false); // Assume user read them or at least saw them
          }}
          userId={user?.uid || ''}
          theme={theme}
        />

        {/* Main Event Area */}
        {
          loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.tint} />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>{t('home_loading')}</Text>
            </View>
          ) : !currentEvent ? (
            /* EMPTY STATE: Invitation to create event */
            <View style={[styles.emptyStateContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.emptyStateIconCircle}>
                <MaterialCommunityIcons name="camera-plus-outline" size={40} color={theme.tint} />
              </View>
              <Text style={[styles.emptyStateTitle, { color: theme.text }]}>{t('empty_events')}</Text>
              <Text style={[styles.emptyStateSubtitle, { color: theme.textSecondary }]}>{t('empty_events')}</Text>
              <TouchableOpacity
                style={[styles.emptyStateButton, { backgroundColor: theme.tint }]}
                onPress={() => router.push('/(tabs)/create')}
              >
                <Text style={styles.emptyStateButtonText}>{t('new_event')}</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            </View>
          ) : (
            /* EVENT CARD: Show real event data */
            <View style={[styles.liveCardMain, { backgroundColor: theme.card }]}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => router.push(`/event/${currentEvent.id}`)}
                style={styles.cardTouchArea}
              >
                {/* Image Header */}
                <View style={styles.cardImageHeader}>
                  <Image
                    source={{
                      uri: (currentEvent.coverImage && currentEvent.coverImage.startsWith('http'))
                        ? currentEvent.coverImage
                        : "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80"
                    }}
                    style={styles.cardCoverImage}
                    contentFit="cover"
                    transition={200}
                    cachePolicy="disk"
                  />
                  <LinearGradient
                    colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.8)']}
                    style={StyleSheet.absoluteFillObject}
                  />

                  {/* Status Tag */}
                  <View style={styles.cardStatusTag}>
                    <View style={[styles.statusDot, { backgroundColor: currentEvent.status === 'active' ? '#34C759' : '#8E8E93' }]} />
                    <Text style={styles.statusLabel}>{currentEvent.status === 'active' ? t('home_status_live') : t('home_status_revealed')}</Text>
                  </View>

                  {/* Event Name Overlay */}
                  <View style={styles.cardTextOverlay}>
                    <Text style={styles.cardEventName}>{currentEvent.name}</Text>
                    <Text style={styles.cardOrganizer}>{t('home_organized_by')} {currentEvent.organizer}</Text>
                  </View>
                </View>

                {/* Status Section */}
                <View style={styles.cardBottomSection}>
                  <View style={styles.cardStatsRow}>
                    <View style={styles.cardIconBox}>
                      <MaterialCommunityIcons name="filmstrip-box" size={24} color="#FF6B00" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.cardStatLabel, { color: theme.textSecondary }]}>{t('home_current_roll')}</Text>
                      <Text style={[styles.cardStatValue, { color: theme.text }]}>{currentEvent.photoCount}/{currentEvent.maxPhotos} {t('stats_photos')}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.cardStatLabel, { color: theme.textSecondary }]}>{t('home_expires_in')}</Text>
                      <Text style={[styles.cardStatValue, { color: theme.text }]}>
                        {currentEvent.status === 'active' ? timeLeft : t('home_finished')}
                      </Text>
                    </View>
                  </View>

                  {/* Progress Bar */}
                  <View style={[styles.cardProgressBarContainer, { backgroundColor: theme.border }]}>
                    <View style={[styles.cardProgressBarFill, { width: `${Math.min(((currentEvent.photoCount || 0) / (currentEvent.maxPhotos || 24)) * 100, 100)}%` }]} />
                  </View>


                </View>
              </TouchableOpacity>
            </View>
          )
        }

        {/* Premium Banner */}
        <LinearGradient
          colors={['#4F67FF', '#FF5B94']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.premiumBanner}
        >
          <View style={styles.premiumBadge}>
            <Ionicons name="star" size={10} color="#4F67FF" />
            <Text style={styles.premiumBadgeText}>PREMIUM</Text>
          </View>
          <Text style={styles.premiumTitle}>{t('home_premium_title')}</Text>
          <Text style={styles.premiumSubtitle}>{t('home_premium_subtitle')}</Text>
        </LinearGradient>

        {/* Tu Actividad */}
        <Text style={[styles.sectionTitleMain, { color: theme.text }]}>{t('home_activity')}</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <StatCard
              icon="filmstrip"
              label={t('home_completed_rolls')}
              value={stats.completedRolls}
              iconBg="rgba(163, 102, 255, 0.1)"
              iconColor="#A366FF"
              theme={theme}
            />
            <StatCard
              icon="share-variant"
              label={t('home_shared_events')}
              value={stats.sharedWithCount}
              iconBg="rgba(76, 175, 80, 0.1)"
              iconColor="#4CAF50"
              theme={theme}
            />
          </View>
          <View style={styles.statsRow}>
            <StatCard
              icon="fire"
              label={t('stats_photos')}
              value={stats.photosTaken}
              iconBg="rgba(255, 107, 0, 0.1)"
              iconColor="#FF6B00"
              theme={theme}
            />
            <StatCard
              icon="account-group-outline"
              label={t('stats_events')}
              value={stats.eventsAttended}
              iconBg="rgba(33, 150, 243, 0.1)"
              iconColor="#2196F3"
              theme={theme}
            />
          </View>
        </View>

        {/* Momentos Destacados */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitleMain, { color: theme.text }]}>{t('home_featured')}</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/gallery')}>
            <Text style={[styles.seeGalleryText, { color: theme.tint }]}>{t('my_rolls')}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.featuredScroll}
          contentContainerStyle={styles.featuredContent}
        >
          {featuredPhotos.length > 0 ? (
            featuredPhotos.map((photo: any, index: number) => (
              <TouchableOpacity key={index} style={styles.featuredMomentCard}>
                {photo.type === 'video' ? (
                  // Simple thumbnail/placeholder for video in homepage scroll for performance
                  <View style={styles.featuredImage}>
                    <Video
                      source={{ uri: photo.url }}
                      style={StyleSheet.absoluteFillObject}
                      resizeMode={ResizeMode.COVER}
                      shouldPlay={true}
                      isLooping
                      isMuted={true}
                    />
                    <View style={{ position: 'absolute', bottom: 5, right: 5 }}>
                      <Ionicons name="videocam" size={14} color="white" />
                    </View>
                  </View>
                ) : (
                  <Image
                    source={{ uri: photo.url }}
                    style={styles.featuredImage}
                    contentFit="cover"
                    transition={200}
                    cachePolicy="disk"
                  />
                )}
              </TouchableOpacity>
            ))
          ) : user && !user.isAnonymous ? (
            // Registered user with no photos yet - show empty state or nothing
            <View style={styles.emptyFeaturedContainer}>
              <Text style={styles.emptyFeaturedText}>{t('home_empty_featured')}</Text>
            </View>
          ) : (
            /* Mock data for featured moments ONLY for anonymous guests */
            [
              '1492684223066-81342ee5ff30', // Party crowd
              '1533174072545-7a4b6ad7a6c3', // Golden glitter
              '1470225620780-dba8ba36b745', // DJ/Music
              '1516450360452-9312f5e86fc7'  // People celebrating
            ].map((id, i) => (
              <TouchableOpacity key={i} style={styles.featuredMomentCard}>
                <Image
                  source={{ uri: `https://images.unsplash.com/photo-${id}?w=400&q=80` }}
                  style={styles.featuredImage}
                  contentFit="cover"
                  transition={200}
                  cachePolicy="memory-disk"
                />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        <View style={{ height: 100 }} />
      </ScrollView>

      <NotificationsModal
        isVisible={showNotifications}
        onClose={() => {
          setShowNotifications(false);
          setHasUnread(false);
        }}
        userId={user?.uid || ''}
        theme={theme}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#120D0A',
  },
  scrollContent: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  dateText: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '500',
  },
  greetingText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 4,
  },
  notificationButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1E1915',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellContainer: {
    position: 'relative',
  },
  redDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF3B30',
    borderWidth: 2,
    borderColor: '#1E1915',
  },

  premiumBanner: {
    borderRadius: 25,
    padding: 24,
    marginBottom: 30,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 15,
  },
  premiumBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#4F67FF',
    marginLeft: 4,
  },
  premiumTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    lineHeight: 28,
  },
  premiumSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
    lineHeight: 20,
  },
  sectionTitleMain: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 20,
  },
  statsGrid: {
    marginBottom: 30,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  quickStatCard: {
    width: (width - 55) / 2,
    backgroundColor: '#1E1915',
    padding: 20,
    borderRadius: 25,
    height: 160,
    justifyContent: 'space-between',
  },
  statIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statInfo: {
    marginTop: 15,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  seeGalleryText: {
    color: '#FF6B00',
    fontSize: 14,
    fontWeight: '600',
  },
  featuredScroll: {
    marginHorizontal: -20,
  },
  featuredContent: {
    paddingLeft: 20,
    paddingRight: 10,
  },
  featuredMomentCard: {
    width: 120,
    height: 160,
    marginRight: 10,
    borderRadius: 20,
    overflow: 'hidden',
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
  },
  loadingText: {
    color: '#8E8E93',
    marginTop: 15,
    fontSize: 14,
  },
  emptyStateContainer: {
    backgroundColor: '#1E1915',
    borderRadius: 30,
    padding: 30,
    alignItems: 'center',
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#2A221B',
  },
  emptyStateIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyStateTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptyStateSubtitle: {
    color: '#8E8E93',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 25,
    paddingHorizontal: 20,
  },
  emptyStateButton: {
    backgroundColor: '#FF6B00',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 18,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyStateButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // New Card Styles
  liveCardMain: {
    backgroundColor: '#1E1915',
    borderRadius: 35,
    overflow: 'hidden',
    marginBottom: 25,
    elevation: 3,
  },
  cardTouchArea: {
    width: '100%',
  },
  cardImageHeader: {
    height: 220,
    width: '100%',
    position: 'relative',
  },
  cardCoverImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2A2A2A',
  },
  cardStatusTag: {
    position: 'absolute',
    top: 20,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusLabel: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  cardTextOverlay: {
    position: 'absolute',
    bottom: 25,
    left: 25,
    right: 25,
  },
  cardEventName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  cardOrganizer: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  cardBottomSection: {
    padding: 25,
  },
  cardStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#2A1D15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardStatLabel: {
    fontSize: 10,
    color: '#8E8E93',
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  cardStatValue: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: 'bold',
  },
  cardProgressBarContainer: {
    height: 8,
    backgroundColor: '#2A221B',
    borderRadius: 4,
    marginBottom: 25,
    overflow: 'hidden',
  },
  cardProgressBarFill: {
    height: '100%',
    backgroundColor: '#FF6B00',
    borderRadius: 4,
  },
  cardActionButton: {
    backgroundColor: '#FF6B00',
    height: 60,
    borderRadius: 22,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  cardActionButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  emptyFeaturedContainer: {
    width: 250,
    height: 180,
    backgroundColor: '#1E1915',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#2A221B',
    marginRight: 15,
  },
  emptyFeaturedText: {
    color: '#666',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});


