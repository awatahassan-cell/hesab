import React from 'react';
import { View, Text, StyleSheet, Modal, Image, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme';

interface ReceiptViewerProps {
  uri: string | null;
  onClose: () => void;
}

/**
 * A saved receipt, full screen.
 *
 * The list has always shown a badge when a transaction carries a photo, but
 * there was no way to open it — the picture went in and never came out.
 */
export const ReceiptViewer: React.FC<ReceiptViewerProps> = ({ uri, onClose }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width, height } = Dimensions.get('window');

  return (
    <Modal visible={!!uri} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.dismissArea} activeOpacity={1} onPress={onClose} />

        <View style={styles.header}>
          <Text style={styles.title}>{t('transactions.view_receipt')}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={14} accessibilityLabel={t('common.close')}>
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {uri && (
          <Image
            source={{ uri }}
            style={{ width: width - 32, height: height * 0.7 }}
            resizeMode="contain"
            accessibilityLabel={t('transactions.receipt_attached')}
          />
        )}

        <TouchableOpacity
          onPress={onClose}
          style={[styles.closeBtn, { backgroundColor: colors.accent }]}
          activeOpacity={0.85}
        >
          <Text style={styles.closeTxt}>{t('common.close')}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16
  },
  dismissArea: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  header: {
    position: 'absolute',
    top: 48,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  title: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  closeBtn: {
    position: 'absolute',
    bottom: 44,
    paddingHorizontal: 34,
    paddingVertical: 12,
    borderRadius: 22
  },
  closeTxt: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 }
});
