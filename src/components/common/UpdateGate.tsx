import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, AppState } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme';
import { elevation } from '../../theme/spacing';
import { Icon } from '../icons/Icon';
import { FONT_FAMILY, FONT_FAMILY_SEMIBOLD, FONT_FAMILY_BOLD } from '../../theme/typography';
import {
  checkForUpdate,
  openStore,
  skipVersion,
  UpdateStatus
} from '../../services/updateCheck';

/**
 * Tells someone a newer build is in the store.
 *
 * Mount once near the root. It checks on launch and again when the app comes
 * back to the foreground, both throttled inside the service. A check that
 * fails shows nothing at all.
 *
 * A required update (the manifest's `minimumVersion`) cannot be dismissed:
 * no scrim tap, no back button, no "later".
 */
export const UpdateGate: React.FC = () => {
  const { colors, radius } = useTheme();
  const { t, i18n } = useTranslation();
  const [status, setStatus] = useState<UpdateStatus | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const result = await checkForUpdate({ language: i18n.language });
      if (!cancelled && result) setStatus(result);
    };

    run();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [i18n.language]);

  if (!status) return null;

  const dismiss = async () => {
    if (status.required) return;
    await skipVersion(status.latestVersion);
    setStatus(null);
  };

  return (
    <Modal
      transparent
      visible
      animationType="fade"
      statusBarTranslucent
      onRequestClose={dismiss}
    >
      <Pressable
        style={styles.scrim}
        onPress={status.required ? undefined : dismiss}
        accessibilityViewIsModal
      >
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
          <View
            style={[
              styles.iconWrap,
              { backgroundColor: colors.accentMuted, borderRadius: radius.round }
            ]}
          >
            <Icon name="arrowUp" size={26} color={colors.accent} />
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {status.required ? t('update.required_title') : t('update.available_title')}
          </Text>

          <Text style={[styles.message, { color: colors.textSecondary }]}>
            {status.required ? t('update.required_body') : t('update.available_body')}
          </Text>

          <View
            style={[
              styles.versions,
              { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md }
            ]}
          >
            <Text style={[styles.versionText, { color: colors.textMuted }]}>
              {t('update.current')} {status.currentVersion}
            </Text>
            <Text style={[styles.arrow, { color: colors.textMuted }]}>→</Text>
            <Text style={[styles.versionText, { color: colors.accent }]}>
              {status.latestVersion}
            </Text>
          </View>

          {!!status.notes && (
            <Text style={[styles.notes, { color: colors.textSecondary }]}>{status.notes}</Text>
          )}

          <Pressable
            onPress={() => openStore(status)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.ctaWrap, { opacity: pressed ? 0.85 : 1 }]}
          >
            <LinearGradient
              colors={[colors.heroGradient[0], colors.heroGradient[2]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.cta, { borderRadius: radius.md }]}
            >
              <Text style={styles.ctaText}>{t('update.update_now')}</Text>
            </LinearGradient>
          </Pressable>

          {!status.required && (
            <Pressable
              onPress={dismiss}
              accessibilityRole="button"
              style={({ pressed }) => [styles.later, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Text style={[styles.laterText, { color: colors.textMuted }]}>
                {t('update.later')}
              </Text>
            </Pressable>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(9, 6, 24, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 16,
    alignItems: 'center'
  },
  iconWrap: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  title: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: 18.5,
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
  versions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginTop: 16
  },
  versionText: {
    fontFamily: FONT_FAMILY_SEMIBOLD,
    fontSize: 13,
    fontVariant: ['tabular-nums']
  },
  arrow: { fontSize: 13 },
  notes: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 14
  },
  ctaWrap: { alignSelf: 'stretch', marginTop: 20 },
  cta: { paddingVertical: 14, alignItems: 'center' },
  ctaText: {
    fontFamily: FONT_FAMILY_SEMIBOLD,
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  later: { paddingVertical: 14, alignSelf: 'stretch', alignItems: 'center' },
  laterText: { fontFamily: FONT_FAMILY_SEMIBOLD, fontSize: 13.5 }
});
