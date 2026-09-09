import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  Easing,
  TextInput,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme';
import { elevation } from '../../theme/spacing';
import { Icon, IconName } from '../icons/Icon';
import {
  FONT_FAMILY,
  FONT_FAMILY_SEMIBOLD,
  FONT_FAMILY_BOLD
} from '../../theme/typography';

export type DialogButtonStyle = 'default' | 'cancel' | 'destructive';

export interface DialogButton {
  text?: string;
  onPress?: () => void;
  style?: DialogButtonStyle;
}

export interface DialogOptions {
  title: string;
  message?: string;
  buttons?: DialogButton[];
  icon?: IconName;
  /** Tints the icon and the primary button. */
  tone?: 'info' | 'danger' | 'success';
  /** Turns the dialog into a prompt with a single input. */
  input?: {
    placeholder?: string;
    initialValue?: string;
    numeric?: boolean;
    submitText?: string;
    cancelText?: string;
    onSubmit: (value: string) => void;
  };
}

type Listener = (o: DialogOptions | null) => void;
let listener: Listener | null = null;

/**
 * Drop-in replacement for React Native's `Alert.alert`.
 *
 * Same call signature, but rendered by the app rather than the OS, so it
 * follows the theme instead of appearing as a white system box on a dark
 * screen. Callable from outside React, like Alert, so call sites only need
 * their import swapped.
 */
export const AppDialog = {
  alert(
    title: string,
    message?: string,
    buttons?: DialogButton[],
    extras?: { icon?: IconName; tone?: DialogOptions['tone'] }
  ) {
    listener?.({ title, message, buttons, ...extras });
  },
  /** Convenience for the very common destructive confirm. */
  confirmDelete(
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText?: string,
    cancelText?: string
  ) {
    listener?.({
      title,
      message,
      tone: 'danger',
      buttons: [
        { text: cancelText, style: 'cancel' },
        { text: confirmText, style: 'destructive', onPress: onConfirm }
      ]
    });
  },
  /**
   * Themed replacement for `Alert.prompt`, which exists only on iOS — on
   * Android it is undefined, so call sites had to guess a value instead of
   * asking.
   */
  prompt(
    title: string,
    message: string | undefined,
    onSubmit: (value: string) => void,
    opts?: {
      placeholder?: string;
      initialValue?: string;
      numeric?: boolean;
      submitText?: string;
      cancelText?: string;
      icon?: IconName;
    }
  ) {
    listener?.({
      title,
      message,
      icon: opts?.icon,
      input: {
        placeholder: opts?.placeholder,
        initialValue: opts?.initialValue,
        numeric: opts?.numeric,
        submitText: opts?.submitText,
        cancelText: opts?.cancelText,
        onSubmit
      }
    });
  },
  dismiss() {
    listener?.(null);
  }
};

/**
 * Mount once, inside ThemeProvider. Everything AppDialog shows renders here.
 */
