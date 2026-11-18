import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { tokens } from "../theme/tokens.js";

const { color, space, radius } = tokens;

function PageButton({ label, icon, iconAfter = false, disabled, onPress }) {
  const iconColor = disabled ? color.text3 : color.onPrimary;
  const iconEl = <Ionicons name={icon} size={16} color={iconColor} />;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      {!iconAfter ? iconEl : null}
      <Text style={[styles.buttonText, disabled && styles.buttonTextDisabled]}>
        {label}
      </Text>
      {iconAfter ? iconEl : null}
    </Pressable>
  );
}

export function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPrev,
  onNext,
}) {
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <View style={styles.wrap}>
      <View style={styles.info}>
        <Text style={styles.pageText}>
          Halaman {page} dari {totalPages}
        </Text>
        <Text style={styles.rangeText}>
          Menampilkan {start}–{end} dari {totalItems} data
        </Text>
      </View>
      <View style={styles.buttons}>
        <PageButton
          label="Sebelumnya"
          icon="chevron-back"
          disabled={page <= 1}
          onPress={onPrev}
        />
        <PageButton
          label="Berikutnya"
          icon="chevron-forward"
          iconAfter
          disabled={page >= totalPages}
          onPress={onNext}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: space.md,
  },
  info: {
    alignItems: "center",
    gap: 2,
  },
  pageText: {
    fontSize: 14,
    fontWeight: "600",
    color: color.text,
    fontVariant: ["tabular-nums"],
  },
  rangeText: {
    fontSize: 12,
    color: color.text3,
    fontVariant: ["tabular-nums"],
  },
  buttons: {
    flexDirection: "row",
    gap: space.md,
  },
  button: {
    flex: 1,
    minHeight: tokens.hit,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: color.primary,
    borderRadius: radius.cta,
    borderCurve: "continuous",
    paddingHorizontal: space.lg,
  },
  buttonDisabled: {
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.border,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
    color: color.onPrimary,
  },
  buttonTextDisabled: {
    color: color.text3,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
});
