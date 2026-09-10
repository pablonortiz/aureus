import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Alert,
  Clipboard,
  ToastAndroid,
} from 'react-native';
import {colors, borderRadius, fontFamily} from '../../../core/theme';
import {Icon} from '../../../core/components';
import type {
  AccountPlatform,
  GmailAccountWithPlatforms,
} from '../../../core/types';
import {useGmailStore} from '../store/useGmailStore';
import {nextPlatformStatus} from '../utils/platformStatus';
import {PlatformChip, AddPlatformChip} from './PlatformChip';
import {StatusCounters} from './StatusCounters';

interface GmailCardProps {
  account: GmailAccountWithPlatforms;
  onPlatformLongPress: (platform: AccountPlatform) => void;
  onAddPlatform: () => void;
}

export function GmailCard({
  account,
  onPlatformLongPress,
  onAddPlatform,
}: GmailCardProps) {
  const setPlatformStatus = useGmailStore(s => s.setPlatformStatus);
  const deleteAccount = useGmailStore(s => s.deleteAccount);

  const email = `${account.email_prefix}@gmail.com`;

  const handleCopy = () => {
    Clipboard.setString(email);
    ToastAndroid.show(`${email} copiado`, ToastAndroid.SHORT);
  };

  const handleDelete = () => {
    Alert.alert('Eliminar cuenta', `¿Eliminar ${email}?`, [
      {text: 'Cancelar', style: 'cancel'},
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => deleteAccount(account.id),
      },
    ]);
  };

  return (
    <View style={[styles.card, account.allFinished && styles.cardFinished]}>
      <View style={styles.cardHeader}>
        <Pressable
          onPress={handleCopy}
          style={({pressed}) => [styles.headerLeft, pressed && styles.pressed]}>
          <View
            style={[
              styles.mailIcon,
              account.allFinished && styles.mailIconFinished,
            ]}>
            <Icon
              name="mail"
              size={20}
              color={account.allFinished ? colors.textMuted : colors.dangerRed}
            />
          </View>
          <View style={styles.headerText}>
            <View style={styles.emailRow}>
              <Text
                style={[
                  styles.email,
                  account.allFinished && styles.emailFinished,
                ]}
                numberOfLines={1}>
                {email}
              </Text>
              <Icon name="content-copy" size={14} color={colors.textMuted} />
            </View>
            <View style={styles.counters}>
              <StatusCounters counts={account} emptyText="Sin plataformas" />
            </View>
          </View>
        </Pressable>
        <Pressable onPress={handleDelete} hitSlop={8}>
          <Icon
            name="more-vert"
            size={20}
            color={account.allFinished ? colors.textMuted : colors.primary}
          />
        </Pressable>
      </View>

      <View style={styles.chipsContainer}>
        {account.platforms.map(platform => (
          <PlatformChip
            key={platform.platform_id}
            label={platform.platform_name}
            status={platform.status}
            onPress={() =>
              setPlatformStatus(
                account.id,
                platform.platform_id,
                nextPlatformStatus(platform.status),
              )
            }
            onLongPress={() => onPlatformLongPress(platform)}
          />
        ))}
        <AddPlatformChip onPress={onAddPlatform} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardDark,
    borderRadius: borderRadius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  cardFinished: {
    opacity: 0.6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  pressed: {
    opacity: 0.6,
  },
  headerText: {
    flex: 1,
  },
  mailIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.dangerRedLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mailIconFinished: {
    backgroundColor: colors.neutralDark,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  email: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  emailFinished: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  counters: {
    marginTop: 2,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
