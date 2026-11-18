import { useEffect } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { tokens } from "../theme/tokens.js";

const { color } = tokens;

// Berapa lama splash ditampilkan sebelum menghilang (ms).
const SPLASH_DURATION = 2600;
// Lama fade-out di akhir splash (ms)
const FADE_OUT = 400;

// Lingkaran gelombang yang membesar & memudar di belakang logo.
function Ring({ delay, reduceMotion }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }),
        -1,
        false,
      ),
    );
  }, [delay, reduceMotion, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.5 * (1 - progress.value),
    transform: [{ scale: 1 + progress.value * 1.6 }],
  }));

  return <Animated.View style={[styles.ring, style]} />;
}

export function SplashScreen({ onFinish }) {
  const reduceMotion = useReducedMotion();
  const logoScale = useSharedValue(reduceMotion ? 1 : 0.4);
  const logoOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const progress = useSharedValue(0);
  const rootOpacity = useSharedValue(1);

  useEffect(() => {
    if (!reduceMotion) {
      logoOpacity.value = withTiming(1, { duration: 350 });
      logoScale.value = withSpring(1, { damping: 9, stiffness: 120 });
    }
    progress.value = withTiming(1, {
      duration: SPLASH_DURATION - 200,
      easing: Easing.inOut(Easing.cubic),
    });

    // Mulai fade-out sedikit sebelum selesai, lalu lepas splash.
    const fadeTimer = setTimeout(() => {
      rootOpacity.value = withTiming(0, { duration: FADE_OUT });
    }, SPLASH_DURATION - FADE_OUT);
    const doneTimer = setTimeout(() => onFinish?.(), SPLASH_DURATION);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [onFinish, reduceMotion, logoOpacity, logoScale, progress, rootOpacity]);

  const rootStyle = useAnimatedStyle(() => ({ opacity: rootOpacity.value }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const barStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    // Modal membuat splash benar-benar menutupi satu layar penuh
    // (di atas header, tab bar, bahkan status bar), apa pun isi navigasinya.
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => { }}
    >
      <Animated.View
        style={[styles.root, rootStyle]}
        accessible
        accessibilityLabel="LiveTemp sedang dimuat"
      >
        <View style={styles.center}>
          <View style={styles.logoStage}>
            <Ring delay={0} reduceMotion={reduceMotion} />
            <Ring delay={600} reduceMotion={reduceMotion} />
            <Ring delay={1200} reduceMotion={reduceMotion} />
            <Animated.View style={[styles.logo, logoStyle]}>
              <Ionicons name="thermometer" size={64} color={color.primary} />
            </Animated.View>
          </View>

          <Animated.Text
            style={styles.title}
            entering={FadeInDown.delay(450).duration(500)}
          >
            LiveTemp
          </Animated.Text>
          <Animated.Text
            style={styles.subtitle}
            entering={FadeInDown.delay(650).duration(500)}
          >
            Real-time IoT Temperature Monitoring
          </Animated.Text>
        </View>

        <Animated.View style={styles.footer} entering={FadeIn.delay(900)}>
          <View style={styles.barTrack}>
            <Animated.View style={[styles.barFill, barStyle]} />
          </View>
          <Text style={styles.footerText}>Memuat aplikasi…</Text>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    alignItems: "center",
    gap: 8,
  },
  logoStage: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  ring: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 34,
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: "monospace",
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
  },
  footer: {
    position: "absolute",
    bottom: 64,
    alignItems: "center",
    gap: 10,
  },
  barTrack: {
    width: 160,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.25)",
    overflow: "hidden",
  },
  barFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "#FFFFFF",
  },
  footerText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
  },
});