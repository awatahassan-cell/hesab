import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { useAppStore } from '../store/useAppStore';
import { useFinanceStore } from '../store/useFinanceStore';
import { buildRows, detectColumns, parseCsv, ColumnMapping, ParsedRow, RowError } from '../utils/csvImport';
import { importRows, pickCsvFile } from '../services/csvImportService';
import { formatCurrency } from '../utils/currency';
import { formatLocalDate } from '../utils/dates';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { AuroraBackground } from '../components/common/AuroraBackground';
import { AppDialog } from '../components/common/AppDialog';

/** How many parsed rows to show before importing. */
const PREVIEW_LIMIT = 6;

/**
 * Bringing a CSV in from another app.
 *
 * The file is parsed and shown before anything is written, because an import
 * that turns out wrong is far more work to undo than to check first.
 */
export const ImportScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { colors, typography, radius } = useTheme();
  const { t, i18n } = useTranslation();
  const isRTL = useAppStore((state) => state.isRTL);
  const primaryCurrency = useAppStore((state) => state.primaryCurrency);
  const { accounts, refreshAll } = useFinanceStore();

  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [dayFirst, setDayFirst] = useState(true);
  const [accountId, setAccountId] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const parsed = useMemo<{ rows: ParsedRow[]; errors: RowError[] }>(() => {
    if (!mapping) return { rows: [], errors: [] };
    return buildRows(dataRows, mapping, { dayFirst });
  }, [dataRows, mapping, dayFirst]);

  const handlePick = async () => {
    try {
      const file = await pickCsvFile();
      if (!file) return;

      const table = parseCsv(file.content);
      if (table.length < 2) {
        AppDialog.alert(t('common.error'), t('import.empty_file'));
        return;
      }

      const detected = detectColumns(table[0]);
      if (!detected) {
        AppDialog.alert(t('common.error'), t('import.no_columns'));
        return;
      }

      setFileName(file.name);
      setHeaders(table[0]);
      setDataRows(table.slice(1));
      setMapping(detected);
      setAccountId((current) => current || accounts[0]?.id || '');
    } catch (error) {
      AppDialog.alert(t('common.error'), t('settings.file_unreadable'));
    }
  };

  const handleImport = () => {
    if (!parsed.rows.length || !accountId) return;

    AppDialog.alert(
      t('import.confirm_title'),
      t('import.confirm_body', { count: parsed.rows.length }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.continue'),
          onPress: async () => {
            setBusy(true);
            try {
              const outcome = await importRows(parsed.rows, {
                accountId,
                currency: primaryCurrency,
                translate: (key) => t(key, { defaultValue: key })
              });
              await refreshAll();
              AppDialog.alert(
                t('import.done'),
                t('import.done_body', { count: outcome.imported }),
                undefined,
                { tone: 'success', icon: 'wallet' }
              );
              navigation?.goBack();
            } finally {
              setBusy(false);
            }
          }
        }
      ]
    );
  };

  const align = { textAlign: isRTL ? 'right' : 'left' } as const;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <AuroraBackground />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 12 }, align]}>
          {t('import.intro')}
        </Text>

        <Button
          title={fileName ? t('import.choose_another') : t('import.choose_file')}
          onPress={handlePick}
          variant={fileName ? 'secondary' : 'primary'}
        />

        {fileName && mapping && (
          <>
            <Card style={{ backgroundColor: colors.surface, marginTop: 14 }}>
              <Text style={[typography.bodySemibold, { color: colors.textPrimary }, align]}>{fileName}</Text>
              <Text style={[typography.captionSmall, { color: colors.textMuted, marginTop: 4 }, align]}>
                {t('import.found', { rows: parsed.rows.length, skipped: parsed.errors.length })}
              </Text>

              <View style={[styles.mapRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {(['date', 'amount', 'type', 'category', 'note'] as const).map((key) => {
                  const at = mapping[key];
                  if (at === undefined) return null;
                  return (
                    <View
                      key={key}
                      style={[styles.mapChip, { backgroundColor: colors.surfaceSecondary, borderRadius: radius.sm }]}
                    >
                      <Text style={{ color: colors.textMuted, fontSize: 10 }}>{t(`import.col_${key}`)}</Text>
                      <Text numberOfLines={1} style={{ color: colors.textPrimary, fontSize: 11, fontWeight: '700' }}>
                        {headers[at] || `#${at + 1}`}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </Card>

            <Card style={{ backgroundColor: colors.surface, marginTop: 10 }}>
              <View style={[styles.switchRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.body, { color: colors.textPrimary }, align]}>
                    {t('import.day_first')}
                  </Text>
                  <Text style={[typography.captionSmall, { color: colors.textMuted }, align]}>
                    {t('import.day_first_hint')}
                  </Text>
                </View>
                <Switch value={dayFirst} onValueChange={setDayFirst} />
              </View>
            </Card>

            <Text style={[typography.captionSmall, { color: colors.textMuted, marginTop: 14, marginBottom: 6 }, align]}>
              {t('import.into_account')}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {accounts.map((account) => {
                const on = accountId === account.id;
                return (
                  <TouchableOpacity
                    key={account.id}
                    onPress={() => setAccountId(account.id)}
                    style={[
                      styles.accountChip,
                      {
                        backgroundColor: on ? colors.accent : colors.surfaceSecondary,
                        borderColor: on ? colors.accent : colors.cardBorder,
                        borderRadius: radius.sm
                      }
                    ]}
                  >
                    <Text style={{ color: on ? colors.textInverse : colors.textPrimary, fontWeight: '600', fontSize: 12 }}>
                      {account.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={[typography.captionSmall, { color: colors.textMuted, marginTop: 16, marginBottom: 6 }, align]}>
              {t('import.preview')}
            </Text>
            {parsed.rows.slice(0, PREVIEW_LIMIT).map((row) => (
              <Card key={row.line} style={{ backgroundColor: colors.surface, marginVertical: 4 }}>
                <View style={[styles.previewRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.caption, { color: colors.textPrimary }, align]}>
                      {row.note || row.category || t(`types.${row.type}`)}
                    </Text>
                    <Text style={[typography.captionSmall, { color: colors.textMuted }, align]}>
                      {formatLocalDate(new Date(row.date), i18n.language)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      typography.tabularNumber,
                      { color: row.type === 'income' ? colors.income : colors.expense }
                    ]}
                  >
                    {row.type === 'income' ? '+' : '-'}
                    {formatCurrency(row.amount, primaryCurrency, { isRTL })}
                  </Text>
                </View>
              </Card>
            ))}

            {parsed.errors.length > 0 && (
              <Card style={{ backgroundColor: colors.surface, marginTop: 10, borderColor: colors.danger + '55' }}>
                <View style={[styles.previewRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
                  <Text style={[typography.captionSmall, { color: colors.textSecondary, flex: 1, marginHorizontal: 8 }, align]}>
                    {t('import.skipped_detail', {
                      count: parsed.errors.length,
                      lines: parsed.errors.slice(0, 5).map((e) => e.line).join(', ')
                    })}
                  </Text>
                </View>
              </Card>
            )}

            <View style={{ marginTop: 18 }}>
              <Button
                title={busy ? t('common.please_wait') : t('import.import_count', { count: parsed.rows.length })}
                onPress={handleImport}
                variant="primary"
                disabled={busy || parsed.rows.length === 0 || !accountId}
              />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  mapRow: { flexWrap: 'wrap', gap: 6, marginTop: 10 },
  mapChip: { paddingHorizontal: 8, paddingVertical: 5, minWidth: 62 },
  switchRow: { alignItems: 'center' },
  accountChip: { paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, marginRight: 8 },
  previewRow: { alignItems: 'center' }
});
