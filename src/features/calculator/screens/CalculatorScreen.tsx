import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Dimensions,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {colors, fontFamily, borderRadius} from '../../../core/theme';
import {Icon} from '../../../core/components';
import {getDatabase} from '../../../core/database';
import type {RootStackParamList} from '../../../app/navigation/types';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const BUTTON_GAP = 10;
const BUTTON_PADDING = 16;
const BUTTON_SIZE = (SCREEN_WIDTH - BUTTON_PADDING * 2 - BUTTON_GAP * 3) / 4;

type ButtonType = 'number' | 'operator' | 'action' | 'equals';

interface CalcButton {
  label: string;
  type: ButtonType;
  span?: number;
}

const BUTTONS: CalcButton[][] = [
  [
    {label: 'C', type: 'action'},
    {label: '⌫', type: 'action'},
    {label: '%', type: 'operator'},
    {label: '÷', type: 'operator'},
  ],
  [
    {label: '7', type: 'number'},
    {label: '8', type: 'number'},
    {label: '9', type: 'number'},
    {label: '×', type: 'operator'},
  ],
  [
    {label: '4', type: 'number'},
    {label: '5', type: 'number'},
    {label: '6', type: 'number'},
    {label: '−', type: 'operator'},
  ],
  [
    {label: '1', type: 'number'},
    {label: '2', type: 'number'},
    {label: '3', type: 'number'},
    {label: '+', type: 'operator'},
  ],
  [
    {label: '0', type: 'number', span: 2},
    {label: '.', type: 'number'},
    {label: '=', type: 'equals'},
  ],
];

function formatDisplay(value: string): string {
  if (!value || value === '' || value === '-') return value || '0';

  const parts = value.split('.');
  const intPart = parts[0];
  const decPart = parts.length > 1 ? '.' + parts[1] : '';

  const isNeg = intPart.startsWith('-');
  const absInt = isNeg ? intPart.slice(1) : intPart;
  const formatted = absInt.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return (isNeg ? '-' : '') + formatted + decPart;
}

