import React from 'react';
import {StyleSheet, Text, View, ScrollView, Pressable} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {colors, typography, fontFamily, borderRadius} from '../../../core/theme';
import {Icon} from '../../../core/components';
import type {RootStackParamList} from '../../../app/navigation/types';

const allModules = [
  {id: 'tasks', name: 'Tareas', icon: 'task-alt', desc: 'Lista de tareas y pendientes', route: 'Tasks'},
  {id: 'gmail', name: 'Cuentas Gmail', icon: 'email', desc: 'Gestionar cuentas y plataformas', route: 'GmailAccounts'},
  {id: 'clipboard', name: 'Clipboard', icon: 'content-paste', desc: 'Links guardados y bóveda segura', route: 'Clipboard'},
  {id: 'focus', name: 'Enfoque', icon: 'timer', desc: 'Sesiones de trabajo profundo', route: 'Focus'},
  {id: 'finance', name: 'Finanzas', icon: 'account-balance-wallet', desc: 'Balance y transacciones', route: 'Finance'},
  {id: 'source-finder', name: 'Buscador de Fuentes', icon: 'image-search', desc: 'Identificá manga, anime y más', route: 'SourceFinder'},
  {id: 'calculator', name: 'Calculadora', icon: 'calculate', desc: 'Calculadora estándar', route: 'Calculator'},
  {id: 'radar', name: 'Radar', icon: 'radar', desc: 'Búsqueda inteligente en tiempo real', route: 'Radar'},
];

export function ModulesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, {paddingTop: insets.top + 16}]}>
      <Text style={styles.title}>Módulos</Text>
      <Text style={styles.subtitle}>Todos tus módulos disponibles</Text>

      <View style={styles.list}>
        {allModules.map(mod => (
          <Pressable
            key={mod.id}
            style={({pressed}) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => navigation.navigate(mod.route as any)}>
            <View style={styles.cardIcon}>
              <Icon name={mod.icon} size={28} color={colors.primary} />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardName}>{mod.name}</Text>
              <Text style={styles.cardDesc}>{mod.desc}</Text>
            </View>
            <Icon name="chevron-right" size={20} color={colors.textMuted} />
          </Pressable>
        ))}
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
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  list: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.borderGold,
  },
  cardPressed: {
    borderColor: 'rgba(232, 186, 48, 0.6)',
  },
  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  cardDesc: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
