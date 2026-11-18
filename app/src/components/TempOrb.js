import { useEffect, useMemo, useRef } from "react";
import { View } from "react-native";
import {
  Atlas,
  Canvas,
  Circle,
  FilterMode,
  Group,
  MipmapMode,
  RadialGradient,
  Skia,
  rect,
  useRSXformBuffer,
  usePictureAsTexture,
  vec,
} from "react-native-skia";
import { useIsFocused } from "@react-navigation/native";
import {
  useDerivedValue,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { tokens } from "../theme/tokens.js";

const { color } = tokens;

// ===== "Saturn Orb": bola bergelombang + 2 cincin ala Saturnus =====
const SPHERE_COUNT = 220;
// r = jari-jari cincin (relatif terhadap bola), n = jumlah titik, speed = kecepatan putar
const RINGS = [
  { r: 1.32, n: 84, speed: 1.0 }, // cincin dalam
  { r: 1.62, n: 120, speed: 0.65 }, // cincin luar
];
const RING_DOTS_TOTAL = RINGS.reduce((sum, ring) => sum + ring.n, 0);
const TOTAL = SPHERE_COUNT + RING_DOTS_TOTAL;

const RING_TILT_X = 0.42; // kemiringan cincin terhadap pandangan (makin besar makin "terbuka")
const RING_TILT_Z = -0.38; // kemiringan miring ala Saturnus

const HOLE_RADIUS = 56; // area bola yang dikosongkan untuk angka suhu
const RING_HOLE = 40; // area cincin yang dikosongkan di tengah
const BASE_SPEED = 0.15;
const TILT = 0.35;
const TEX = 32;

const WAVE_FREQ = 3.4;
const WAVE_SPEED = 1.8;
const WAVE_AMP = 0.05;
const WAVE_AMP_BEAT = 0.13;

function fibonacciSphere(n) {
  const pts = new Array(n);
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = goldenAngle * i;
    pts[i] = [Math.cos(theta) * r, y, Math.sin(theta) * r];
  }
  return pts;
}

const BASE_PTS = fibonacciSphere(SPHERE_COUNT);

