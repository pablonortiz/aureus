import React, {useCallback, useState} from 'react';
import {StyleSheet, Text, View, FlatList, Pressable} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {colors, fontFamily, borderRadius} from '../../../core/theme';
import {Header, Icon, EmptyState} from '../../../core/components';
import type {PlatformUsage} from '../../../core/types';
import type {RootStackParamList} from '../../../app/navigation/types';
import {useGmailStore} from '../store/useGmailStore';
import {StatusCounters} from '../components/StatusCounters';
import {DeletePlatformDialog} from '../components/DeletePlatformDialog';

function accountsPrefix(accountCount: number): string | undefined {
  if (accountCount === 0) {
    return undefined;
  }
  return accountCount === 1 ? 'En 1 cuenta' : `En ${accountCount} cuentas`;
}

function PlatformRow({
  platform,
  onDelete,
}: {
  platform: PlatformUsage;
  onDelete: () => void;
}) {
  const isUnused = platform.accountCount === 0;

  return (
    <View style={[styles.row, isUnused && styles.rowUnused]}>
      <View style={styles.rowIcon}>
        <Icon name="apps" size={20} color={colors.primary} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowName}>{platform.name}</Text>
        <StatusCounters
          counts={platform}
          prefix={accountsPrefix(platform.accountCount)}
          emptyText="Sin cuentas"
        />
      </View>
      <Pressable
        onPress={onDelete}
        hitSlop={8}
        style={({pressed}) => [styles.deleteBtn, pressed && styles.pressed]}>
        <Icon name="delete-outline" size={20} color={colors.dangerRed} />
      </Pressable>
    </View>
  );
}

export function ManagePlatformsScreen() {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {accounts, platformUsage, loadPlatformUsage, deletePlatform} =
    useGmailStore();

  const [pendingDeletion, setPendingDeletion] = useState<PlatformUsage | null>(
    null,
  );

  useFocusEffect(
    useCallback(() => {
      loadPlatformUsage();
    }, [loadPlatformUsage]),
  );

  const handleConfirmDelete = async () => {
    if (!pendingDeletion) {
      return;
    }
    const platformId = pendingDeletion.id;
    setPendingDeletion(null);
    await deletePlatform(platformId);
  };

  const renderItem = useCallback(
    ({item}: {item: PlatformUsage}) => (
      <PlatformRow platform={item} onDelete={() => setPendingDeletion(item)} />
    ),
    [],
  );

  return (
    <View style={styles.container}>
      <Header
        title="Plataformas"
        onBack={() => navigation.goBack()}
        rightIcon="add"
        onRightPress={() => navigation.navigate('AddPlatform')}
      />

      {platformUsage.length === 0 ? (
        <EmptyState
          icon="apps"
          title="Sin plataformas"
          description="Agregá una plataforma a todas las cuentas o a una sola desde su card."
        />
      ) : (
        <>
          <Text style={styles.summary}>
            <Text style={styles.summaryNumber}>{platformUsage.length}</Text>{' '}
            {platformUsage.length === 1 ? 'plataforma' : 'plataformas'}
            {'  ·  '}
            <Text style={styles.summaryNumber}>{accounts.length}</Text>{' '}
            {accounts.length === 1 ? 'cuenta' : 'cuentas'}
          </Text>

          <Text style={styles.sectionLabel}>CATÁLOGO GLOBAL</Text>

          <FlatList
            data={platformUsage}
            renderItem={renderItem}
            keyExtractor={item => String(item.id)}
            contentContainerStyle={[
              styles.list,
              {paddingBottom: 32 + insets.bottom},
            ]}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}

      <DeletePlatformDialog
        platform={pendingDeletion}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDeletion(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  summary: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textSecondary,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  summaryNumber: {
    fontFamily: fontFamily.bold,
    color: colors.primary,
  },
  sectionLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    letterSpacing: 2,
    color: 'rgba(232, 186, 48, 0.7)',
    textTransform: 'uppercase',
    paddingHorizontal: 24,
    marginTop: 20,
    marginBottom: 12,
  },
  list: {
    paddingHorizontal: 24,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.cardDark,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 16,
  },
  rowUnused: {
    opacity: 0.7,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 3,
  },
  rowName: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.dangerRedLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
