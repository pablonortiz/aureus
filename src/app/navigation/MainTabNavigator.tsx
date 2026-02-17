import React, {useState} from 'react';
import {StyleSheet, View, Pressable, Text, Modal} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {colors, fontFamily, borderRadius} from '../../core/theme';
import {Icon} from '../../core/components';
import {HomeScreen} from '../../features/home/screens/HomeScreen';
import {ModulesScreen} from '../../features/modules/screens/ModulesScreen';
import {ProfileScreen} from '../../features/profile/screens/ProfileScreen';
import {SettingsScreen} from '../../features/profile/screens/SettingsScreen';
import type {MainTabParamList, RootStackParamList} from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const quickActions = [
  {
    icon: 'content-paste',
    label: 'Link o Nota',
    color: '#e8ba30',
    route: 'AddItem' as const,
    params: {},
  },
  {
    icon: 'account-balance-wallet',
    label: 'Transacción',
    color: '#3b82f6',
    route: 'AddTransaction' as const,
    params: {},
  },
  {
    icon: 'check-circle',
    label: 'Sesión de enfoque',
    color: '#22c55e',
    route: 'Focus' as const,
    params: undefined,
  },
  {
    icon: 'email',
    label: 'Cuenta Gmail',
    color: '#ef4444',
    route: 'AddGmail' as const,
    params: undefined,
  },
  {
    icon: 'image-search',
    label: 'Buscar fuente',
    color: '#f59e0b',
    route: 'SourceFinder' as const,
    params: undefined,
  },
  {
    icon: 'calculate',
    label: 'Calculadora',
    color: '#8b5cf6',
    route: 'Calculator' as const,
    params: undefined,
  },
  {
    icon: 'radar',
    label: 'Radar',
    color: '#06b6d4',
    route: 'Radar' as const,
    params: undefined,
  },
];

function FABButton() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [menuVisible, setMenuVisible] = useState(false);

  const handleAction = (route: string, params?: any) => {
    setMenuVisible(false);
    navigation.navigate(route as any, params);
  };

  return (
    <>
      <View style={[styles.fabWrapper, {bottom: 28 + insets.bottom}]}>
        <Pressable
          onPress={() => setMenuVisible(true)}
          style={({pressed}) => [styles.fab, pressed && styles.fabPressed]}>
          <Icon name="add" size={30} color={colors.backgroundDark} />
        </Pressable>
      </View>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}>
        <Pressable
          style={styles.menuOverlay}
          onPress={() => setMenuVisible(false)}>
          <View style={[styles.menuSheet, {paddingBottom: 40 + insets.bottom}]}>
            <View style={styles.menuHandle} />
            <Text style={styles.menuTitle}>Agregar</Text>

            <View style={styles.menuGrid}>
              {quickActions.map(action => (
                <Pressable
                  key={action.route}
                  style={({pressed}) => [
                    styles.menuItem,
                    pressed && styles.menuItemPressed,
                  ]}
                  onPress={() => handleAction(action.route, action.params)}>
                  <View
                    style={[
                      styles.menuItemIcon,
                      {backgroundColor: `${action.color}15`},
                    ]}>
                    <Icon name={action.icon} size={26} color={action.color} />
                  </View>
                  <Text style={styles.menuItemLabel}>{action.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

export function MainTabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: [
            styles.tabBar,
            {height: 70 + insets.bottom, paddingBottom: 12 + insets.bottom},
          ],
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: styles.tabBarLabel,
        }}>
        <Tab.Screen
          name="Inicio"
          component={HomeScreen}
          options={{
            tabBarIcon: ({color, size}) => (
              <Icon name="home" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Modulos"
          component={ModulesScreen}
          options={{
            tabBarLabel: 'Módulos',
            tabBarIcon: ({color, size}) => (
              <Icon name="grid-view" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Perfil"
          component={ProfileScreen}
          options={{
            tabBarIcon: ({color, size}) => (
              <Icon name="person" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Mas"
          component={SettingsScreen}
          options={{
            tabBarLabel: 'Más',
            tabBarIcon: ({color, size}) => (
              <Icon name="settings" size={size} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
      <FABButton />
    </>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.navBarDark,
    borderTopWidth: 1,
    borderTopColor: colors.borderGoldLight,
    paddingTop: 8,
    elevation: 0,
  },
  tabBarLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  fabWrapper: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 100,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.backgroundDark,
    elevation: 8,
    shadowColor: colors.primaryGlow,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 1,
    shadowRadius: 20,
  },
  fabPressed: {
    transform: [{scale: 0.9}],
  },

  // Quick-add menu
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    backgroundColor: colors.surfaceDark,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40, // base; insets.bottom added inline
    borderTopWidth: 1,
    borderColor: colors.borderGold,
  },
  menuHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textMuted,
    alignSelf: 'center',
    marginBottom: 20,
    opacity: 0.4,
  },
  menuTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: 20,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  menuItem: {
    width: '47%',
    backgroundColor: colors.cardDark,
    borderRadius: borderRadius.lg,
    padding: 20,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  menuItemPressed: {
    borderColor: colors.borderGold,
  },
  menuItemIcon: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    color: colors.textPrimary,
    textAlign: 'center',
  },
});
