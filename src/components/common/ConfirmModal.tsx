import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme';
import { useAppStore } from '../../store/useAppStore';
import { FONT_FAMILY, FONT_FAMILY_MEDIUM, FONT_FAMILY_BOLD } from '../../theme/typography';

export interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  visible,
  title,
  message,
  confirmText,
  cancelText,
  isDanger = true,
  icon,
  onConfirm,
  onCancel
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const isRTL = useAppStore((state) => state.isRTL);

  const defaultIcon: keyof typeof Ionicons.glyphMap = isDanger ? 'trash-outline' : 'help-circle-outline';
  const iconName = icon || defaultIcon;
  const iconColor = isDanger ? colors.danger : colors.accent;
  const iconBg = isDanger ? colors.expenseMuted : colors.accentMuted;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: isDanger ? colors.danger + '33' : colors.cardBorder,
            }
          ]}
        >
          {/* Top Badge Icon */}
          <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
            <Ionicons name={iconName} size={28} color={iconColor} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {title}
          </Text>

          {/* Description / Message */}
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            {message}
          </Text>

          {/* Action Buttons */}
          <View style={[styles.buttonRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onCancel}
              style={[
                styles.btn,
                styles.cancelBtn,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.cardBorder,
                }
              ]}
            >
              <Text style={[styles.cancelBtnText, { color: colors.textPrimary }]}>
                {cancelText || t('common.cancel', t('common.cancel'))}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onConfirm}
              style={[
                styles.btn,
                styles.confirmBtn,
                {
                  backgroundColor: isDanger ? colors.danger : colors.accent,
                  shadowColor: isDanger ? colors.danger : colors.accent
                }
              ]}
            >
              <Text style={styles.confirmBtnText}>
                {confirmText || (isDanger ? t('common.delete', t('common.reset')) : t('common.confirm', t('common.confirm')))}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 6,
  },
  buttonRow: {
    width: '100%',
    gap: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    borderWidth: 1,
  },
  cancelBtnText: {
    fontFamily: FONT_FAMILY_MEDIUM,
    fontSize: 14,
    fontWeight: '600',
  },
  confirmBtn: {
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  confirmBtnText: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
