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
};

export type MainTabParamList = {
  Inicio: undefined;
  Modulos: undefined;
  Perfil: undefined;
  Mas: undefined;
};
