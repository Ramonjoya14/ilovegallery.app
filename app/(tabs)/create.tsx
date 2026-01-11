import { Text } from '@/components/Themed';
import { useAlert } from '@/context/AlertContext';
import { useSettings } from '@/context/AppSettingsContext';
import { useAuth } from '@/context/AuthContext';
import { databaseService } from '@/services/database';
import { storageService } from '@/services/storage';
import { FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Dimensions, Image, Modal, ScrollView, StyleSheet, Switch, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const TEMPLATES = (t: any) => [
    { id: 'boda', name: t('template_boda'), icon: 'heart', color: '#E91E63' },
    { id: 'cumple', name: t('template_cumple'), icon: 'gift', color: '#9C27B0' },
    { id: 'fiesta', name: t('template_fiesta'), icon: 'glass', color: '#FF6B00' },
    { id: 'corporativo', name: t('template_corporativo'), icon: 'briefcase', color: '#00BCD4' },
    { id: 'familiar', name: t('template_familiar'), icon: 'home', color: '#4CAF50' },
    { id: 'personal', name: t('template_personal'), icon: 'star', color: '#2196F3' },
];

export default function CreateEventScreen() {
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const router = useRouter();
    const { showAlert } = useAlert();
    const { t, theme } = useSettings();
    const [selectedTemplate, setSelectedTemplate] = useState('fiesta');
    const [hasPin, setHasPin] = useState(false);
    const [pin, setPin] = useState('');
    const [eventName, setEventName] = useState('');
    const [eventDescription, setEventDescription] = useState('');
    const [eventLocation, setEventLocation] = useState('');
    const [eventDate, setEventDate] = useState(new Date());
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [isLoading, setIsLoading] = useState(false);
    const [coverImage, setCoverImage] = useState<string | null>(null);
    const [showCoverSource, setShowCoverSource] = useState(false);

    React.useEffect(() => {
        if (!user) {
            setEventName('');
            setEventDescription('');
            setEventLocation('');
            setEventDate(new Date());
            setPin('');
            setHasPin(false);
            setCoverImage(null);
        }
    }, [user]);

    const pickImageFromGallery = async () => {
        setShowCoverSource(false);
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.7,
        });

        if (!result.canceled) {
            setCoverImage(result.assets[0].uri);
        }
    };

    const pickImageFromCamera = async () => {
        setShowCoverSource(false);
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            showAlert({
                title: t('alert_warning'),
                message: t('permission_denied_camera_msg'),
                type: 'warning'
            });
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.7,
        });

        if (!result.canceled) {
            setCoverImage(result.assets[0].uri);
        }
    };

    const handleCreateEvent = async () => {
        if (!eventName.trim()) {
            showAlert({
                title: t('alert_error'),
                message: t('error_event_name_required'),
                type: 'error'
            });
            return;
        }

        if (hasPin && (!pin || pin.length < 4)) {
            showAlert({
                title: t('alert_error'),
                message: t('error_pin_required'),
                type: 'error'
            });
            return;
        }

        setIsLoading(true);
        try {
            const code = Math.random().toString(36).substring(2, 8).toUpperCase();
            let coverImageUrl = '';
            let coverPath = '';
            if (coverImage) {
                coverPath = `covers/${Date.now()}_cover.jpg`;
                coverImageUrl = await storageService.uploadImage(coverImage, coverPath);
            }

            const eventData: any = {
                name: eventName.trim(),
                organizer: user?.displayName || t('guest'),
                organizerId: user?.uid || 'anonymous',
                date: eventDate,
                photoCount: 0,
                maxPhotos: 24,
                status: 'active',
                description: eventDescription.trim(),
                location: eventLocation.trim(),
                code,
                coverImage: coverImageUrl,
                coverStoragePath: coverPath,
                template: selectedTemplate,
            };

            if (hasPin && pin) {
                eventData.pin = pin;
            }

            const eventId = await databaseService.createEvent(eventData);

            // Add notification
            await databaseService.addNotification({
                userId: user?.uid || '',
                type: 'event_created',
                title: t('success_event_created_title'),
                message: t('success_event_created_msg'),
                data: { eventId }
            });

            showAlert({
                title: t('alert_success'),
                message: t('success_event_created_msg'),
                type: 'success',
                buttons: [{ text: 'OK', onPress: () => router.replace(`/event/success/${eventId}`) }]
            });

            setEventName('');
            setEventDescription('');
            setEventLocation('');
            setEventDate(new Date());
            setPin('');
            setHasPin(false);
            setCoverImage(null);
        } catch (error) {
            console.error('Error creating event:', error);
            showAlert({ title: t('alert_error'), message: t('error_create_event'), type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 20), borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => router.back()}>
                    <FontAwesome name="times" size={20} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>{t('new_event')}</Text>
                <TouchableOpacity style={[styles.topCreateButton, { backgroundColor: theme.tint + '20' }]} onPress={handleCreateEvent} disabled={isLoading}>
                    <Text style={[styles.topCreateText, { color: theme.tint }]}>{isLoading ? t('creating') : t('create')}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Cover Picker */}
                <TouchableOpacity
                    style={[styles.coverPicker, { backgroundColor: theme.card, borderColor: theme.border }]}
                    onPress={() => setShowCoverSource(true)}
                >
                    {coverImage ? (
                        <Image source={{ uri: coverImage }} style={styles.coverImagePreview} />
                    ) : (
                        <View style={styles.coverPlaceholder}>
                            <FontAwesome name="image" size={30} color={theme.border} />
                            <Text style={[styles.coverText, { color: theme.textSecondary }]}>{t('add_cover')}</Text>
                        </View>
                    )}
                </TouchableOpacity>

                {/* Templates Section */}
                <Text style={[styles.label, { color: theme.text }]}>{t('choose_template')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templateScroll} contentContainerStyle={{ paddingLeft: 20, paddingRight: 20 }}>
                    {TEMPLATES(t).map(tmpl => (
                        <TouchableOpacity
                            key={tmpl.id}
                            style={[
                                styles.templateCard,
                                { backgroundColor: theme.card, borderColor: 'transparent' },
                                selectedTemplate === tmpl.id && { borderColor: tmpl.color, borderWidth: 2 }
                            ]}
                            onPress={() => setSelectedTemplate(tmpl.id)}
                        >
                            <View style={[styles.templateIconBg, { backgroundColor: tmpl.color + '15' }]}>
                                <FontAwesome name={tmpl.icon as any} size={24} color={tmpl.color} />
                            </View>
                            <Text style={[
                                styles.templateName,
                                { color: selectedTemplate === tmpl.id ? tmpl.color : theme.textSecondary },
                                selectedTemplate === tmpl.id && { fontWeight: 'bold' }
                            ]}>{tmpl.name}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Form */}
                <View style={styles.formItem}>
                    <Text style={[styles.label, { color: theme.text }]}>{t('event_name')}</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                        placeholder={t('placeholder_event_name')}
                        placeholderTextColor={theme.textSecondary}
                        value={eventName}
                        onChangeText={setEventName}
                    />
                </View>

                <View style={styles.formItem}>
                    <Text style={[styles.label, { color: theme.text }]}>{t('description')}</Text>
                    <TextInput
                        style={[styles.input, styles.textArea, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                        placeholder={t('placeholder_description')}
                        placeholderTextColor={theme.textSecondary}
                        value={eventDescription}
                        onChangeText={setEventDescription}
                        multiline
                    />
                </View>

                <View style={styles.formItem}>
                    <Text style={[styles.label, { color: theme.text }]}>{t('location')}</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                        placeholder={t('placeholder_location')}
                        placeholderTextColor={theme.textSecondary}
                        value={eventLocation}
                        onChangeText={setEventLocation}
                    />
                </View>

                {/* Calendar Section */}
                <View style={styles.calendarHeader}>
                    <View style={[styles.calendarIconBg, { backgroundColor: theme.tint + '20' }]}>
                        <FontAwesome name="calendar" size={14} color={theme.tint} />
                    </View>
                    <Text style={[styles.calendarTitle, { color: theme.text }]}>{t('select_date')}</Text>
                </View>

                <View style={[styles.calendarContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={styles.monthHeader}>
                        <TouchableOpacity onPress={() => {
                            const d = new Date(currentMonth);
                            d.setMonth(d.getMonth() - 1);
                            setCurrentMonth(d);
                        }}>
                            <FontAwesome name="chevron-left" size={12} color={theme.text} />
                        </TouchableOpacity>
                        <Text style={[styles.monthTitle, { color: theme.text }]}>
                            {currentMonth.toLocaleDateString(t('lang_code' as any), { month: 'long', year: 'numeric' }).toUpperCase()}
                        </Text>
                        <TouchableOpacity onPress={() => {
                            const d = new Date(currentMonth);
                            d.setMonth(d.getMonth() + 1);
                            setCurrentMonth(d);
                        }}>
                            <FontAwesome name="chevron-right" size={12} color={theme.text} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.daysRow}>
                        {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map(d => (
                            <Text key={d} style={[styles.dayLabel, { color: theme.textSecondary }]}>{d}</Text>
                        ))}
                    </View>

                    <View style={styles.calendarGrid}>
                        {(() => {
                            const year = currentMonth.getFullYear();
                            const month = currentMonth.getMonth();
                            const firstDay = new Date(year, month, 1).getDay();
                            const daysInMonth = new Date(year, month + 1, 0).getDate();
                            const prevMonthDays = new Date(year, month, 0).getDate();

                            const rows = [];
                            let cells = [];

                            // Previous month days
                            for (let i = firstDay - 1; i >= 0; i--) {
                                cells.push(<Text key={`prev-${i}`} style={[styles.dayCell, styles.inactiveDay, { color: theme.border }]}>{prevMonthDays - i}</Text>);
                            }

                            // Current month days
                            for (let d = 1; d <= daysInMonth; d++) {
                                const isSelected = eventDate.getDate() === d &&
                                    eventDate.getMonth() === month &&
                                    eventDate.getFullYear() === year;
                                const today = new Date();
                                const isToday = today.getDate() === d &&
                                    today.getMonth() === month &&
                                    today.getFullYear() === year;
                                cells.push(
                                    <TouchableOpacity
                                        key={d || `empty-${Math.random()}`}
                                        disabled={!d}
                                        style={[
                                            styles.dayCellContainer,
                                            isSelected && { backgroundColor: theme.tint }
                                        ]}
                                        onPress={() => d && setEventDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d))}
                                    >
                                        <Text style={[
                                            styles.dayCell,
                                            { color: theme.text },
                                            isSelected && { color: '#FFF' },
                                            !d && { color: 'transparent' },
                                            isToday && !isSelected && { color: theme.tint, fontWeight: 'bold' }
                                        ]}>
                                            {d}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            }

                            // Next month days (fill the rest of the row)
                            const totalCells = cells.length;
                            const remaining = (7 - (totalCells % 7)) % 7;
                            for (let i = 1; i <= remaining; i++) {
                                cells.push(<Text key={`next-${i}`} style={[styles.dayCell, styles.inactiveDay, { color: theme.border }]}>{i}</Text>);
                            }

                            // Split into rows
                            for (let i = 0; i < cells.length; i += 7) {
                                rows.push(<View key={`row-${i}`} style={styles.gridRow}>{cells.slice(i, i + 7)}</View>);
                            }

                            return rows;
                        })()}
                    </View>
                </View>

                <View style={[styles.pinSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={styles.pinHeader}>
                        <View style={styles.pinInfo}>
                            <Text style={[styles.pinTitle, { color: theme.text }]}>{t('pin_protect')}</Text>
                            <Text style={[styles.pinDesc, { color: theme.textSecondary }]}>{t('pin_sub')}</Text>
                        </View>
                        <Switch
                            value={hasPin}
                            onValueChange={setHasPin}
                            trackColor={{ false: theme.border, true: theme.tint }}
                            thumbColor="#FFF"
                        />
                    </View>
                </View>

                {hasPin && (
                    <View style={styles.pinInputWrapper}>
                        <Text style={[styles.label, { color: theme.text }]}>{t('pin_label')}</Text>
                        <View style={[styles.pinInputContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                            <TextInput
                                style={[styles.pinInput, { color: theme.text }]}
                                placeholder="0  0  0  0"
                                placeholderTextColor={theme.textSecondary}
                                maxLength={4}
                                keyboardType="number-pad"
                                secureTextEntry
                                value={pin}
                                onChangeText={setPin}
                            />
                        </View>
                    </View>
                )}
                <TouchableOpacity activeOpacity={0.8} style={[styles.submitButton, { backgroundColor: theme.tint }, isLoading && { opacity: 0.6 }]} onPress={handleCreateEvent} disabled={isLoading}>
                    <FontAwesome name="camera" size={18} color="#FFF" />
                    <Text style={styles.submitText}>{isLoading ? t('creating') : t('create_camera')}</Text>
                </TouchableOpacity>

                <View style={{ height: 60 + insets.bottom }} />
            </ScrollView>

            {/* Source Selection Modal */}
            <Modal
                visible={showCoverSource}
                transparent
                animationType="fade"
                onRequestClose={() => setShowCoverSource(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowCoverSource(false)}
                >
                    <View style={[styles.sourceModalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />
                        <Text style={[styles.sourceModalTitle, { color: theme.text }]}>{t('select_source')}</Text>

                        <View style={styles.sourceOptionsContainer}>
                            <TouchableOpacity style={styles.sourceOption} onPress={pickImageFromCamera}>
                                <View style={[styles.sourceIconBg, { backgroundColor: theme.tint + '15' }]}>
                                    <FontAwesome name="camera" size={24} color={theme.tint} />
                                </View>
                                <Text style={[styles.sourceOptionText, { color: theme.text }]}>{t('camera')}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.sourceOption} onPress={pickImageFromGallery}>
                                <View style={[styles.sourceIconBg, { backgroundColor: '#4A90E220' }]}>
                                    <FontAwesome name="image" size={24} color="#4A90E2" />
                                </View>
                                <Text style={[styles.sourceOptionText, { color: theme.text }]}>{t('gallery')}</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={[styles.sourceCancelButton, { backgroundColor: theme.background }]} onPress={() => setShowCoverSource(false)}>
                            <Text style={styles.sourceCancelText}>{t('cancel')}</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    topCreateButton: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 12,
    },
    topCreateText: {
        fontWeight: 'bold',
        fontSize: 13,
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    coverPicker: {
        width: '100%',
        height: 160,
        borderRadius: 25,
        borderWidth: 2,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        marginBottom: 25,
    },
    coverImagePreview: {
        width: '100%',
        height: '100%',
    },
    coverPlaceholder: {
        alignItems: 'center',
    },
    coverText: {
        fontSize: 14,
        marginTop: 10,
        fontWeight: '500',
    },
    templateScroll: {
        marginBottom: 25,
        marginLeft: -20,
        marginRight: -20,
    },
    templateCard: {
        width: 110,
        height: 140,
        borderRadius: 25,
        marginRight: 15,
        padding: 15,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
    },
    templateIconBg: {
        width: 60,
        height: 60,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    templateName: {
        fontSize: 12,
        textAlign: 'center',
    },
    formItem: {
        marginBottom: 25,
    },
    label: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    input: {
        borderRadius: 15,
        padding: 15,
        fontSize: 15,
        borderWidth: 1,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    calendarHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    calendarIconBg: {
        width: 32,
        height: 32,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    calendarTitle: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    calendarContainer: {
        borderRadius: 25,
        padding: 20,
        marginBottom: 25,
        borderWidth: 1,
    },
    monthHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    monthTitle: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    daysRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    dayLabel: {
        fontSize: 11,
        width: 35,
        textAlign: 'center',
        fontWeight: 'bold',
    },
    calendarGrid: {
        gap: 10,
    },
    gridRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dayCellContainer: {
        width: 35,
        height: 35,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dayCell: {
        fontSize: 13,
        textAlign: 'center',
    },
    inactiveDay: {
        opacity: 0.3,
    },
    pinInputWrapper: {
        marginBottom: 30,
    },
    pinSection: {
        borderRadius: 25,
        padding: 20,
        marginBottom: 30,
        borderWidth: 1,
    },
    pinHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    pinInfo: {
        flex: 1,
        marginRight: 10,
    },
    pinTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    pinDesc: {
        fontSize: 12,
        lineHeight: 18,
    },
    pinInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 22,
        borderRadius: 25,
        borderWidth: 1,
        justifyContent: 'center',
    },
    pinInput: {
        fontSize: 20,
        fontWeight: 'bold',
        letterSpacing: 8,
        textAlign: 'center',
        width: '100%',
    },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 60,
        borderRadius: 20,
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    submitText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    sourceModalContent: {
        borderTopLeftRadius: 35,
        borderTopRightRadius: 35,
        padding: 30,
        borderWidth: 1,
        borderBottomWidth: 0,
    },
    modalHandle: {
        width: 40,
        height: 5,
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 25,
    },
    sourceModalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 30,
    },
    sourceOptionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 35,
    },
    sourceOption: {
        alignItems: 'center',
        gap: 12,
    },
    sourceIconBg: {
        width: 75,
        height: 75,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sourceOptionText: {
        fontSize: 14,
        fontWeight: '600',
    },
    sourceCancelButton: {
        padding: 18,
        borderRadius: 20,
        alignItems: 'center',
    },
    sourceCancelText: {
        color: '#8E8E93',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
