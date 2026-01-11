import { useAuth } from '@/context/AuthContext';
import { Redirect } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

export default function RootIndex() {
    const { user, loading } = useAuth();

    if (loading) {
        return <View style={{ flex: 1, backgroundColor: '#120D0A' }} />;
    }

    // Always redirect to tabs. 
    // If anonymous, Profile screen will show login options.
    // This supports "browse as guest" by default.
    return <Redirect href="/(tabs)" />;
}
