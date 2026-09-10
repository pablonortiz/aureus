import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {StyleSheet, Text, View, FlatList, Pressable} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {colors, typography, fontFamily, borderRadius} from '../../../core/theme';
import {Icon, FAB, EmptyState} from '../../../core/components';
import {useGmailStore} from '../store/useGmailStore';
import type {
  AccountPlatform,
  GmailAccountWithPlatforms,
  PlatformStatus,
} from '../../../core/types';
import type {RootStackParamList} from '../../../app/navigation/types';
import {GmailCard} from '../components/GmailCard';
import {StatusLegend} from '../components/StatusLegend';
import {PlatformStatusSheet} from '../components/PlatformStatusSheet';
import {AddPlatformToAccountSheet} from '../components/AddPlatformToAccountSheet';

interface PlatformTarget {
  account: GmailAccountWithPlatforms;
  platform: AccountPlatform;
}

export function AccountsScreen() {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    accounts,
    platforms,
    loadAccounts,
    loadPlatforms,
    setPlatformStatus,
    removePlatformFromAccount,
    addPlatformToAccount,
  } = useGmailStore();

  const [statusTarget, setStatusTarget] = useState<PlatformTarget | null>(null);
  const [addTarget, setAddTarget] = useState<GmailAccountWithPlatforms | null>(
    null,
  );

  useEffect(() => {
    loadAccounts();
    loadPlatforms();
  }, [loadAccounts, loadPlatforms]);

  const addTargetPlatformNames = useMemo(
    () =>
      new Set(
        (addTarget?.platforms || []).map(platform =>
          platform.platform_name.toLowerCase(),
        ),
      ),
    [addTarget],
  );

  const availablePlatforms = useMemo(
    () =>
      platforms.filter(
        platform => !addTargetPlatformNames.has(platform.name.toLowerCase()),
      ),
    [platforms, addTargetPlatformNames],
  );

  const handleSelectStatus = async (status: PlatformStatus) => {
    if (!statusTarget) {
      return;
    }
    const {account, platform} = statusTarget;
    setStatusTarget(null);
    await setPlatformStatus(account.id, platform.platform_id, status);
  };

  const handleRemovePlatform = async () => {
    if (!statusTarget) {
      return;
    }
    const {account, platform} = statusTarget;
    setStatusTarget(null);
    await removePlatformFromAccount(account.id, platform.platform_id);
  };

  const handleAddPlatform = async (name: string) => {
    if (!addTarget) {
      return;
    }
    const accountId = addTarget.id;
    setAddTarget(null);
    await addPlatformToAccount(accountId, name);
  };

  const renderItem = useCallback(
    ({item}: {item: GmailAccountWithPlatforms}) => (
      <GmailCard
        account={item}
        onPlatformLongPress={platform =>
          setStatusTarget({account: item, platform})
        }
        onAddPlatform={() => setAddTarget(item)}
      />
    ),
    [],
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, {paddingTop: insets.top + 12}]}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="chevron-left" size={24} color={colors.primary} />
          </Pressable>
          <Text style={styles.title}>Cuentas</Text>
        </View>
      </View>

      <View style={styles.managementSection}>
        <Text style={styles.sectionLabel}>GESTIÓN</Text>
        <Pressable
          style={styles.managementBtn}
          onPress={() => navigation.navigate('AddPlatform')}>
          <Icon name="add-box" size={22} color={colors.primary} />
          <Text style={styles.managementText}>Añadir Plataforma a Todos</Text>
        </Pressable>
        <Pressable
          style={[styles.managementBtn, styles.managementBtnSecondary]}
          onPress={() => navigation.navigate('ManagePlatforms')}>
          <Icon name="tune" size={22} color={colors.textSecondary} />
          <Text style={styles.managementTextSecondary}>
            Gestionar Plataformas
          </Text>
        </Pressable>
      </View>

      <Text style={styles.listLabel}>IDENTIDADES GMAIL</Text>

      {accounts.length === 0 ? (
        <EmptyState
          icon="email"
          title="Sin cuentas"
          description="Agregá tu primera cuenta Gmail para empezar a trackear plataformas."
        />
      ) : (
        <>
          <StatusLegend />
          <FlatList
            data={accounts}
            renderItem={renderItem}
            keyExtractor={item => String(item.id)}
            contentContainerStyle={[
              styles.list,
              {paddingBottom: 100 + insets.bottom},
            ]}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}

      <View style={[styles.fabContainer, {bottom: 24 + insets.bottom}]}>
        <FAB onPress={() => navigation.navigate('AddGmail')} />
      </View>

      <PlatformStatusSheet
        visible={!!statusTarget}
        platform={statusTarget?.platform || null}
        email={
          statusTarget ? `${statusTarget.account.email_prefix}@gmail.com` : ''
        }
        onSelect={handleSelectStatus}
        onRemove={handleRemovePlatform}
        onClose={() => setStatusTarget(null)}
      />

      <AddPlatformToAccountSheet
        visible={!!addTarget}
        email={addTarget ? `${addTarget.email_prefix}@gmail.com` : ''}
        availablePlatforms={availablePlatforms}
        accountPlatformNames={addTargetPlatformNames}
        onAdd={handleAddPlatform}
        onClose={() => setAddTarget(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  header: {
    backgroundColor: 'rgba(30, 30, 30, 0.8)',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGoldLight,
    paddingHorizontal: 24,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  managementSection: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    gap: 10,
  },
  sectionLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    letterSpacing: 2,
    color: 'rgba(232, 186, 48, 0.7)',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  managementBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderGold,
    backgroundColor: colors.primaryLight,
  },
  managementBtnSecondary: {
    paddingVertical: 12,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.cardDark,
  },
  managementText: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.primary,
  },
  managementTextSecondary: {
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
    color: colors.textSecondary,
  },
  listLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    color: colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: 24,
    marginTop: 8,
    marginBottom: 12,
  },
  list: {
    paddingHorizontal: 24,
    gap: 16,
  },
  fabContainer: {
    position: 'absolute',
    right: 24,
  },
});
