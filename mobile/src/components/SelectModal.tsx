import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../theme';

export interface SelectOption {
  id: string;
  label: string;
  subtitle?: string;
  badge?: string;
}

interface SelectModalProps {
  title: string;
  placeholder: string;
  options: SelectOption[];
  selectedIds: string[];
  multiSelect?: boolean;
  onChange: (ids: string[]) => void;
  emptyMessage?: string;
}

export function SelectDropdown({
  title,
  placeholder,
  options,
  selectedIds,
  multiSelect = false,
  onChange,
  emptyMessage = 'Nenhuma opção disponível.',
}: SelectModalProps) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  const selectedLabels = options
    .filter((o) => selectedIds.includes(o.id))
    .map((o) => o.label);

  const summaryText =
    selectedLabels.length === 0
      ? placeholder
      : multiSelect
      ? selectedLabels.length === 1
        ? selectedLabels[0]
        : `${selectedLabels.length} selecionado(s)`
      : selectedLabels[0];

  function handleSelect(id: string) {
    if (!multiSelect) {
      onChange([id]);
      setOpen(false);
      return;
    }

    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((item) => item !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.78}
        style={[
          styles.trigger,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
        onPress={() => setOpen(true)}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.triggerLabel, { color: colors.textMuted }]}>
            {title}
          </Text>
          <Text
            style={[styles.triggerValue, { color: colors.text }]}
            numberOfLines={1}
          >
            {summaryText}
          </Text>
        </View>
        <Text style={[styles.chevron, { color: colors.primary }]}>▾</Text>
      </TouchableOpacity>

      <Modal visible={open} animationType="fade" transparent>
        <View style={styles.overlay}>
          <View
            style={[
              styles.sheet,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View
              style={[styles.sheetHeader, { borderBottomColor: colors.border }]}
            >
              <Text style={[styles.sheetTitle, { color: colors.text }]}>
                {title}
              </Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Text style={[styles.closeIcon, { color: colors.textMuted }]}>
                  ✕
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.list}>
              {options.length === 0 ? (
                <Text style={[styles.empty, { color: colors.textMuted }]}>
                  {emptyMessage}
                </Text>
              ) : (
                options.map((opt) => {
                  const active = selectedIds.includes(opt.id);
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      activeOpacity={0.75}
                      style={[
                        styles.row,
                        {
                          borderBottomColor: colors.border,
                          backgroundColor: active
                            ? colors.primarySoft
                            : 'transparent',
                        },
                      ]}
                      onPress={() => handleSelect(opt.id)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.rowLabel,
                            {
                              color: active ? colors.primaryDark : colors.text,
                              fontWeight: active ? '800' : '600',
                            },
                          ]}
                        >
                          {opt.label}
                        </Text>
                        {opt.subtitle ? (
                          <Text
                            style={[
                              styles.rowSub,
                              { color: colors.textMuted },
                            ]}
                          >
                            {opt.subtitle}
                          </Text>
                        ) : null}
                      </View>
                      {opt.badge ? (
                        <Text
                          style={[styles.badge, { color: colors.save }]}
                        >
                          {opt.badge}
                        </Text>
                      ) : (
                        <Text style={{ fontSize: 16 }}>
                          {active ? (multiSelect ? '☑️' : '●') : multiSelect ? '⬜' : '○'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            {multiSelect ? (
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: colors.save }]}
                onPress={() => setOpen(false)}
              >
                <Text style={styles.confirmText}>
                  ✅ Confirmar ({selectedIds.length})
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
  },
  triggerLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  triggerValue: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 1,
  },
  chevron: {
    fontSize: 18,
    fontWeight: '800',
    marginLeft: 8,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(9, 9, 11, 0.72)',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  sheet: {
    borderRadius: 16,
    borderWidth: 1,
    maxHeight: '75%',
    overflow: 'hidden',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  closeIcon: {
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  list: {
    maxHeight: 360,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    gap: 10,
  },
  rowLabel: {
    fontSize: 14,
  },
  rowSub: {
    fontSize: 11,
    marginTop: 2,
  },
  badge: {
    fontSize: 12,
    fontWeight: '800',
  },
  empty: {
    padding: 24,
    textAlign: 'center',
    fontSize: 13,
  },
  confirmBtn: {
    margin: 14,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
});
