import { useSettings } from '@/context/AppSettingsContext';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import * as NavigationBar from 'expo-navigation-bar';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, FlatList, NativeScrollEvent, NativeSyntheticEvent, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const SLIDES = [
    {
        id: '1',
        titleKey: 'onb_slide1_title',
        descKey: 'onb_slide1_desc',
        icon: 'camera-retro'
    },
    {
        id: '2',
        titleKey: 'onb_slide2_title',
        descKey: 'onb_slide2_desc',
        icon: 'users'
    },
    {
        id: '3',
        titleKey: 'onb_slide3_title',
        descKey: 'onb_slide3_desc',
        icon: 'eye-slash'
    },
    {
        id: '4',
        titleKey: 'onb_slide4_title',
        descKey: 'onb_slide4_desc',
        icon: 'magic'
    }
];

export default function OnboardingScreen() {
    const { t, theme, setLanguage, language } = useSettings();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        if (Platform.OS === 'android') {
            NavigationBar.setBackgroundColorAsync(theme.background);
            NavigationBar.setButtonStyleAsync(theme.background === '#120D0A' ? 'light' : 'dark');
        }
    }, [theme]);

    const handleNext = () => {
        if (currentIndex < SLIDES.length - 1) {
            flatListRef.current?.scrollToIndex({
                index: currentIndex + 1,
                animated: true
            });
        } else {
            handleFinish();
        }
    };

    const handleFinish = () => {
        router.replace('/(tabs)');
    };

    const handleSkip = () => {
        handleFinish();
    };

    const toggleLang = () => {
        setLanguage(language === 'es' ? 'en' : 'es');
    };

    const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const slideSize = event.nativeEvent.layoutMeasurement.width;
        const index = event.nativeEvent.contentOffset.x / slideSize;
        const roundIndex = Math.round(index);
        setCurrentIndex(roundIndex);
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen options={{ headerShown: false }} />
            {/* Header: Skip & Language */}
            <View style={[styles.header, { marginTop: insets.top }]}>
                <TouchableOpacity onPress={toggleLang} style={[styles.langBtn, { backgroundColor: theme.card }]}>
                    <Text style={{ fontSize: 18 }}>{language === 'es' ? '🇪🇸' : '🇺🇸'}</Text>
                    <Text style={[styles.langText, { color: theme.text }]}>{language.toUpperCase()}</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleSkip}>
                    <Text style={[styles.skipText, { color: theme.textSecondary }]}>{t('onb_skip')}</Text>
                </TouchableOpacity>
            </View>

            {/* Slides */}
            <FlatList
                ref={flatListRef}
                data={SLIDES}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={item => item.id}
                onScroll={onScroll}
                scrollEventThrottle={16}
                renderItem={({ item }) => (
                    <View style={[styles.slide, { width }]}>
                        <View style={[styles.iconContainer, { backgroundColor: theme.card }]}>
                            <FontAwesome name={item.icon as any} size={80} color={theme.tint} />
                        </View>
                        <Text style={[styles.title, { color: theme.text }]}>
                            {t(item.titleKey as any)}
                        </Text>
                        <Text style={[styles.desc, { color: theme.textSecondary }]}>
                            {t(item.descKey as any)}
                        </Text>
                    </View>
                )}
                getItemLayout={(_, index) => ({
                    length: width,
                    offset: width * index,
                    index,
                })}
            />

            {/* Footer: Paginator & CTA */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
                {/* Dots */}
                <View style={styles.pagination}>
                    {SLIDES.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.dot,
                                { backgroundColor: index === currentIndex ? theme.tint : theme.border },
                                index === currentIndex && { width: 25 }
                            ]}
                        />
                    ))}
                </View>

                {/* Primary Button */}
                <TouchableOpacity
                    style={[styles.mainBtn, { backgroundColor: theme.tint }]}
                    onPress={handleNext}
                >
                    <Text style={styles.mainBtnText}>
                        {currentIndex === SLIDES.length - 1 ? t('onb_start') : t('onb_next')}
                    </Text>
                    <Ionicons
                        name={currentIndex === SLIDES.length - 1 ? "checkmark" : "arrow-forward"}
                        size={20}
                        color="#FFF"
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 10,
        zIndex: 10,
    },
    langBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    langText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    skipText: {
        fontSize: 14,
        fontWeight: '600',
    },
    slide: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    iconContainer: {
        width: 180,
        height: 180,
        borderRadius: 90,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 50,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 15,
        letterSpacing: 0.5,
    },
    desc: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
    },
    footer: {
        paddingHorizontal: 30,
        alignItems: 'center',
        gap: 30,
    },
    pagination: {
        flexDirection: 'row',
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    mainBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        width: '100%',
        height: 56,
        borderRadius: 28,
        shadowColor: "#FF6B00",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
    mainBtnText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    }
});
