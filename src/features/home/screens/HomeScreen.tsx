import React, {useCallback} from 'react';
import {StyleSheet, Text, View, ScrollView, Pressable, Image} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {colors, typography, fontFamily, spacing, borderRadius} from '../../../core/theme';
import {Icon} from '../../../core/components';
import type {RootStackParamList} from '../../../app/navigation/types';
import type {ModuleDefinition} from '../../../core/types';
import {useRecentActivity} from '../hooks/useRecentActivity';
import {useUserName} from '../../../core/hooks/useUserName';

const aureusLogo = require('../../../assets/images/aureus-logo.png');

const modules: ModuleDefinition[] = [
  {
    id: 'tasks',
    name: 'Tareas',
    icon: 'task-alt',
    description: 'Tu lista de pendientes',
    route: 'Tasks',
  },
  {
    id: 'gmail',
    name: 'Gmail',
    icon: 'email',
    description: 'Gestionar cuentas',
    route: 'GmailAccounts',
  },
  {
    id: 'clipboard',
    name: 'Clipboard',
    icon: 'content-paste',
    description: 'Tus links guardados',
    route: 'Clipboard',
  },
  {
    id: 'focus',
    name: 'Enfoque',
    icon: 'check-circle',
    description: 'Sesión de trabajo',
    route: 'Focus',
  },
  {
    id: 'finance',
    name: 'Finanzas',
    icon: 'account-balance-wallet',
    description: 'Revisá tu balance',
    route: 'Finance',
  },
  {
    id: 'source-finder',
    name: 'Buscador',
    icon: 'image-search',
    description: 'Identificá manga, anime y más',
    route: 'SourceFinder',
  },
  {
    id: 'calculator',
    name: 'Calculadora',
    icon: 'calculate',
    description: 'Calculadora',
    route: 'Calculator',
  },
  {
    id: 'radar',
    name: 'Radar',
    icon: 'radar',
    description: 'Búsqueda en tiempo real',
    route: 'Radar',
  },
];

function ModuleCard({module, onPress}: {module: ModuleDefinition; onPress: () => void}) {
  return (
    <Pressable
      onPress={onPress}
      style={({pressed}) => [styles.moduleCard, pressed && styles.moduleCardPressed]}>
      <View style={styles.moduleIconContainer}>
        <Icon name={module.icon} size={28} color={colors.primary} />
      </View>
      <View>
        <Text style={styles.moduleName}>{module.name}</Text>
        <Text style={styles.moduleDesc}>{module.description}</Text>
      </View>
      <View style={styles.moduleArrow}>
        <Icon name="arrow-outward" size={14} color={colors.textPrimary} />
      </View>
    </Pressable>
  );
}

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {activities, reload} = useRecentActivity(6);
  const {userName, loadUserName} = useUserName();

  // Reload activity feed every time the Home tab gets focus
  useFocusEffect(
    useCallback(() => {
      reload();
      loadUserName();
    }, [reload, loadUserName]),
  );

  const handleModulePress = useCallback(
    (route: string) => {
      navigation.navigate(route as any);
    },
    [navigation],
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, {paddingTop: insets.top + 16}]}
      showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoContainer}>
            <Image source={aureusLogo} style={styles.logoImage} />
          </View>
          <Text style={styles.appTitle}>AUREUS</Text>
        </View>
        <Pressable style={styles.notifButton}>
          <Icon name="notifications" size={22} color={colors.textSecondary} />
        </Pressable>
      </View>

      {/* Welcome */}
      <View style={styles.welcome}>
        <Text style={styles.welcomeText}>
          Bienvenido de vuelta, <Text style={styles.welcomeName}>{userName}</Text>
        </Text>
        <Text style={styles.welcomeSub}>Todo está en orden para tu día.</Text>
      </View>

      {/* Module Grid */}
      <View style={styles.grid}>
        {modules.map(module => (
          <ModuleCard
            key={module.id}
            module={module}
            onPress={() => handleModulePress(module.route)}
          />
        ))}
      </View>

      {/* Recent Activity */}
      <View style={styles.activitySection}>
        <View style={styles.activityHeader}>
          <Text style={styles.activityTitle}>Actividad Reciente</Text>
        </View>

        {activities.length === 0 ? (
          <View style={styles.activityEmpty}>
            <Text style={styles.activityEmptyText}>
              Sin actividad reciente. Usá los módulos para empezar.
            </Text>
          </View>
        ) : (
          activities.map(item => (
            <View key={item.id} style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <Icon name={item.icon} size={20} color={colors.primary} />
              </View>
              <View style={styles.activityInfo}>
                <Text style={styles.activityItemTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.activityItemSub}>{item.module}</Text>
              </View>
              <Text
                style={[
                  styles.activityStatus,
                  item.statusColor ? {color: item.statusColor} : null,
                ]}>
                {item.status}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={{height: 100}} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  content: {
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
  },
  appTitle: {
    ...typography.appTitle,
    color: colors.primary,
  },
  notifButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceDark,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcome: {
    marginBottom: 24,
  },
  welcomeText: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  welcomeName: {
    color: colors.primary,
  },
  welcomeSub: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  moduleCard: {
    width: '47%',
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.borderGold,
    gap: 16,
  },
  moduleCardPressed: {
    borderColor: 'rgba(232, 186, 48, 0.6)',
  },
  moduleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleName: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  moduleDesc: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  moduleArrow: {
    position: 'absolute',
    top: 16,
    right: 16,
    opacity: 0.2,
  },
  activitySection: {
    marginBottom: 16,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  activityTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  activityViewAll: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    letterSpacing: 1,
    color: colors.primary,
    textTransform: 'uppercase',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: `${colors.surfaceDark}80`,
    padding: 12,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: 12,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityInfo: {
    flex: 1,
  },
  activityItemTitle: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    color: colors.textPrimary,
  },
  activityItemSub: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  activityStatus: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    color: colors.primary,
  },
  activityEmpty: {
    padding: 20,
    alignItems: 'center',
  },
  activityEmptyText: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
