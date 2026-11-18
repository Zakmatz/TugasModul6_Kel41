import { ScrollView, StyleSheet, Text, View } from "react-native";
import Constants from "expo-constants";
import Ionicons from "@expo/vector-icons/Ionicons";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import { GROUP_INFO } from "../data/groupInfo.js";
import { MQTT_TOPIC } from "../services/config.js";
import { tokens } from "../theme/tokens.js";

const { color, space, radius, shadow } = tokens;

function initials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={color.text3} />
      <View style={styles.infoTextWrap}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value ?? "-"}</Text>
      </View>
    </View>
  );
}

export function ProfileScreen() {
  const reduceMotion = useReducedMotion();
  const enter = (delay) =>
    reduceMotion ? undefined : FadeInDown.delay(delay).duration(tokens.motion.entering);

  return (
    <ScrollView
      style={styles.safe}
      contentContainerStyle={styles.container}
      contentInsetAdjustmentBehavior="automatic"
    >
      {/* Header kelompok */}
      <Animated.View style={styles.hero} entering={enter(0)}>
        <View style={styles.heroIcon}>
          <Ionicons name="people" size={32} color={color.onPrimary} />
        </View>
        <Text style={styles.heroTitle}>Kelompok {GROUP_INFO.groupNumber}</Text>
        <Text style={styles.heroSub}>{GROUP_INFO.tagline}</Text>
      </Animated.View>

      {/* Informasi umum */}
      <Animated.View style={styles.card} entering={enter(80)}>
        <Text style={styles.sectionTitle}>Informasi Praktikum</Text>
        <InfoRow icon="school-outline" label="Mata kuliah" value={GROUP_INFO.course} />
        <InfoRow icon="book-outline" label="Modul" value={GROUP_INFO.module} />
      </Animated.View>

      {/* Anggota */}
      <Animated.View style={styles.card} entering={enter(160)}>
        <Text style={styles.sectionTitle}>Anggota Kelompok</Text>
        {GROUP_INFO.members.map((m, i) => (
          <View
            key={m.nim + i}
            style={[styles.memberRow, i > 0 && styles.memberDivider]}
            accessible
            accessibilityLabel={`${m.name}, NIM ${m.nim}, ${m.role}`}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(m.name)}</Text>
            </View>
            <View style={styles.memberText}>
              <Text style={styles.memberName}>{m.name}</Text>
              <Text style={styles.memberMeta}>{m.nim}</Text>
            </View>
            <View style={styles.rolePill}>
              <Text style={styles.roleText}>{m.role}</Text>
            </View>
          </View>
        ))}
      </Animated.View>

      {/* Info aplikasi */}
      <Animated.View style={styles.card} entering={enter(240)}>
        <Text style={styles.sectionTitle}>Tentang Aplikasi</Text>
        <InfoRow icon="apps-outline" label="Nama aplikasi" value={Constants.expoConfig?.name} />
        <InfoRow icon="pricetag-outline" label="Versi" value={Constants.expoConfig?.version} />
        <InfoRow icon="radio-outline" label="MQTT topic" value={MQTT_TOPIC} />
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  container: {
    padding: space.lg,
    paddingBottom: space.xxl,
    gap: space.lg,
  },
  hero: {
    backgroundColor: color.primary,
    borderRadius: radius.card,
    borderCurve: "continuous",
    padding: space.xxl,
    alignItems: "center",
    gap: 6,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: color.onPrimary,
  },
  heroSub: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
  },
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.card,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: color.border,
    padding: space.xl,
    gap: space.md,
    boxShadow: shadow.card,
  },
  sectionTitle: {
    fontSize: tokens.type.section,
    fontWeight: "700",
    color: color.text,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  infoTextWrap: { flex: 1 },
  infoLabel: { fontSize: 12, color: color.text3 },
  infoValue: { fontSize: 14, fontWeight: "500", color: color.text },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingVertical: space.sm,
  },
  memberDivider: {
    borderTopWidth: 1,
    borderTopColor: color.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.border,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 15, fontWeight: "700", color: color.primary },
  memberText: { flex: 1, gap: 2 },
  memberName: { fontSize: 15, fontWeight: "600", color: color.text },
  memberMeta: { fontSize: 13, color: color.text2, fontVariant: ["tabular-nums"] },
  rolePill: {
    backgroundColor: color.surface2,
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  roleText: { fontSize: 11, fontWeight: "600", color: color.text2 },
});