export function CalculatorScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');
  const [currentInput, setCurrentInput] = useState('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [justEvaluated, setJustEvaluated] = useState(false);
  const [secretCode, setSecretCode] = useState('1234');

  useEffect(() => {
    const loadSecretCode = async () => {
      const db = getDatabase();
      const result = await db.execute(
        "SELECT value FROM app_settings WHERE key = 'gallery_secret_code'",
      );
      if (result.rows.length > 0) {
        setSecretCode(result.rows[0].value as string);
      }
    };
    loadSecretCode();
  }, []);

  const evaluate = (a: number, op: string, b: number): number => {
    switch (op) {
      case '+':
        return a + b;
      case '−':
        return a - b;
      case '×':
        return a * b;
      case '÷':
        return b !== 0 ? a / b : 0;
      case '%':
        return a * (b / 100);
      default:
        return b;
    }
  };

  const handleNumber = (num: string) => {
    if (justEvaluated) {
      setCurrentInput(num === '.' ? '0.' : num);
      setDisplay(num === '.' ? '0.' : num);
      setExpression('');
      setPreviousValue(null);
      setOperator(null);
      setJustEvaluated(false);
      return;
    }

    let newInput: string;
    if (currentInput === '0' && num !== '.') {
      newInput = num;
    } else if (num === '.' && currentInput.includes('.')) {
      return;
    } else {
      newInput = currentInput + num;
    }

    setCurrentInput(newInput);
    setDisplay(newInput);
  };

  const handleOperator = (op: string) => {
    setJustEvaluated(false);

    const current = parseFloat(currentInput);
    if (isNaN(current) && previousValue === null) return;

    if (previousValue !== null && operator && currentInput !== '0' && !justEvaluated) {
      const result = evaluate(previousValue, operator, current);
      setPreviousValue(result);
      setExpression(`${formatDisplay(result.toString())} ${op}`);
      setDisplay(result.toString());
      setCurrentInput('0');
    } else {
      const val = previousValue !== null && justEvaluated ? previousValue : current;
      setPreviousValue(val);
      setExpression(`${formatDisplay(val.toString())} ${op}`);
      setCurrentInput('0');
    }

    setOperator(op);
  };

  const handleEquals = () => {
    if (previousValue === null || !operator) return;

    const current = parseFloat(currentInput);
    if (isNaN(current)) return;

    const result = evaluate(previousValue, operator, current);

    // Clean result: avoid floating point artifacts
    const cleanResult = parseFloat(result.toFixed(10));
    const resultStr = cleanResult.toString();

    // Check secret code
    if (resultStr === secretCode) {
      // Reset calculator state before navigating
      setDisplay('0');
      setExpression('');
      setCurrentInput('0');
      setPreviousValue(null);
      setOperator(null);
      setJustEvaluated(false);
      navigation.navigate('Gallery');
      return;
    }

    setExpression(
      `${formatDisplay(previousValue.toString())} ${operator} ${formatDisplay(currentInput)}`,
    );
    setDisplay(resultStr);
    setPreviousValue(cleanResult);
    setCurrentInput(resultStr);
    setOperator(null);
    setJustEvaluated(true);
  };

  const handleClear = () => {
    setDisplay('0');
    setExpression('');
    setCurrentInput('0');
    setPreviousValue(null);
    setOperator(null);
    setJustEvaluated(false);
  };

  const handleBackspace = () => {
    if (justEvaluated) {
      handleClear();
      return;
    }

    if (currentInput.length <= 1 || currentInput === '0') {
      setCurrentInput('0');
      setDisplay('0');
    } else {
      const newInput = currentInput.slice(0, -1);
      setCurrentInput(newInput);
      setDisplay(newInput);
    }
  };

  const handlePress = (btn: CalcButton) => {
    switch (btn.label) {
      case 'C':
        handleClear();
        break;
      case '⌫':
        handleBackspace();
        break;
      case '=':
        handleEquals();
        break;
      case '+':
      case '−':
      case '×':
      case '÷':
      case '%':
        handleOperator(btn.label);
        break;
      default:
        handleNumber(btn.label);
    }
  };

  const getButtonStyle = (btn: CalcButton) => {
    switch (btn.type) {
      case 'operator':
        return styles.btnOperator;
      case 'equals':
        return styles.btnEquals;
      case 'action':
        return styles.btnAction;
      default:
        return styles.btnNumber;
    }
  };

  const getTextStyle = (btn: CalcButton) => {
    switch (btn.type) {
      case 'operator':
        return styles.btnTextOperator;
      case 'equals':
        return styles.btnTextEquals;
      case 'action':
        return styles.btnTextAction;
      default:
        return styles.btnTextNumber;
    }
  };

  return (
    <View style={[styles.container, {paddingTop: insets.top}]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Icon name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Calculadora</Text>
        <View style={styles.headerBtn}>
          <Icon name="more-vert" size={22} color={colors.textSecondary} />
        </View>
      </View>

      {/* Display */}
      <View style={styles.display}>
        <Text style={styles.expressionText} numberOfLines={1}>
          {expression}
        </Text>
        <Text
          style={styles.displayText}
          numberOfLines={1}
          adjustsFontSizeToFit>
          {formatDisplay(display)}
        </Text>
      </View>

      {/* Keypad */}
      <View style={[styles.keypad, {paddingBottom: 16 + insets.bottom}]}>
        {BUTTONS.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map(btn => (
              <Pressable
                key={btn.label}
                onPress={() => handlePress(btn)}
                style={({pressed}) => [
                  styles.btn,
                  getButtonStyle(btn),
                  btn.span === 2 && styles.btnDouble,
                  pressed && styles.btnPressed,
                ]}>
                <Text style={[styles.btnText, getTextStyle(btn)]}>
                  {btn.label}
                </Text>
              </Pressable>
            ))}
          </View>
        ))}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 18,
    color: colors.textPrimary,
  },
  display: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  expressionText: {
    fontFamily: fontFamily.regular,
    fontSize: 20,
    color: colors.textSecondary,
    textAlign: 'right',
    marginBottom: 8,
  },
  displayText: {
    fontFamily: fontFamily.bold,
    fontSize: 56,
    color: colors.textPrimary,
    textAlign: 'right',
  },
  keypad: {
    paddingHorizontal: BUTTON_PADDING,
    gap: BUTTON_GAP,
  },
  row: {
    flexDirection: 'row',
    gap: BUTTON_GAP,
  },
  btn: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE * 0.7,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnNumber: {
    backgroundColor: colors.surfaceDark,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  btnOperator: {
    backgroundColor: 'rgba(26, 24, 18, 0.8)',
    borderWidth: 1,
    borderColor: colors.borderGold,
  },
  btnEquals: {
    backgroundColor: colors.primary,
  },
  btnAction: {
    backgroundColor: colors.surfaceDark,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  btnDouble: {
    width: BUTTON_SIZE * 2 + BUTTON_GAP,
  },
  btnPressed: {
    opacity: 0.7,
    transform: [{scale: 0.96}],
  },
  btnText: {
    fontSize: 24,
    fontFamily: fontFamily.semiBold,
  },
  btnTextNumber: {
    color: colors.textPrimary,
  },
  btnTextOperator: {
    color: colors.primary,
  },
  btnTextEquals: {
    color: colors.backgroundDark,
    fontFamily: fontFamily.bold,
  },
  btnTextAction: {
    color: colors.primary,
  },
});
