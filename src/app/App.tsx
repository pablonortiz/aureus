import React, {useEffect} from 'react';
import {StatusBar, LogBox} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {RootNavigator} from './navigation/RootNavigator';
import {getDatabase} from '../core/database';
import {useShareReceiver} from '../features/gallery/hooks/useShareReceiver';

LogBox.ignoreLogs(['Non-serializable values were found in the navigation state']);

export default function App() {
  useEffect(() => {
    // Initialize database on app start
    getDatabase();
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
