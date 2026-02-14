import React, {useEffect, useCallback} from 'react';
import {StyleSheet, Text, View, FlatList, Pressable, Alert} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {colors, typography, fontFamily, borderRadius} from '../../../core/theme';
import {Icon, Chip, FAB, EmptyState} from '../../../core/components';
import {useGmailStore} from '../store/useGmailStore';
import type {GmailAccountWithPlatforms} from '../../../core/types';
import type {RootStackParamList} from '../../../app/navigation/types';

function GmailCard({account}: {account: GmailAccountWithPlatforms}) {
  const togglePlatformStatus = useGmailStore(s => s.togglePlatformStatus);
  const deleteAccount = useGmailStore(s => s.deleteAccount);

  const statusText = account.allCompleted
    ? 'Todos los registros sincronizados'
    : account.totalCount === 0
      ? 'Listo para configurar'
      : `${account.pendingCount} plataformas pendientes`;

  const handleDelete = () => {
    Alert.alert(
      'Eliminar cuenta',
      `¿Eliminar ${account.email_prefix}@gmail.com?`,
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => deleteAccount(account.id),
        },
      ],
    );
  };

  return (
    <View
      style={[
        styles.card,
        account.allCompleted && styles.cardCompleted,
      ]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.mailIcon, account.allCompleted && styles.mailIconCompleted]}>
            <Icon
              name="mail"
              size={20}
              color={account.allCompleted ? colors.textMuted : colors.dangerRed}
            />
          </View>
          <View>
            <Text
              style={[
                styles.email,
                account.allCompleted && styles.emailCompleted,
              ]}>
              {account.email_prefix}@gmail.com
            </Text>
            <Text
              style={[
                styles.status,
                account.allCompleted && styles.statusCompleted,
              ]}>
              {account.allCompleted && (
                <Icon name="done-all" size={12} color={colors.successGreen} />
              )}{' '}
              {statusText}
            </Text>
          </View>
        </View>
        <Pressable onPress={handleDelete}>
          <Icon
            name="more-vert"
            size={20}
            color={account.allCompleted ? colors.textMuted : colors.primary}
          />
        </Pressable>
      </View>

      <View style={styles.chipsContainer}>
        {account.platforms.map(p => (
          <Chip
            key={p.platform_id}
            label={p.platform_name || ''}
            completed={p.is_registered}
            icon="sync"
            onPress={() => togglePlatformStatus(account.id, p.platform_id)}
          />
        ))}
      </View>
    </View>
  );
}

export function AccountsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {accounts, loading, loadAccounts, loadPlatforms} = useGmailStore();

  useEffect(() => {
    loadAccounts();
    loadPlatforms();
  }, [loadAccounts, loadPlatforms]);

  const renderItem = useCallback(
    ({item}: {item: GmailAccountWithPlatforms}) => <GmailCard account={item} />,
    [],
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, {paddingTop: insets.top + 12}]}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="chevron-left" size={24} color={colors.primary} />
          </Pressable>
          <Text style={styles.title}>Cuentas</Text>
        </View>
      </View>

      {/* Add Platform to All */}
      <View style={styles.managementSection}>
        <Text style={styles.sectionLabel}>GESTIÓN</Text>
        <Pressable
          style={styles.addPlatformBtn}
          onPress={() => navigation.navigate('AddPlatform')}>
          <Icon name="add-box" size={22} color={colors.primary} />
          <Text style={styles.addPlatformText}>Añadir Plataforma a Todos</Text>
        </Pressable>
      </View>

      {/* Account List */}
      <Text style={styles.listLabel}>IDENTIDADES GMAIL</Text>

      {accounts.length === 0 ? (
        <EmptyState
          icon="email"
          title="Sin cuentas"
          description="Agregá tu primera cuenta Gmail para empezar a trackear plataformas."
        />
      ) : (
        <FlatList
          data={accounts}
          renderItem={renderItem}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      <View style={[styles.fabContainer, {bottom: 24 + insets.bottom}]}>
        <FAB onPress={() => navigation.navigate('AddGmail')} />
      </View>
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
  },
  sectionLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    letterSpacing: 2,
    color: 'rgba(232, 186, 48, 0.7)',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  addPlatformBtn: {
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
  addPlatformText: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.primary,
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
    paddingBottom: 100,
    gap: 16,
  },
  card: {
    backgroundColor: colors.cardDark,
    borderRadius: borderRadius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  cardCompleted: {
    opacity: 0.6,
    backgroundColor: `${colors.cardDark}80`,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  mailIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mailIconCompleted: {
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
  },
  email: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  emailCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.7,
  },
  status: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusCompleted: {
    fontFamily: fontFamily.medium,
    color: colors.successGreen,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fabContainer: {
    position: 'absolute',
    right: 24,
  },
});