// Hitung posisi & ukuran titik ke-i -> [scale, 0, tx, ty].
// "worklet" supaya bisa dipanggil dari UI thread maupun JS thread.
function projectDot(i, angle, phase, intensity, R, cx, cy) {
  "worklet";
  const swell = 1 + 0.04 * intensity;

  // ---------- TITIK BOLA (berputar + gelombang) ----------
  if (i < SPHERE_COUNT) {
    const p = BASE_PTS[i];
    const wave = Math.sin(p[1] * WAVE_FREQ + phase);
    const k = 1 + (WAVE_AMP + WAVE_AMP_BEAT * intensity) * wave;
    const x = p[0] * k;
    const y = p[1] * k;
    const z = p[2] * k;

    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const tilt = TILT + Math.sin(angle * 0.5) * 0.05;
    const cosT = Math.cos(tilt);
    const sinT = Math.sin(tilt);
    const x1 = x * cosA + z * sinA;
    const z1 = -x * sinA + z * cosA;
    const y1 = y * cosT - z1 * sinT;
    const z2 = y * sinT + z1 * cosT;
    const depth = (z2 + 1) / 2;
    const s = 2.2 / (2.2 - z2);
    const sx = cx + x1 * R * swell * s;
    const sy = cy + y1 * R * swell * s;
    const hx = sx - cx;
    const hy = sy - cy;
    if (hx * hx + hy * hy < HOLE_RADIUS * HOLE_RADIUS) {
      return [0, 0, -10000, -10000];
    }
    const sc = 0.22 * (0.65 + 0.75 * depth) * (1 + 0.35 * wave) * swell;
    return [sc, 0, sx - (TEX / 2) * sc, sy - (TEX / 2) * sc];
  }

  // ---------- TITIK CINCIN (bidang tetap, hanya titiknya yang mengorbit) ----------
  let ri = 0;
  let k = i - SPHERE_COUNT;
  while (ri < RINGS.length - 1 && k >= RINGS[ri].n) {
    k -= RINGS[ri].n;
    ri++;
  }
  const ring = RINGS[ri];
  const a = (k / ring.n) * Math.PI * 2 + phase * ring.speed * 0.4;
  const rad = ring.r + 0.05 * intensity; // cincin sedikit melebar saat beat
  const bx = Math.cos(a) * rad;
  const bz = Math.sin(a) * rad;

  // miringkan bidang cincin: rotasi sumbu X, lalu sumbu Z
  const cX = Math.cos(RING_TILT_X);
  const sX = Math.sin(RING_TILT_X);
  const yy = -bz * sX;
  const z = bz * cX; // z > 0 = dekat penonton
  const cZ = Math.cos(RING_TILT_Z);
  const sZ = Math.sin(RING_TILT_Z);
  const x = bx * cZ - yy * sZ;
  const y = bx * sZ + yy * cZ;

  // perspektif lebih lembut untuk cincin (kamera lebih jauh) agar tidak melebar berlebihan
  const s = 6 / (6 - z);
  const sx = cx + x * R * s;
  const sy = cy + y * R * s;
  const hx = sx - cx;
  const hy = sy - cy;
  const dist2 = hx * hx + hy * hy;

  // bagian cincin yang berada DI BELAKANG bola tertutup oleh bola
  if (z < 0 && dist2 < R * R) return [0, 0, -10000, -10000];
  // kosongkan area angka suhu
  if (dist2 < RING_HOLE * RING_HOLE) return [0, 0, -10000, -10000];

  // variasi ukuran per titik -> terlihat berkilau saat berputar
  const sparkle = 0.6 + 0.4 * Math.abs(Math.sin(k * 1.7 + ri));
  const depth = (z + 1.5) / 3;
  const sc = 0.13 * sparkle * (0.7 + 0.6 * depth) * (1 + 0.6 * intensity);
  return [sc, 0, sx - (TEX / 2) * sc, sy - (TEX / 2) * sc];
}

