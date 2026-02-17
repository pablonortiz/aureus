import React, {useState, useCallback, useRef} from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  Switch,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import {colors, typography, fontFamily, borderRadius} from '../../../core/theme';
import {Icon} from '../../../core/components';
import {useSettings} from '../hooks/useSettings';

type ExpandedSection = 'apariencia' | 'datos' | 'acerca' | null;

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const {
    storageStats,
    hasPin,
    notificationsEnabled,
    load,
    toggleNotifications,
    verifyPin,
    changePin,
    removePin,
  } = useSettings();

  const [expanded, setExpanded] = useState<ExpandedSection>(null);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinStep, setPinStep] = useState<'verify' | 'new' | 'confirm'>('verify');
  const [pinDigits, setPinDigits] = useState(['', '', '', '']);
  const [newPinBuffer, setNewPinBuffer] = useState('');
  const pinInputs = useRef<(TextInput | null)[]>([]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const toggleSection = (section: ExpandedSection) => {
    setExpanded(prev => (prev === section ? null : section));
  };

  // --- PIN Modal Logic ---

  const openPinModal = () => {
    if (hasPin) {
      setPinStep('verify');
    } else {
      setPinStep('new');
    }
    setPinDigits(['', '', '', '']);
    setNewPinBuffer('');
    setPinModalVisible(true);
  };

  const closePinModal = () => {
    setPinModalVisible(false);
    setPinDigits(['', '', '', '']);
    setNewPinBuffer('');
  };

  const handlePinChange = async (value: string, index: number) => {
    if (value.length > 1) {
      return;
    }
    const newDigits = [...pinDigits];
    newDigits[index] = value;
    setPinDigits(newDigits);

    if (value && index < 3) {
      pinInputs.current[index + 1]?.focus();
    }

    if (index === 3 && value) {
      const fullPin = newDigits.join('');

      if (pinStep === 'verify') {
        const valid = await verifyPin(fullPin);
        if (valid) {
          Alert.alert(
            'PIN verificado',
            '¿Qué querés hacer?',
            [
              {
                text: 'Cambiar PIN',
                onPress: () => {
                  setPinStep('new');
                  setPinDigits(['', '', '', '']);
                  setTimeout(() => pinInputs.current[0]?.focus(), 100);
                },
              },
              {
                text: 'Eliminar PIN',
                style: 'destructive',
                onPress: async () => {
                  await removePin();
                  closePinModal();
                  Alert.alert('Listo', 'PIN eliminado correctamente.');
                },
              },
              {text: 'Cancelar', style: 'cancel', onPress: closePinModal},
            ],
          );
        } else {
          Alert.alert('PIN incorrecto', 'Intentá de nuevo.');
          setPinDigits(['', '', '', '']);
          setTimeout(() => pinInputs.current[0]?.focus(), 100);
        }
      } else if (pinStep === 'new') {
        setNewPinBuffer(fullPin);
        setPinStep('confirm');
        setPinDigits(['', '', '', '']);
        setTimeout(() => pinInputs.current[0]?.focus(), 100);
      } else if (pinStep === 'confirm') {
        if (fullPin === newPinBuffer) {
          await changePin(fullPin);
          closePinModal();
          Alert.alert('Listo', 'PIN actualizado correctamente.');
        } else {
          Alert.alert('No coinciden', 'Los PINs no coinciden. Empezá de nuevo.');
          setPinStep('new');
          setNewPinBuffer('');
          setPinDigits(['', '', '', '']);
          setTimeout(() => pinInputs.current[0]?.focus(), 100);
        }
      }
    }
  };

  const handlePinKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !pinDigits[index] && index > 0) {
      pinInputs.current[index - 1]?.focus();
      const newDigits = [...pinDigits];
      newDigits[index - 1] = '';
      setPinDigits(newDigits);
    }
  };

  const getPinTitle = () => {
    if (pinStep === 'verify') {
      return 'Ingresá tu PIN actual';
    }
    if (pinStep === 'new') {
      return hasPin ? 'Ingresá el nuevo PIN' : 'Creá un PIN';
    }
    return 'Confirmá el PIN';
  };

  const getPinSubtitle = () => {
    if (pinStep === 'verify') {
      return 'Verificá tu identidad';
    }
    if (pinStep === 'new') {
      return '4 dígitos para proteger la bóveda';
    }
    return 'Repetí los 4 dígitos';
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, {paddingTop: insets.top + 16}]}>
      <Text style={styles.title}>Configuración</Text>

      <View style={styles.list}>
        {/* 1. Apariencia */}
        <Pressable
          style={styles.item}
          onPress={() => toggleSection('apariencia')}>
          <View style={styles.itemIcon}>
            <Icon name="palette" size={22} color={colors.primary} />
          </View>
          <View style={styles.itemInfo}>
            <Text style={styles.itemLabel}>Apariencia</Text>
            <Text style={styles.itemDesc}>Dark mode</Text>
          </View>
          <Icon
            name={expanded === 'apariencia' ? 'expand-less' : 'chevron-right'}
            size={20}
            color={colors.textMuted}
          />
        </Pressable>
        {expanded === 'apariencia' && (
          <View style={styles.expandedContent}>
            <View style={styles.infoRow}>
              <Icon name="dark-mode" size={18} color={colors.primary} />
              <Text style={styles.infoText}>
                Aureus usa exclusivamente modo oscuro para una mejor experiencia
                visual y ahorro de batería.
              </Text>
            </View>
          </View>
        )}

        {/* 2. Notificaciones */}
        <View style={styles.item}>
          <View style={styles.itemIcon}>
            <Icon name="notifications" size={22} color={colors.primary} />
          </View>
          <View style={styles.itemInfo}>
            <Text style={styles.itemLabel}>Notificaciones</Text>
            <Text style={styles.itemDesc}>
              {notificationsEnabled ? 'Activadas' : 'Desactivadas'}
            </Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={toggleNotifications}
            trackColor={{
              false: colors.neutralDark,
              true: 'rgba(232, 186, 48, 0.4)',
            }}
            thumbColor={notificationsEnabled ? colors.primary : colors.textMuted}
          />
        </View>

        {/* 3. Seguridad */}
        <Pressable style={styles.item} onPress={openPinModal}>
          <View style={styles.itemIcon}>
            <Icon name="lock" size={22} color={colors.primary} />
          </View>
          <View style={styles.itemInfo}>
            <Text style={styles.itemLabel}>Seguridad</Text>
            <Text style={styles.itemDesc}>
              {hasPin ? 'PIN configurado' : 'Sin PIN — Configurar'}
            </Text>
          </View>
          <Icon name="chevron-right" size={20} color={colors.textMuted} />
        </Pressable>

        {/* 4. Datos */}
        <Pressable
          style={styles.item}
          onPress={() => toggleSection('datos')}>
          <View style={styles.itemIcon}>
            <Icon name="storage" size={22} color={colors.primary} />
          </View>
          <View style={styles.itemInfo}>
            <Text style={styles.itemLabel}>Datos</Text>
            <Text style={styles.itemDesc}>
              {storageStats
                ? `${storageStats.totalRecords} registros`
                : 'Almacenamiento local'}
            </Text>
          </View>
          <Icon
            name={expanded === 'datos' ? 'expand-less' : 'chevron-right'}
            size={20}
            color={colors.textMuted}
          />
        </Pressable>
        {expanded === 'datos' && storageStats && (
          <View style={styles.expandedContent}>
            <Text style={styles.statsTitle}>ALMACENAMIENTO LOCAL</Text>
            <View style={styles.statsGrid}>
              <StatRow
                icon="content-paste"
                label="Clipboard"
                value={`${storageStats.clipboardLinks} items · ${storageStats.clipboardFolders} carpetas · ${storageStats.clipboardTags} tags`}
              />
              <StatRow
                icon="email"
                label="Gmail"
                value={`${storageStats.gmailAccounts} cuentas · ${storageStats.platforms} plataformas`}
              />
              <StatRow
                icon="check-circle"
                label="Enfoque"
                value={`${storageStats.focusTasks} tareas · ${storageStats.focusSessions} sesiones`}
              />
              <StatRow
                icon="account-balance-wallet"
                label="Finanzas"
                value={`${storageStats.financeTransactions} transacciones · ${storageStats.financeCategories} categorías`}
              />
              <StatRow
                icon="image-search"
                label="Buscador"
                value={`${storageStats.sourceSearches} búsquedas · ${storageStats.sourceResults} resultados`}
              />
              <StatRow
                icon="photo-library"
                label="Galería"
                value={`${storageStats.galleryMedia} archivos · ${storageStats.galleryFolders} carpetas`}
              />
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                {storageStats.totalRecords} registros
              </Text>
            </View>
          </View>
        )}

        {/* 5. Acerca de */}
        <Pressable
          style={styles.item}
          onPress={() => toggleSection('acerca')}>
          <View style={styles.itemIcon}>
            <Icon name="info" size={22} color={colors.primary} />
          </View>
          <View style={styles.itemInfo}>
            <Text style={styles.itemLabel}>Acerca de</Text>
            <Text style={styles.itemDesc}>Aureus v0.1.0</Text>
          </View>
          <Icon
            name={expanded === 'acerca' ? 'expand-less' : 'chevron-right'}
            size={20}
            color={colors.textMuted}
          />
        </Pressable>
        {expanded === 'acerca' && (
          <View style={styles.expandedContent}>
            <View style={styles.aboutHeader}>
              <Text style={styles.aboutAppName}>AUREUS</Text>
              <Text style={styles.aboutVersion}>v0.1.0</Text>
            </View>
            <Text style={styles.aboutDesc}>
              Super app personal modular para Android. Hub central con
              mini-apps que se agregan según necesidad.
            </Text>
            <View style={styles.aboutDetails}>
              <AboutRow label="Plataforma" value="Android" />
              <AboutRow label="Framework" value="React Native" />
              <AboutRow label="Base de datos" value="SQLite (local)" />
              <AboutRow label="Desarrollador" value="Pablo" />
            </View>
          </View>
        )}
      </View>

      <View style={{height: 100}} />

      {/* PIN Modal */}
      <Modal visible={pinModalVisible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Pressable style={styles.closeBtn} onPress={closePinModal}>
              <Icon name="close" size={20} color={colors.textMuted} />
            </Pressable>

            <View style={styles.lockIconWrap}>
              <Icon name="lock" size={32} color={colors.primary} />
            </View>

            <Text style={styles.modalTitle}>{getPinTitle()}</Text>
            <Text style={styles.modalSubtitle}>{getPinSubtitle()}</Text>

            <View style={styles.pinRow}>
              {pinDigits.map((digit, i) => (
                <TextInput
                  key={`${pinStep}-${i}`}
                  ref={ref => {
                    pinInputs.current[i] = ref;
                  }}
                  style={[styles.pinInput, digit ? styles.pinInputFilled : null]}
                  value={digit}
                  onChangeText={v => handlePinChange(v, i)}
                  onKeyPress={e => handlePinKeyPress(e, i)}
                  keyboardType="number-pad"
                  maxLength={1}
                  secureTextEntry
                  autoFocus={i === 0}
                />
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function StatRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.statRow}>
      <Icon name={icon} size={16} color={colors.primary} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function AboutRow({label, value}: {label: string; value: string}) {
  return (
    <View style={styles.aboutRow}>
      <Text style={styles.aboutRowLabel}>{label}</Text>
      <Text style={styles.aboutRowValue}>{value}</Text>
    </View>
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
    marginBottom: 24,
  },
  list: {
    gap: 0,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  itemDesc: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Expanded sections
  expandedContent: {
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.lg,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  // Storage stats
  statsTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    letterSpacing: 2,
    color: 'rgba(232, 186, 48, 0.6)',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  statsGrid: {
    gap: 10,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    color: colors.textPrimary,
    width: 72,
  },
  statValue: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  totalLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  totalValue: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.primary,
  },

  // About
  aboutHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 8,
  },
  aboutAppName: {
    fontFamily: fontFamily.extraBold,
    fontSize: 20,
    color: colors.primary,
    letterSpacing: 2,
  },
  aboutVersion: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  aboutDesc: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  aboutDetails: {
    gap: 8,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  aboutRowLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.textMuted,
  },
  aboutRowValue: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    color: colors.textPrimary,
  },

  // PIN Modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: colors.cardDark,
    borderRadius: borderRadius.xl,
    padding: 32,
    width: '85%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderGold,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  lockIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 32,
  },
  pinRow: {
    flexDirection: 'row',
    gap: 16,
  },
  pinInput: {
    width: 52,
    height: 56,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.borderGold,
    backgroundColor: colors.surfaceDark,
    color: colors.textPrimary,
    fontSize: 24,
    fontFamily: fontFamily.bold,
    textAlign: 'center',
  },
  pinInputFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
});
