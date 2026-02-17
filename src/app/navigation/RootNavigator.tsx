import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {colors} from '../../core/theme';
import {MainTabNavigator} from './MainTabNavigator';
import {AccountsScreen} from '../../features/gmail-accounts/screens/AccountsScreen';
import {AddGmailScreen} from '../../features/gmail-accounts/screens/AddGmailScreen';
import {AddPlatformScreen} from '../../features/gmail-accounts/screens/AddPlatformScreen';
import {ClipboardScreen} from '../../features/clipboard/screens/ClipboardScreen';
import {AddLinkScreen} from '../../features/clipboard/screens/AddLinkScreen';
import {AddItemScreen} from '../../features/clipboard/screens/AddItemScreen';
import {EditItemScreen} from '../../features/clipboard/screens/EditItemScreen';
import {FolderViewScreen} from '../../features/clipboard/screens/FolderViewScreen';
import {ManageFoldersScreen} from '../../features/clipboard/screens/ManageFoldersScreen';
import {ManageTagsScreen} from '../../features/clipboard/screens/ManageTagsScreen';
import {FocusScreen} from '../../features/focus/screens/FocusScreen';
import {FinanceScreen} from '../../features/finance/screens/FinanceScreen';
import {AddTransactionScreen} from '../../features/finance/screens/AddTransactionScreen';
import {ManageRecurringScreen} from '../../features/finance/screens/ManageRecurringScreen';
import {AddRecurringScreen} from '../../features/finance/screens/AddRecurringScreen';
import {SourceFinderScreen} from '../../features/source-finder/screens/SourceFinderScreen';
import {SearchResultScreen} from '../../features/source-finder/screens/SearchResultScreen';
import {GalleryScreen} from '../../features/gallery/screens/GalleryScreen';
import {GalleryFolderScreen} from '../../features/gallery/screens/GalleryFolderScreen';
import {MediaViewerScreen} from '../../features/gallery/screens/MediaViewerScreen';
import {ManageGalleryCategoriesScreen} from '../../features/gallery/screens/ManageGalleryCategoriesScreen';
import {GalleryTrashScreen} from '../../features/gallery/screens/GalleryTrashScreen';
import type {RootStackParamList} from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <NavigationContainer
      theme={{
        dark: true,
        colors: {
          primary: colors.primary,
          background: colors.backgroundDark,
          card: colors.cardDark,
          text: colors.textPrimary,
          border: colors.borderGoldLight,
          notification: colors.primary,
        },
        fonts: {
          regular: {fontFamily: 'Manrope-Regular', fontWeight: '400'},
          medium: {fontFamily: 'Manrope-Medium', fontWeight: '500'},
          bold: {fontFamily: 'Manrope-Bold', fontWeight: '700'},
          heavy: {fontFamily: 'Manrope-ExtraBold', fontWeight: '800'},
        },
      }}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: {backgroundColor: colors.backgroundDark},
          animation: 'slide_from_right',
        }}>
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        <Stack.Screen name="GmailAccounts" component={AccountsScreen} />
        <Stack.Screen name="AddGmail" component={AddGmailScreen} />
        <Stack.Screen name="AddPlatform" component={AddPlatformScreen} />
        <Stack.Screen name="Clipboard" component={ClipboardScreen} />
        <Stack.Screen name="AddLink" component={AddLinkScreen} />
        <Stack.Screen name="AddItem" component={AddItemScreen} />
        <Stack.Screen name="EditItem" component={EditItemScreen} />
        <Stack.Screen name="FolderView" component={FolderViewScreen} />
        <Stack.Screen name="ManageFolders" component={ManageFoldersScreen} />
        <Stack.Screen name="ManageTags" component={ManageTagsScreen} />
        <Stack.Screen name="Focus" component={FocusScreen} />
        <Stack.Screen name="Finance" component={FinanceScreen} />
        <Stack.Screen name="AddTransaction" component={AddTransactionScreen} />
        <Stack.Screen name="ManageRecurring" component={ManageRecurringScreen} />
        <Stack.Screen name="AddRecurring" component={AddRecurringScreen} />
        <Stack.Screen name="SourceFinder" component={SourceFinderScreen} />
        <Stack.Screen name="SearchResult" component={SearchResultScreen} />
        <Stack.Screen name="Gallery" component={GalleryScreen} />
        <Stack.Screen name="GalleryFolder" component={GalleryFolderScreen} />
        <Stack.Screen name="MediaViewer" component={MediaViewerScreen} />
        <Stack.Screen name="ManageGalleryCategories" component={ManageGalleryCategoriesScreen} />
        <Stack.Screen name="GalleryTrash" component={GalleryTrashScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
