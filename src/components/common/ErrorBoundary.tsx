import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { lightColors, darkColors } from '../../theme/colors';
import { Appearance } from 'react-native';
import i18n from '../../i18n';

interface Props {
  children: React.ReactNode;
  /** Hook for a crash reporter once one is wired up. */
  onError?: (error: Error, info: React.ErrorInfo) => void;
}

interface State {
  error: Error | null;
  info: React.ErrorInfo | null;
}

/**
 * Catches a render crash and shows something a person can act on.
 *
 * Without this, a thrown error in any screen unmounts the whole tree and the
 * app is a blank screen with no way back. Here the person gets an explanation,
 * a reassurance that their data is on the device and untouched, and a button
 * that remounts the tree — which recovers from anything transient.
 *
 * It reads the colour scheme directly: a crash inside ThemeProvider means the
 * theme context is exactly what is not available.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ info });
    // Kept as a console call until a reporter is configured; a crash that is
    // never recorded is a crash that never gets fixed.
    console.error('[hesab] render crash', error, info.componentStack);
    this.props.onError?.(error, info);
  }

  reset = () => this.setState({ error: null, info: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const colors = Appearance.getColorScheme() === 'dark' ? darkColors : lightColors;

    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.cardBorder }
          ]}
        >
          <Text style={[styles.emoji]}>⚠️</Text>
          {/*
            Translated through the i18n instance directly rather than a hook:
            this screen has to render when the tree below it has already
            failed. Every string carries its English text as the default, so
            it still reads correctly if the bundles never loaded.
          */}
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {i18n.t('errors.title', { defaultValue: 'Something went wrong' })}
          </Text>

          <Text style={[styles.body, { color: colors.textSecondary }]}>
            {i18n.t('errors.data_safe', {
              defaultValue: 'Your data is on this device and untouched.'
            })}
          </Text>

          <Pressable
            onPress={this.reset}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 }
            ]}
          >
            <Text style={styles.buttonText}>
              {i18n.t('errors.try_again', { defaultValue: 'Try again' })}
            </Text>
          </Pressable>

          {__DEV__ && (
            <ScrollView style={styles.details}>
              <Text style={[styles.detailsText, { color: colors.textMuted }]}>
                {error.message}
                {'\n\n'}
                {this.state.info?.componentStack}
              </Text>
            </ScrollView>
          )}
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center'
  },
  emoji: { fontSize: 40, marginBottom: 12 },
  title: { fontSize: 19, fontWeight: '700', textAlign: 'center', lineHeight: 30 },
  body: { fontSize: 14, lineHeight: 24, textAlign: 'center', marginTop: 14 },
  button: {
    marginTop: 22,
    alignSelf: 'stretch',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center'
  },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  details: { maxHeight: 180, marginTop: 18, alignSelf: 'stretch' },
  detailsText: { fontSize: 11, lineHeight: 16 }
});