// "#RRGGBB" -> [r, g, b]
function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex ?? "");
  if (!m) return [15, 23, 42];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function TempOrb({
  tint = color.text,
  beatKey = 0,
  size = 200,
  dimmed = false,
}) {
  const reduceMotion = useReducedMotion();
  const focused = useIsFocused();
  const angleY = useSharedValue(0.6);
  const spinBoost = useSharedValue(0);
  const intensity = useSharedValue(0);
  const phase = useSharedValue(0);
  const dimSV = useSharedValue(dimmed ? 1 : 0);
  const firstBeat = useRef(true);

  const R = (size * 0.8) / 2 / 1.45; // bola dikecilkan agar cincin luar muat di kanvas
  const cx = size / 2;
  const cy = size / 2;

  const dotPicture = useMemo(() => {
    try {
      const recorder = Skia.PictureRecorder();
      const canvas = recorder.beginRecording(rect(0, 0, TEX, TEX));
      const paint = Skia.Paint();
      paint.setAntiAlias(true);
      paint.setColor(Skia.Color("white"));
      canvas.drawCircle(TEX / 2, TEX / 2, TEX / 2 - 1, paint);
      return recorder.finishRecordingAsPicture();
    } catch {
      return null;
    }
  }, []);
  const dotImg = usePictureAsTexture(dotPicture, { width: TEX, height: TEX });

  const sprites = useMemo(
    () => new Array(TOTAL).fill(0).map(() => rect(0, 0, TEX, TEX)),
    []
  );

  const transforms = useRSXformBuffer(TOTAL, (val, i) => {
    "worklet";
    const d = projectDot(i, angleY.value, phase.value, intensity.value, R, cx, cy);
    val.set(d[0], d[1], d[2], d[3]);
  });

  // First-frame insurance: posisi benar sejak frame pertama.
  useEffect(() => {
    try {
      transforms.value = transforms.value.map((slot, i) => {
        const d = projectDot(i, 0.6, 0, 0, R, cx, cy);
        slot.set(d[0], d[1], d[2], d[3]);
        return slot;
      });
    } catch {
      // buffer write unsupported — mapper pass will fill it instead
    }
  }, [transforms, R, cx, cy]);

  useEffect(() => {
    dimSV.set(withTiming(dimmed ? 1 : 0, { duration: 400 }));
  }, [dimmed, dimSV]);

  // Setiap data MQTT baru: gelombang melonjak, cincin berkilat, putaran dikebut.
  useEffect(() => {
    if (firstBeat.current) {
      firstBeat.current = false;
      return;
    }
    if (!beatKey || dimmed || reduceMotion) return;
    intensity.set(0);
    intensity.set(
      withSequence(
        withTiming(1, { duration: 140 }),
        withTiming(0.35, { duration: 180 }),
        withTiming(0.7, { duration: 120 }),
        withTiming(0, { duration: 500 })
      )
    );
    spinBoost.set(2.4);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // haptics unsupported — visual beat still plays
    }
  }, [beatKey, dimmed, reduceMotion, intensity, spinBoost]);

  const frame = useFrameCallback((info) => {
    "worklet";
    const dt = Math.min(0.05, (info.timeSincePreviousFrame ?? 16) / 1000);
    spinBoost.value *= Math.pow(0.02, dt);
    angleY.value += dt * (BASE_SPEED + spinBoost.value);
    phase.value += dt * (WAVE_SPEED + spinBoost.value * 0.8);
  });

  useEffect(() => {
    frame.setActive(focused && !reduceMotion && !dimmed);
  }, [focused, reduceMotion, dimmed, frame]);

  const groupOpacity = useDerivedValue(() => 0.8 * (1 - 0.55 * dimSV.value));
  // Cahaya lembut di belakang bola, menyala saat ada data baru
  const glowOpacity = useDerivedValue(
    () => (0.3 + 0.7 * intensity.value) * (1 - 0.8 * dimSV.value)
  );

  const [r, g, b] = hexToRgb(tint);
  const glowColors = [`rgba(${r},${g},${b},0.3)`, `rgba(${r},${g},${b},0)`];

  // Bola: pekat di ekuator, memudar ke kutub.
  // Cincin: warna lebih terang (dicampur putih); cincin dalam lebih terang dari luar.
  const colors = useMemo(() => {
    const out = new Array(TOTAL);
    for (let i = 0; i < SPHERE_COUNT; i++) {
      const y = BASE_PTS[i][1];
      out[i] = `rgba(${r},${g},${b},${(1 - 0.6 * y * y).toFixed(2)})`;
    }
    const lr = Math.round(r + (255 - r) * 0.45);
    const lg = Math.round(g + (255 - g) * 0.45);
    const lb = Math.round(b + (255 - b) * 0.45);
    let idx = SPHERE_COUNT;
    RINGS.forEach((ring, ri) => {
      const alpha = ri === 0 ? 0.95 : 0.7;
      for (let k = 0; k < ring.n; k++) {
        out[idx++] = `rgba(${lr},${lg},${lb},${alpha})`;
      }
    });
    return out;
  }, [r, g, b]);

  return (
    <View style={{ width: size, height: size }} accessible={false}>
      <Canvas style={{ width: size, height: size }}>
        <Group opacity={glowOpacity}>
          <Circle cx={cx} cy={cy} r={size * 0.36}>
            <RadialGradient c={vec(cx, cy)} r={size * 0.36} colors={glowColors} />
          </Circle>
        </Group>
        <Group opacity={groupOpacity}>
          <Atlas
            image={dotImg}
            sprites={sprites}
            transforms={transforms}
            colors={colors}
            colorBlendMode="modulate"
            sampling={{ filter: FilterMode.Linear, mipmap: MipmapMode.Linear }}
          />
        </Group>
      </Canvas>
    </View>
  );
}