import type {NavigatorScreenParams} from '@react-navigation/native';

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  GmailAccounts: undefined;
  AddGmail: undefined;
  AddPlatform: undefined;
  Clipboard: undefined;
  AddLink: {isPrivate?: boolean};
  AddItem: {isPrivate?: boolean; folderId?: number};
  EditItem: {itemId: number};
  FolderView: {folderId: number; folderName: string};
  ManageFolders: undefined;
  ManageTags: undefined;
  ManageCategories: undefined;
  PinLock: {onSuccess: () => void};
  Focus: undefined;
  FocusSettings: undefined;
  Finance: undefined;
  AddTransaction: {
    pendingTransactionId?: number;
    prefillTitle?: string;
    prefillAmount?: number;
    prefillCurrency?: 'ARS' | 'USD';
    prefillCategoryIds?: number[];
  } | undefined;
  ManageRecurring: undefined;
  AddRecurring: {recurringId?: number} | undefined;
  SourceFinder: undefined;
  SearchResult: {searchId: number};
  Calculator: undefined;
  Gallery: undefined;
  GalleryFolder: {folderId: number; folderName: string};
  MediaViewer: {mediaId: number};
  ManageGalleryCategories: undefined;
  GalleryTrash: undefined;
  Radar: undefined;
  RadarResults: {searchId: number};
  RadarSaved: {searchId: number};
};

export type MainTabParamList = {
  Inicio: undefined;
  Modulos: undefined;
  Perfil: undefined;
  Mas: undefined;
};