export const DialogHost: React.FC = () => {
  const { colors, radius } = useTheme();
  const { t } = useTranslation();
  const [opts, setOpts] = useState<DialogOptions | null>(null);
  const [value, setValue] = useState('');

  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    listener = setOpts;
    return () => {
      listener = null;
    };
  }, []);

  useEffect(() => {
    if (!opts) return;
    setValue(opts.input?.initialValue ?? '');
    pop.setValue(0);
    Animated.timing(pop, {
      toValue: 1,
      duration: 240,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      useNativeDriver: true
    }).start();
  }, [opts, pop]);

  if (!opts) return null;

  const tone = opts.tone ?? 'info';
  const toneColor =
    tone === 'danger' ? colors.danger : tone === 'success' ? colors.success : colors.accent;
  const toneMuted =
    tone === 'danger'
      ? colors.expenseMuted
      : tone === 'success'
      ? colors.incomeMuted
      : colors.accentMuted;

  const iconName: IconName =
    opts.icon ?? (tone === 'danger' ? 'bell' : tone === 'success' ? 'target' : 'wallet');

  const input = opts.input;

  // A prompt supplies its own cancel/submit pair; otherwise Alert's default
  // when no buttons are given is a single dismiss action.
  const buttons: DialogButton[] = opts.buttons?.length
    ? opts.buttons
    : input
    ? [
        { text: input.cancelText, style: 'cancel' },
        {
          text: input.submitText ?? t('common.save'),
          onPress: () => input.onSubmit(value)
        }
      ]
    : [{ text: t('common.done') }];

  const close = () => setOpts(null);

  const press = (b: DialogButton) => {
    close();
    // Let the modal finish dismissing before the handler opens another one.
    setTimeout(() => b.onPress?.(), 0);
  };

  const labelFor = (b: DialogButton) => {
    if (b.text) return b.text;
    if (b.style === 'cancel') return t('common.cancel');
    if (b.style === 'destructive') return t('common.delete');
    return t('common.done');
  };

  // Two short actions sit side by side; three or more stack so nothing clips.
  const stacked = buttons.length > 2;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={close} statusBarTranslucent>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <Pressable style={styles.scrim} onPress={close}>
        <Animated.View
          style={{
            width: '100%',
            maxWidth: 380,
            opacity: pop,
            transform: [
              { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }
            ]
          }}
        >
          {/* Swallows taps so pressing the card does not dismiss it. */}
          <Pressable
            onPress={() => {}}
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.glassEdge,
                borderRadius: radius.xl,
                ...elevation.lg(colors.shadowColor)
              }
            ]}
          >
            <View style={[styles.iconWrap, { backgroundColor: toneMuted, borderRadius: radius.round }]}>
              <Icon name={iconName} size={24} color={toneColor} />
            </View>

            <Text style={[styles.title, { color: colors.textPrimary }]}>{opts.title}</Text>

            {!!opts.message && (
              <Text style={[styles.message, { color: colors.textSecondary }]}>{opts.message}</Text>
            )}

            {!!input && (
              <TextInput
                value={value}
                onChangeText={setValue}
                placeholder={input.placeholder}
                placeholderTextColor={colors.textMuted}
                keyboardType={input.numeric ? 'number-pad' : 'default'}
                autoFocus
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.cardBorder,
                    borderRadius: radius.md,
                    color: colors.textPrimary
                  }
                ]}
              />
            )}

            <View
              style={[
                styles.actions,
                stacked ? styles.actionsStacked : styles.actionsRow
              ]}
            >
              {buttons.map((b, i) => {
                const destructive = b.style === 'destructive';
                const cancel = b.style === 'cancel';
                const bg = destructive
                  ? colors.danger
                  : cancel
                  ? colors.surfaceSecondary
                  : colors.accent;
                const fg = cancel ? colors.textPrimary : '#FFFFFF';

                return (
                  <Pressable
                    key={`${b.text ?? b.style ?? 'btn'}-${i}`}
                    onPress={() => press(b)}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.btn,
                      stacked ? styles.btnFull : styles.btnFlex,
                      {
                        backgroundColor: bg,
                        borderRadius: radius.md,
                        borderColor: cancel ? colors.cardBorder : 'transparent',
                        borderWidth: cancel ? 1 : 0,
                        opacity: pressed ? 0.82 : 1
                      }
                    ]}
                  >
                    <Text style={[styles.btnText, { color: fg }]} numberOfLines={1}>
                      {labelFor(b)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  input: {
    alignSelf: 'stretch',
    borderWidth: 1,
    marginTop: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: FONT_FAMILY_SEMIBOLD,
    fontSize: 17,
    textAlign: 'center'
  },
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(9, 6, 24, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24
  },
  card: {
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 18,
    alignItems: 'center'
  },
  iconWrap: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  title: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center'
  },
  message: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 9
  },
  actions: { alignSelf: 'stretch', marginTop: 22 },
  actionsRow: { flexDirection: 'row', gap: 9 },
  actionsStacked: { flexDirection: 'column', gap: 8 },
  btn: {
    paddingVertical: 13,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnFlex: { flex: 1 },
  btnFull: { alignSelf: 'stretch' },
  btnText: {
    fontFamily: FONT_FAMILY_SEMIBOLD,
    fontSize: 14.5,
    fontWeight: '600'
  }
});
