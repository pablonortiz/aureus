import React, {useEffect} from 'react';
import {StatusBar, LogBox, AppState} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {RootNavigator} from './navigation/RootNavigator';
import {getDatabase} from '../core/database';
import {useShareReceiver} from '../features/gallery/hooks/useShareReceiver';
import {createNotificationChannel} from '../features/tasks/services/notificationService';
import {updateTasksWidget} from '../features/tasks/services/widgetBridge';

LogBox.ignoreLogs(['Non-serializable values were found in the navigation state']);

export default function App() {
  useEffect(() => {
    // Initialize database on app start
    getDatabase();
    // Create notification channel
    createNotificationChannel();
  }, []);

  // Sync widget when app comes to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        updateTasksWidget();
      }
    });
    return () => sub.remove();
  }, []);

  useShareReceiver();

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent
        />
        <RootNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
