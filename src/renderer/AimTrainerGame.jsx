import { useEffect, useRef, useState } from 'react';
import {
  Target,
  Grid3x3,
  Waves,
  Zap,
  Microscope,
  Orbit,
  Package,
  MoveHorizontal,
  Shuffle,
  Bomb,
  Crosshair,
  Popcorn,
  Hourglass,
  Trophy,
  MousePointerClick,
  Save,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Play,
  Footprints,
} from 'lucide-react';
import Icon from './Icon.jsx';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import fpsRifleHandsUrl from '../assets/models/fps-rifle-hands.glb';
import floorColorUrl from '../assets/textures/floor-color.jpg';
import floorNormalUrl from '../assets/textures/floor-normal.jpg';
import floorRoughnessUrl from '../assets/textures/floor-roughness.jpg';
import wallColorUrl from '../assets/textures/wall-color.jpg';
import wallNormalUrl from '../assets/textures/wall-normal.jpg';
import wallRoughnessUrl from '../assets/textures/wall-roughness.jpg';
import { saveScore } from './aimScores.js';
import CrosshairPreview from './CrosshairPreview.jsx';
import Button from './ui/Button';
import { debug } from '../logger.js';

const VALORANT_YAW = 0.07;
const DEG_TO_RAD = Math.PI / 180;

const SPAWN_DISTANCE = 13;
const TRACER_LIFETIME_MS = 80;
const MUZZLE_FLASH_LIFETIME_MS = 50;
const POP_DURATION_MS = 130;
const FLOOR_Y = -2.6;
const TARGET_MIN_CLEARANCE = 0.6;

const PEEK_STRAFE_SPEED = 6.75;
const PEEK_COVER_DISTANCE = 9;
const PEEK_HOLD_MS = 450;
const PEEK_HIDDEN_MIN_MS = 500;
const PEEK_HIDDEN_MAX_MS = 1200;

const PEEK_CHARACTER_HEIGHT = 1.96;
const PEEK_HEAD_Y = 0;
const PEEK_BOX_WIDTH = 2.4;
const PEEK_BOX_HEIGHT = 2.15;
const PEEK_BOX_DEPTH = 1.2;
const PEEK_OFFSET = PEEK_BOX_WIDTH / 2 + 0.7;

function computePeekLayout(targetSize) {
  const bodyHeight = Math.max(0.4, PEEK_CHARACTER_HEIGHT - targetSize * 2);
  const bodyTopY = PEEK_HEAD_Y - targetSize;
  const bodyY = bodyTopY - bodyHeight / 2;
  const boxBottomY = bodyTopY - bodyHeight;
  return { headY: PEEK_HEAD_Y, bodyY, bodyHeight, boxY: boxBottomY + PEEK_BOX_HEIGHT / 2 };
}

export const MODES = {
  flick: {
    icon: Target,
    accent: '#ff4655',
    labelKey: 'aimTrainer.modes.flick',
    descKey: 'aimTrainer.modes.flickDesc',
    movement: 'none',
    lifetime: null,
    preset: { targetCount: 1, targetSize: 0.28, spread: 28, duration: 60 },
  },
  gridshot: {
    icon: Grid3x3,
    accent: '#ffc857',
    labelKey: 'aimTrainer.modes.gridshot',
    descKey: 'aimTrainer.modes.gridshotDesc',
    movement: 'none',
    lifetime: null,
    preset: { targetCount: 4, targetSize: 0.26, spread: 26, duration: 60 },
  },
  trackingBeginner: {
    icon: Waves,
    accent: '#4ec9f5',
    labelKey: 'aimTrainer.modes.trackingBeginner',
    descKey: 'aimTrainer.modes.trackingBeginnerDesc',
    movement: 'drift',
    lifetime: null,
    driftSpeed: [1, 1.8],
    driftChangeInterval: [700, 1400],
    preset: { targetCount: 1, targetSize: 0.42, spread: 26, duration: 60 },
  },
  trackingIntermediate: {
    icon: Waves,
    accent: '#4ec9f5',
    labelKey: 'aimTrainer.modes.trackingIntermediate',
    descKey: 'aimTrainer.modes.trackingIntermediateDesc',
    movement: 'drift',
    lifetime: null,
    driftSpeed: [1.6, 2.8],
    driftChangeInterval: [500, 1000],
    preset: { targetCount: 1, targetSize: 0.36, spread: 28, duration: 60 },
  },
  tracking: {
    icon: Waves,
    accent: '#4ec9f5',
    labelKey: 'aimTrainer.modes.tracking',
    descKey: 'aimTrainer.modes.trackingDesc',
    movement: 'drift',
    holdTracking: true,
    lifetime: null,
    driftSpeed: [2, 4],
    driftChangeInterval: [350, 850],
    preset: { targetCount: 1, targetSize: 0.32, spread: 30, duration: 60 },
  },
  trackingMulti: {
    icon: Waves,
    accent: '#4ec9f5',
    labelKey: 'aimTrainer.modes.trackingMulti',
    descKey: 'aimTrainer.modes.trackingMultiDesc',
    movement: 'drift',
    holdTracking: true,
    lifetime: null,
    driftSpeed: [1.8, 3],
    driftChangeInterval: [500, 1100],
    preset: { targetCount: 2, targetSize: 0.34, spread: 28, duration: 60 },
  },
  reflex: {
    icon: Zap,
    accent: '#9b7bff',
    labelKey: 'aimTrainer.modes.reflex',
    descKey: 'aimTrainer.modes.reflexDesc',
    movement: 'none',
    lifetime: 1100,
    preset: { targetCount: 1, targetSize: 0.3, spread: 34, duration: 60 },
  },
  micro: {
    icon: Microscope,
    accent: '#3ddc84',
    labelKey: 'aimTrainer.modes.micro',
    descKey: 'aimTrainer.modes.microDesc',
    movement: 'none',
    lifetime: null,
    preset: { targetCount: 1, targetSize: 0.12, spread: 12, duration: 60 },
  },
  orbit: {
    icon: Orbit,
    accent: '#ff8fab',
    labelKey: 'aimTrainer.modes.orbit',
    descKey: 'aimTrainer.modes.orbitDesc',
    movement: 'orbit',
    lifetime: null,
    preset: { targetCount: 2, targetSize: 0.26, spread: 30, duration: 60 },
  },
  peek: {
    icon: Package,
    accent: '#4ec9f5',
    labelKey: 'aimTrainer.modes.peek',
    descKey: 'aimTrainer.modes.peekDesc',
    movement: 'peek',
    lifetime: null,
    preset: { targetCount: 1, targetSize: 0.16, spread: 20, duration: 60 },
  },
  strafe: {
    icon: MoveHorizontal,
    accent: '#4ec9f5',
    labelKey: 'aimTrainer.modes.strafe',
    descKey: 'aimTrainer.modes.strafeDesc',
    movement: 'drift',
    driftLockY: true,
    driftSpeed: [3, 5],
    driftChangeInterval: [999999, 999999],
    lifetime: null,
    preset: { targetCount: 1, targetSize: 0.3, spread: 30, duration: 60 },
  },
  patrolSlow: {
    icon: Footprints,
    accent: '#3ddc84',
    labelKey: 'aimTrainer.modes.patrolSlow',
    descKey: 'aimTrainer.modes.patrolSlowDesc',
    movement: 'drift',
    driftLockY: true,
    driftSpeed: [1.0, 1.0],
    driftChangeInterval: [999999, 999999],
    passiveTrack: true,
    lifetime: null,
    preset: { targetCount: 1, targetSize: 0.34, spread: 30, duration: 60 },
  },
  patrol: {
    icon: Footprints,
    accent: '#3ddc84',
    labelKey: 'aimTrainer.modes.patrol',
    descKey: 'aimTrainer.modes.patrolDesc',
    movement: 'drift',
    driftLockY: true,
    driftSpeed: [1.6, 1.6],
    driftChangeInterval: [999999, 999999],
    passiveTrack: true,
    lifetime: null,
    preset: { targetCount: 1, targetSize: 0.34, spread: 30, duration: 60 },
  },
  patrolFast: {
    icon: Footprints,
    accent: '#3ddc84',
    labelKey: 'aimTrainer.modes.patrolFast',
    descKey: 'aimTrainer.modes.patrolFastDesc',
    movement: 'drift',
    driftLockY: true,
    driftSpeed: [2.4, 2.4],
    driftChangeInterval: [999999, 999999],
    passiveTrack: true,
    lifetime: null,
    preset: { targetCount: 1, targetSize: 0.34, spread: 30, duration: 60 },
  },
  patrolMulti: {
    icon: Footprints,
    accent: '#3ddc84',
    labelKey: 'aimTrainer.modes.patrolMulti',
    descKey: 'aimTrainer.modes.patrolMultiDesc',
    movement: 'drift',
    driftLockY: true,
    driftSpeed: [1.0, 2.4],
    driftChangeInterval: [2500, 4500],
    passiveTrack: true,
    lifetime: null,
    preset: { targetCount: 1, targetSize: 0.34, spread: 30, duration: 60 },
  },
  switch: {
    icon: Shuffle,
    accent: '#ffc857',
    labelKey: 'aimTrainer.modes.switchMode',
    descKey: 'aimTrainer.modes.switchModeDesc',
    movement: 'switch',
    lifetime: null,
    preset: { targetCount: 4, targetSize: 0.26, spread: 26, duration: 60 },
  },
  strafeTap: {
    icon: Bomb,
    accent: '#ff8fab',
    labelKey: 'aimTrainer.modes.strafeTap',
    descKey: 'aimTrainer.modes.strafeTapDesc',
    movement: 'drift',
    hitsRequired: 3,
    driftSpeed: [1.5, 2.5],
    driftChangeInterval: [600, 1200],
    lifetime: null,
    preset: { targetCount: 1, targetSize: 0.3, spread: 26, duration: 60 },
  },
  precision: {
    icon: Crosshair,
    accent: '#3ddc84',
    labelKey: 'aimTrainer.modes.precision',
    descKey: 'aimTrainer.modes.precisionDesc',
    movement: 'none',
    lifetime: 1500,
    preset: { targetCount: 1, targetSize: 0.08, spread: 16, duration: 60 },
  },
  popcorn: {
    icon: Popcorn,
    accent: '#ffb84d',
    labelKey: 'aimTrainer.modes.popcorn',
    descKey: 'aimTrainer.modes.popcornDesc',
    movement: 'none',
    lifetime: 1300,
    preset: { targetCount: 3, targetSize: 0.22, spread: 32, duration: 60 },
  },
  snapHold: {
    icon: Hourglass,
    accent: '#9b7bff',
    labelKey: 'aimTrainer.modes.snapHold',
    descKey: 'aimTrainer.modes.snapHoldDesc',
    movement: 'snap',
    holdMs: 350,
    lifetime: 2200,
    preset: { targetCount: 1, targetSize: 0.24, spread: 30, duration: 60 },
  },
};

export const DEFAULT_CONFIG = {
  mode: 'flick',
  dpi: 800,
  sens: 0.35,
  duration: 60,
  targetSize: 0.28,
  targetColor: '#ff4655',
  targetCount: 1,
  spread: 28,
  fov: 103,
  showWeapon: true,
  theme: 'day',
  crosshairCode: null,
};

function horizontalToVerticalFov(hFovDeg, aspect) {
  const hFovRad = hFovDeg * DEG_TO_RAD;
  return (2 * Math.atan(Math.tan(hFovRad / 2) / aspect)) / DEG_TO_RAD;
}

function randomTargetPosition(spreadDeg, targetSize = 0.45) {
  const yaw = (Math.random() * 2 - 1) * spreadDeg * DEG_TO_RAD;
  const pitch = (Math.random() * 2 - 1) * spreadDeg * DEG_TO_RAD * 0.55;
  const minY = FLOOR_Y + targetSize + TARGET_MIN_CLEARANCE;
  return new THREE.Vector3(
    Math.sin(yaw) * Math.cos(pitch) * SPAWN_DISTANCE,
    Math.max(Math.sin(pitch) * SPAWN_DISTANCE, minY),
    -Math.cos(yaw) * Math.cos(pitch) * SPAWN_DISTANCE,
  );
}

const OVERLAP_REPOSITION_ATTEMPTS = 8;

function pickNonOverlappingPosition(spreadDeg, targetSize, siblings, excludeEntry) {
  const minDist = targetSize * 2.4;
  let candidate = randomTargetPosition(spreadDeg, targetSize);
  if (!siblings || siblings.length === 0) return candidate;
  for (let attempt = 0; attempt < OVERLAP_REPOSITION_ATTEMPTS; attempt += 1) {
    const overlaps = siblings.some(
      (other) =>
        other !== excludeEntry &&
        other.mesh?.visible &&
        candidate.distanceTo(other.mesh.position) < minDist,
    );
    if (!overlaps) break;
    candidate = randomTargetPosition(spreadDeg, targetSize);
  }
  return candidate;
}

function resetTargetForMode(entry, mode, cfg, now, state) {
  if (mode.movement === 'peek') {
    const layout = computePeekLayout(cfg.targetSize);
    entry.box.position.set(0, layout.boxY, -PEEK_COVER_DISTANCE);
    entry.box.visible = true;
    entry.body.scale.set(1, layout.bodyHeight, 1);
    entry.mesh.visible = false;
    entry.body.visible = false;
    entry.peekLayout = layout;
    entry.peek = state.initPeekState(entry, now);
  } else {
    entry.box.visible = false;
    entry.body.visible = false;
    entry.mesh.visible = true;
    entry.mesh.position.copy(pickNonOverlappingPosition(cfg.spread, cfg.targetSize, state.targets, entry));
    entry.anchor.copy(entry.mesh.position);
    Object.assign(entry, state.makeMotion(mode));
    entry.peek = null;
  }
  if (entry.numberLabel) entry.numberLabel.visible = mode.movement === 'switch';
  entry.order = null;
  entry.hitsRemaining = mode.hitsRequired ?? null;
  entry.snapArmedAt = null;
  entry.spawnedAt = now;
  entry.poppedAt = now;
}

function valueNoise(width, height, cellSize, seed = 1) {
  const cols = Math.ceil(width / cellSize) + 1;
  const rows = Math.ceil(height / cellSize) + 1;
  const grid = [];
  let state = seed;
  const rand = () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
  for (let r = 0; r < rows; r += 1) {
    grid.push(Array.from({ length: cols }, rand));
  }
  const smooth = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const gx = x / cellSize;
    const gy = y / cellSize;
    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);
    const tx = smooth(gx - x0);
    const ty = smooth(gy - y0);
    const v00 = grid[y0 % rows][x0 % cols];
    const v10 = grid[y0 % rows][(x0 + 1) % cols];
    const v01 = grid[(y0 + 1) % rows][x0 % cols];
    const v11 = grid[(y0 + 1) % rows][(x0 + 1) % cols];
    return (v00 * (1 - tx) + v10 * tx) * (1 - ty) + (v01 * (1 - tx) + v11 * tx) * ty;
  };
}

const textureLoader = new THREE.TextureLoader();

function loadPbrMaterial({ color, normal, roughness }, repeat, extra = {}) {
  const configure = (texture, isColor) => {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeat[0], repeat[1]);
    texture.anisotropy = 8;
    if (isColor) texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  };

  return new THREE.MeshStandardMaterial({
    map: configure(textureLoader.load(color), true),
    normalMap: configure(textureLoader.load(normal), false),
    roughnessMap: configure(textureLoader.load(roughness), false),
    ...extra,
  });
}

function makeSkyTexture() {
  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#1f4a8c');
  sky.addColorStop(0.45, '#5b9bd8');
  sky.addColorStop(0.72, '#a8cbe8');
  sky.addColorStop(1, '#e2d6c4');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  const sunGlow = ctx.createRadialGradient(width * 0.72, height * 0.26, 0, width * 0.72, height * 0.26, height * 0.55);
  sunGlow.addColorStop(0, 'rgba(255, 244, 214, 0.95)');
  sunGlow.addColorStop(0.25, 'rgba(255, 232, 186, 0.35)');
  sunGlow.addColorStop(1, 'rgba(255, 232, 186, 0)');
  ctx.fillStyle = sunGlow;
  ctx.fillRect(0, 0, width, height);

  const octaves = [
    { noise: valueNoise(width, height, 150, 3), weight: 0.55 },
    { noise: valueNoise(width, height, 70, 11), weight: 0.3 },
    { noise: valueNoise(width, height, 32, 29), weight: 0.15 },
  ];
  const clouds = ctx.createImageData(width, height);
  for (let y = 0; y < height; y += 1) {
    const band = Math.sin((y / height) * Math.PI) ** 1.5;
    for (let x = 0; x < width; x += 1) {
      let n = 0;
      octaves.forEach(({ noise, weight }) => {
        n += noise(x, y) * weight;
      });
      const density = Math.max(0, n - 0.5) * 2.4 * band;
      const alpha = Math.min(1, density) * 235;
      const i = (y * width + x) * 4;
      clouds.data[i] = 255;
      clouds.data[i + 1] = 255;
      clouds.data[i + 2] = 255;
      clouds.data[i + 3] = alpha;
    }
  }
  const cloudCanvas = document.createElement('canvas');
  cloudCanvas.width = width;
  cloudCanvas.height = height;
  cloudCanvas.getContext('2d').putImageData(clouds, 0, 0);
  ctx.filter = 'blur(3px)';
  ctx.drawImage(cloudCanvas, 0, 0);
  ctx.filter = 'none';

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeGlowTexture(color) {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

function makeNumberTexture(n) {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(10, 12, 16, 0.85)';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 72px "Chakra Petch", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(n), size / 2, size / 2 + 4);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createNoiseBuffer(ctx, seconds) {
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function playGunshot(ctx) {
  const now = ctx.currentTime;

  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx, 0.12);
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.value = 1400;
  noiseFilter.Q.value = 0.7;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.5, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
  noise.connect(noiseFilter).connect(noiseGain).connect(ctx.destination);
  noise.start(now);
  noise.stop(now + 0.12);

  const thump = ctx.createOscillator();
  thump.type = 'sine';
  thump.frequency.setValueAtTime(110, now);
  thump.frequency.exponentialRampToValueAtTime(45, now + 0.08);
  const thumpGain = ctx.createGain();
  thumpGain.gain.setValueAtTime(0.35, now);
  thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
  thump.connect(thumpGain).connect(ctx.destination);
  thump.start(now);
  thump.stop(now + 0.09);
}

function playTargetPop(ctx) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(1100, now);
  osc.frequency.exponentialRampToValueAtTime(420, now + 0.09);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.4, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.1);
}

function AimTrainerGame({ config: rawConfig }) {
  const playlist = rawConfig?.playlist ?? null;
  const playlistSteps = rawConfig?.playlistSteps ?? null;
  const activeList = playlist ?? playlistSteps;
  const [step, setStep] = useState(0);
  const activeMode = playlist ? playlist[Math.min(step, playlist.length - 1)] : rawConfig?.mode;
  const activeStepConfig = playlistSteps ? playlistSteps[Math.min(step, playlistSteps.length - 1)] : null;
  const config = {
    ...DEFAULT_CONFIG,
    ...rawConfig,
    ...(playlist ? { mode: activeMode, targetSize: MODES[activeMode].preset.targetSize, spread: MODES[activeMode].preset.spread } : {}),
    ...(activeStepConfig
      ? {
          mode: 'custom',
          duration: activeStepConfig.duration,
          targetSize: activeStepConfig.targetSize,
          targetCount: activeStepConfig.targetCount,
          spread: activeStepConfig.spread,
        }
      : {}),
  };
  const isLastStep = !activeList || step >= activeList.length - 1;

  const mountRef = useRef(null);
  const [phase, setPhase] = useState('ready');
  const [timeLeft, setTimeLeft] = useState(config.duration);
  const [stats, setStats] = useState({ hits: 0, misses: 0, times: [] });
  const [locked, setLocked] = useState(false);
  const [rawInputActive, setRawInputActive] = useState(null);

  const stateRef = useRef({});
  const configRef = useRef(config);
  configRef.current = config;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const isDark = config.theme === 'dark';

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(isDark ? 0x0b0d12 : 0x9dc2e0);
    scene.fog = new THREE.FogExp2(isDark ? 0x0b0d12 : 0xa8cbe8, isDark ? 0.02 : 0.008);

    const initialAspect = window.innerWidth / window.innerHeight;
    const camera = new THREE.PerspectiveCamera(
      horizontalToVerticalFov(config.fov, initialAspect),
      initialAspect,
      0.05,
      200,
    );
    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    scene.add(camera);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xbfd4ff, 0x3a4152, isDark ? 0.5 : 1.5));
    scene.add(new THREE.AmbientLight(0xffffff, isDark ? 0.15 : 0.45));

    const sun = new THREE.DirectionalLight(0xfff2dc, isDark ? 0.6 : 2.6);
    sun.position.set(8, 16, 6);
    scene.add(sun);

    const backLight = new THREE.DirectionalLight(0xa8c4ff, isDark ? 0.3 : 0.9);
    backLight.position.set(-6, 8, -10);
    scene.add(backLight);

    const accentLeft = new THREE.PointLight(0xff4655, 3.5, 40, 2);
    accentLeft.position.set(-9, 3, -4);
    scene.add(accentLeft);

    const accentRight = new THREE.PointLight(0x4ec9f5, 2.6, 40, 2);
    accentRight.position.set(9, 3, -6);
    scene.add(accentRight);

    const weaponLight = new THREE.PointLight(0xffffff, 3, 5, 2);
    weaponLight.position.set(0.35, 0.1, 0.3);
    camera.add(weaponLight);

    if (!isDark) {
      const sky = new THREE.Mesh(
        new THREE.SphereGeometry(120, 40, 24),
        new THREE.MeshBasicMaterial({ map: makeSkyTexture(), side: THREE.BackSide, fog: false, depthWrite: false }),
      );
      scene.add(sky);
    }

    const arena = new THREE.Group();
    scene.add(arena);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(70, 70),
      loadPbrMaterial(
        { color: floorColorUrl, normal: floorNormalUrl, roughness: floorRoughnessUrl },
        [18, 18],
        { metalness: 0.05, color: isDark ? 0x3a3f4a : 0xffffff },
      ),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = FLOOR_Y;
    arena.add(floor);

    const grid = new THREE.GridHelper(70, 35, 0xff6b78, 0x7c869c);
    grid.position.y = FLOOR_Y + 0.01;
    grid.material.opacity = 0.25;
    grid.material.transparent = true;
    arena.add(grid);

    const wallMat = loadPbrMaterial(
      { color: wallColorUrl, normal: wallNormalUrl, roughness: wallRoughnessUrl },
      [8, 2],
      { metalness: 0.45, side: THREE.DoubleSide, color: isDark ? 0x3a3f4a : 0xffffff },
    );
    const WALL_HEIGHT = 7;
    const WALL_HALF = 24;
    const wallY = FLOOR_Y + WALL_HEIGHT / 2;
    const wallPlacements = [
      { pos: [0, wallY, -WALL_HALF], rot: 0 },
      { pos: [0, wallY, WALL_HALF], rot: Math.PI },
      { pos: [-WALL_HALF, wallY, 0], rot: Math.PI / 2 },
      { pos: [WALL_HALF, wallY, 0], rot: -Math.PI / 2 },
    ];
    wallPlacements.forEach(({ pos, rot }) => {
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(WALL_HALF * 2, WALL_HEIGHT), wallMat);
      wall.position.set(...pos);
      wall.rotation.y = rot;
      arena.add(wall);

      const crest = new THREE.Mesh(
        new THREE.PlaneGeometry(WALL_HALF * 2, 0.22),
        new THREE.MeshBasicMaterial({ color: 0xff4655, transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
      );
      crest.position.set(pos[0], FLOOR_Y + WALL_HEIGHT - 0.15, pos[2]);
      crest.rotation.y = rot;
      arena.add(crest);
    });

    [-8, 0, 8].forEach((x, i) => {
      const strip = new THREE.Mesh(
        new THREE.PlaneGeometry(0.3, WALL_HEIGHT * 0.8),
        new THREE.MeshBasicMaterial({
          color: i === 1 ? 0xff4655 : 0x9fb4ff,
          transparent: true,
          opacity: i === 1 ? 0.6 : 0.35,
        }),
      );
      strip.position.set(x, FLOOR_Y + WALL_HEIGHT * 0.45, -WALL_HALF + 0.05);
      arena.add(strip);
    });

    const targetGeo = new THREE.SphereGeometry(1, 28, 28);
    const targetMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(config.targetColor),
      emissive: new THREE.Color(config.targetColor),
      emissiveIntensity: 0.35,
      roughness: 0.35,
      metalness: 0.1,
    });

    const peekBoxGeo = new THREE.BoxGeometry(PEEK_BOX_WIDTH, PEEK_BOX_HEIGHT, PEEK_BOX_DEPTH);
    const peekBoxMat = loadPbrMaterial(
      { color: wallColorUrl, normal: wallNormalUrl, roughness: wallRoughnessUrl },
      [1.4, 1.2],
      { metalness: 0.45 },
    );
    const peekBodyGeo = new THREE.CylinderGeometry(0.28, 0.34, 1, 14);
    const peekBodyMat = new THREE.MeshStandardMaterial({ color: 0x2b3040, roughness: 0.7, metalness: 0.1 });

    const DEFAULT_DRIFT_SPEED = [2, 4];
    const randomDrift = (speedRange = DEFAULT_DRIFT_SPEED, lockY = false) =>
      new THREE.Vector3(Math.random() * 2 - 1, lockY ? 0 : (Math.random() * 2 - 1) * 0.5, 0)
        .normalize()
        .multiplyScalar(speedRange[0] + Math.random() * (speedRange[1] - speedRange[0]));

    const DEFAULT_DRIFT_CHANGE_INTERVAL = [350, 850];
    const makeMotion = (mode) => {
      const [changeMin, changeMax] = mode?.driftChangeInterval ?? DEFAULT_DRIFT_CHANGE_INTERVAL;
      return {
        drift: randomDrift(mode?.driftSpeed, mode?.driftLockY),
        driftChangeAt: performance.now() + changeMin + Math.random() * (changeMax - changeMin),
        orbitAngle: Math.random() * Math.PI * 2,
        orbitRadius: 2.2 + Math.random() * 2,
        orbitSpeed: (0.6 + Math.random() * 0.7) * (Math.random() < 0.5 ? -1 : 1),
      };
    };

    const initPeekState = (entry, now) => ({
      phase: 'hidden',
      phaseAt: now,
      hiddenUntil: now + PEEK_HIDDEN_MIN_MS + Math.random() * (PEEK_HIDDEN_MAX_MS - PEEK_HIDDEN_MIN_MS),
      side: Math.random() < 0.5 ? -1 : 1,
      offset: 0,
      hitThisExposure: false,
      boxCenter: entry.box.position.clone(),
    });

    const targets = [];
    for (let i = 0; i < config.targetCount; i += 1) {
      const mesh = new THREE.Mesh(targetGeo, targetMat);
      mesh.position.copy(pickNonOverlappingPosition(config.spread, config.targetSize, targets));
      mesh.scale.setScalar(config.targetSize);
      scene.add(mesh);

      const peekLayout = computePeekLayout(config.targetSize);

      const box = new THREE.Mesh(peekBoxGeo, peekBoxMat);
      box.position.set(0, peekLayout.boxY, -PEEK_COVER_DISTANCE);
      box.visible = false;
      scene.add(box);

      const body = new THREE.Mesh(peekBodyGeo, peekBodyMat);
      body.scale.set(1, peekLayout.bodyHeight, 1);
      body.visible = false;
      scene.add(body);

      const numberLabel = new THREE.Sprite(
        new THREE.SpriteMaterial({ transparent: true, depthTest: false }),
      );
      numberLabel.scale.set(0.4, 0.4, 1);
      numberLabel.visible = false;
      scene.add(numberLabel);

      const entry = {
        mesh,
        box,
        body,
        numberLabel,
        order: null,
        hitsRemaining: null,
        snapArmedAt: null,
        peekLayout,
        spawnedAt: performance.now(),
        poppedAt: performance.now(),
        anchor: mesh.position.clone(),
        ...makeMotion(MODES[config.mode]),
      };
      entry.peek = initPeekState(entry, performance.now());
      targets.push(entry);
    }

    const switchNumberTextures = targets.map((_, i) => makeNumberTexture(i + 1));
    const positionNumberLabel = (entry, cfg) => {
      entry.numberLabel.position.set(
        entry.mesh.position.x,
        entry.mesh.position.y + cfg.targetSize + 0.3,
        entry.mesh.position.z,
      );
    };
    const reshuffleSwitch = (entries, cfg) => {
      const orders = entries.map((_, i) => i + 1);
      for (let i = orders.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [orders[i], orders[j]] = [orders[j], orders[i]];
      }
      entries.forEach((entry, i) => {
        entry.order = orders[i];
        entry.numberLabel.material.map = switchNumberTextures[entry.order - 1];
        entry.numberLabel.material.needsUpdate = true;
        entry.numberLabel.visible = true;
        positionNumberLabel(entry, cfg);
      });
    };
    if (MODES[config.mode]?.movement === 'switch') {
      reshuffleSwitch(targets, config);
    }

    const flashTexture = makeGlowTexture('rgba(255, 210, 130, 0.95)');
    const impactTexture = makeGlowTexture('rgba(255, 245, 220, 0.95)');

    const muzzleTip = new THREE.Object3D();
    muzzleTip.position.set(0.22, -0.14, -0.55);
    camera.add(muzzleTip);

    const muzzleFlash = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: flashTexture,
        transparent: true,
        opacity: 0,
        depthTest: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    muzzleFlash.scale.set(0.5, 0.5, 1);
    muzzleTip.add(muzzleFlash);

    const raycaster = new THREE.Raycaster();
    const center = new THREE.Vector2(0, 0);

    stateRef.current = {
      scene,
      camera,
      renderer,
      euler,
      targets,
      makeMotion,
      initPeekState,
      reshuffleSwitch,
      positionNumberLabel,
      switchNext: 1,
      raycaster,
      center,
      muzzleTip,
      muzzleFlash,
      impactTexture,
      audioCtx: new (window.AudioContext || window.webkitAudioContext)(),
      mixer: null,
      fireAction: null,
      lastFrameTime: performance.now(),
      tracers: [],
      sparks: [],
      flashUntil: 0,
      isTrackingHeld: false,
      lastTrackSample: 0,
      trackBeam: null,
    };

    if (config.showWeapon) {
      new GLTFLoader().load(fpsRifleHandsUrl, (gltf) => {
        const model = gltf.scene;

        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        const longestSide = Math.max(size.x, size.y, size.z) || 1;
        model.scale.setScalar(0.75 / longestSide);

        const center3 = new THREE.Vector3();
        new THREE.Box3().setFromObject(model).getCenter(center3);
        model.position.sub(center3);

        const holder = new THREE.Group();
        holder.add(model);
        holder.position.set(0.22, -0.2, -0.45);
        holder.rotation.set(0.03, -0.06, 0);
        camera.add(holder);

        if (gltf.animations?.length > 0) {
          const mixer = new THREE.AnimationMixer(model);
          const clip = THREE.AnimationClip.findByName(gltf.animations, 'fire') ?? gltf.animations[0];
          const action = mixer.clipAction(clip);
          action.setLoop(THREE.LoopOnce);
          action.clampWhenFinished = true;
          stateRef.current.mixer = mixer;
          stateRef.current.fireAction = action;
        }
      });
    }

    let frameId;
    const animate = () => {
      const state = stateRef.current;
      const now = performance.now();
      const dt = now - state.lastFrameTime;
      state.lastFrameTime = now;

      state.mixer?.update(dt / 1000);
      muzzleFlash.material.opacity = now < state.flashUntil ? 1 : 0;

      const mode = MODES[configRef.current.mode] ?? MODES.flick;
      const cfg = configRef.current;

      state.targets.forEach((entry) => {
        const age = now - entry.poppedAt;
        const scale = age < POP_DURATION_MS ? cfg.targetSize * (0.4 + 0.6 * (age / POP_DURATION_MS)) : cfg.targetSize;
        entry.mesh.scale.setScalar(scale);

        if (phaseRef.current !== 'running') return;

        if (mode.movement === 'drift') {
          if (now >= entry.driftChangeAt) {
            const [changeMin, changeMax] = mode.driftChangeInterval ?? [350, 850];
            entry.drift = randomDrift(mode.driftSpeed, mode.driftLockY);
            entry.driftChangeAt = now + changeMin + Math.random() * (changeMax - changeMin);
          }

          const step = entry.drift.clone().multiplyScalar(dt / 1000);
          entry.mesh.position.add(step);
          const limitX = Math.sin(cfg.spread * DEG_TO_RAD) * SPAWN_DISTANCE;
          const limitTop = Math.sin(cfg.spread * DEG_TO_RAD * 0.55) * SPAWN_DISTANCE;
          const minY = FLOOR_Y + cfg.targetSize + TARGET_MIN_CLEARANCE;
          if (entry.mesh.position.x < -limitX || entry.mesh.position.x > limitX) entry.drift.x *= -1;
          if (entry.mesh.position.y > limitTop || entry.mesh.position.y < minY) entry.drift.y *= -1;
          entry.mesh.position.x = THREE.MathUtils.clamp(entry.mesh.position.x, -limitX, limitX);
          entry.mesh.position.y = THREE.MathUtils.clamp(entry.mesh.position.y, minY, limitTop);
        } else if (mode.movement === 'orbit') {
          entry.orbitAngle += entry.orbitSpeed * (dt / 1000);
          const minY = FLOOR_Y + cfg.targetSize + TARGET_MIN_CLEARANCE;
          entry.mesh.position.set(
            entry.anchor.x + Math.cos(entry.orbitAngle) * entry.orbitRadius,
            Math.max(entry.anchor.y + Math.sin(entry.orbitAngle) * entry.orbitRadius * 0.55, minY),
            entry.anchor.z,
          );
        } else if (mode.movement === 'peek') {
          const p = entry.peek;
          const stepDist = PEEK_STRAFE_SPEED * (dt / 1000);

          if (p.phase === 'hidden') {
            if (now >= p.hiddenUntil) {
              p.phase = 'exposing';
              p.phaseAt = now;
              p.exposedAt = now;
              p.hitThisExposure = false;
            }
          } else if (p.phase === 'exposing') {
            p.offset = Math.min(PEEK_OFFSET, p.offset + stepDist);
            if (p.offset >= PEEK_OFFSET) {
              p.phase = 'held';
              p.phaseAt = now;
            }
          } else if (p.phase === 'held') {
            if (now - p.phaseAt >= PEEK_HOLD_MS) {
              p.phase = 'retreating';
              if (!p.hitThisExposure) {
                setStats((prev) => ({ ...prev, misses: prev.misses + 1 }));
              }
            }
          } else if (p.phase === 'retreating') {
            p.offset = Math.max(0, p.offset - stepDist);
            if (p.offset <= 0) {
              p.phase = 'hidden';
              p.phaseAt = now;
              p.hiddenUntil = now + PEEK_HIDDEN_MIN_MS + Math.random() * (PEEK_HIDDEN_MAX_MS - PEEK_HIDDEN_MIN_MS);
              p.side = Math.random() < 0.5 ? -1 : 1;
            }
          }

          entry.mesh.visible = p.offset > 0;
          entry.body.visible = p.offset > 0;
          const x = p.boxCenter.x + p.side * p.offset;
          const layout = entry.peekLayout;
          entry.body.position.set(x, layout.bodyY, p.boxCenter.z);
          entry.mesh.position.set(x, layout.headY, p.boxCenter.z);
        }

        if (mode.movement === 'snap' && entry.snapArmedAt !== null) {
          state.raycaster.setFromCamera(state.center, camera);
          const stillOn = state.raycaster.intersectObject(entry.mesh).length > 0;
          if (!stillOn) {
            entry.snapArmedAt = null;
          } else if (now - entry.snapArmedAt >= (mode.holdMs ?? 350)) {
            const reactionMs = now - entry.spawnedAt;
            entry.mesh.position.copy(pickNonOverlappingPosition(cfg.spread, cfg.targetSize, state.targets, entry));
            entry.anchor.copy(entry.mesh.position);
            entry.snapArmedAt = null;
            entry.spawnedAt = now;
            entry.poppedAt = now;
            setStats((prev) => ({ ...prev, hits: prev.hits + 1, times: [...prev.times, reactionMs] }));
          }
        }

        if (mode.lifetime && now - entry.spawnedAt > mode.lifetime) {
          entry.mesh.position.copy(pickNonOverlappingPosition(cfg.spread, cfg.targetSize, state.targets, entry));
          entry.anchor.copy(entry.mesh.position);
          entry.snapArmedAt = null;
          entry.spawnedAt = now;
          entry.poppedAt = now;
          setStats((prev) => ({ ...prev, misses: prev.misses + 1 }));
        }
      });

      const activeTrackingMode = MODES[cfg.mode]?.holdTracking || MODES[cfg.mode]?.passiveTrack;
      if (activeTrackingMode && phaseRef.current === 'running') {
        const TRACK_SAMPLE_INTERVAL_MS = 100;
        const held = MODES[cfg.mode]?.passiveTrack ? true : state.isTrackingHeld;
        let onTarget = false;
        let endPoint = null;
        if (held) {
          state.raycaster.setFromCamera(state.center, camera);
          const meshes = state.targets.map((entry) => entry.mesh);
          const intersections = state.raycaster.intersectObjects(meshes);
          onTarget = intersections.length > 0;
          endPoint = onTarget
            ? intersections[0].point
            : camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(30).add(camera.position);
        }

        if (now - state.lastTrackSample >= TRACK_SAMPLE_INTERVAL_MS) {
          state.lastTrackSample = now;
          setStats((prev) =>
            held && onTarget ? { ...prev, hits: prev.hits + 1 } : { ...prev, misses: prev.misses + 1 },
          );
        }

        if (held) {
          const muzzleWorldPos = new THREE.Vector3();
          state.muzzleTip.getWorldPosition(muzzleWorldPos);
          if (!state.trackBeam) {
            const beamGeometry = new THREE.BufferGeometry().setFromPoints([muzzleWorldPos, endPoint]);
            const beamMaterial = new THREE.LineBasicMaterial({
              color: onTarget ? 0x3ddc84 : 0xffe9a8,
              transparent: true,
              opacity: 0.85,
            });
            state.trackBeam = new THREE.Line(beamGeometry, beamMaterial);
            scene.add(state.trackBeam);
          } else {
            state.trackBeam.geometry.setFromPoints([muzzleWorldPos, endPoint]);
            state.trackBeam.material.color.setHex(onTarget ? 0x3ddc84 : 0xffe9a8);
          }
        } else if (state.trackBeam) {
          scene.remove(state.trackBeam);
          state.trackBeam.geometry.dispose();
          state.trackBeam.material.dispose();
          state.trackBeam = null;
        }
      } else if (state.trackBeam) {
        scene.remove(state.trackBeam);
        state.trackBeam.geometry.dispose();
        state.trackBeam.material.dispose();
        state.trackBeam = null;
      }

      state.tracers = state.tracers.filter((tracer) => {
        const age = now - tracer.createdAt;
        if (age > TRACER_LIFETIME_MS) {
          scene.remove(tracer.mesh);
          tracer.mesh.geometry.dispose();
          tracer.mesh.material.dispose();
          return false;
        }
        tracer.mesh.material.opacity = 1 - age / TRACER_LIFETIME_MS;
        return true;
      });

      state.sparks = state.sparks.filter((spark) => {
        const age = now - spark.createdAt;
        if (age > 160) {
          scene.remove(spark.mesh);
          spark.mesh.material.dispose();
          return false;
        }
        spark.mesh.material.opacity = 1 - age / 160;
        spark.mesh.scale.setScalar(0.35 + (age / 160) * 0.5);
        return true;
      });

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      const aspect = window.innerWidth / window.innerHeight;
      camera.aspect = aspect;
      camera.fov = horizontalToVerticalFov(configRef.current.fov, aspect);
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      stateRef.current.audioCtx?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (phaseRef.current !== 'running') return;
      const { camera, euler } = stateRef.current;
      if (!camera) return;
      const sens = configRef.current.sens;
      euler.y -= e.movementX * sens * VALORANT_YAW * DEG_TO_RAD;
      euler.x -= e.movementY * sens * VALORANT_YAW * DEG_TO_RAD;
      euler.x = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, euler.x));
      camera.quaternion.setFromEuler(euler);
    };

    const handleClick = () => {
      if (phaseRef.current !== 'running') return;
      const state = stateRef.current;
      const { camera } = state;
      if (!camera) return;

      if (MODES[configRef.current.mode]?.holdTracking) {
        state.isTrackingHeld = true;
        state.lastTrackSample = 0;
        return;
      }

      if (MODES[configRef.current.mode]?.passiveTrack) return;

      const { targets, raycaster, center, muzzleTip, scene, impactTexture } = state;
      raycaster.setFromCamera(center, camera);
      const meshes = targets.filter((entry) => entry.mesh.visible).map((entry) => entry.mesh);
      const intersections = raycaster.intersectObjects(meshes);
      const hitMesh = intersections[0]?.object ?? null;

      const muzzleWorldPos = new THREE.Vector3();
      muzzleTip.getWorldPosition(muzzleWorldPos);
      const endPoint = hitMesh
        ? intersections[0].point
        : camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(30).add(camera.position);

      const tracerMesh = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([muzzleWorldPos, endPoint]),
        new THREE.LineBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 1 }),
      );
      scene.add(tracerMesh);
      state.tracers.push({ mesh: tracerMesh, createdAt: performance.now() });

      state.flashUntil = performance.now() + MUZZLE_FLASH_LIFETIME_MS;
      if (state.fireAction) {
        state.fireAction.stop();
        state.fireAction.play();
      }
      state.audioCtx.resume();
      playGunshot(state.audioCtx);

      const spark = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: impactTexture,
          transparent: true,
          depthTest: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      spark.position.copy(endPoint);
      spark.scale.setScalar(0.35);
      scene.add(spark);
      state.sparks.push({ mesh: spark, createdAt: performance.now() });

      if (hitMesh) {
        playTargetPop(state.audioCtx);
        const entry = targets.find((tgt) => tgt.mesh === hitMesh);
        const mode = MODES[configRef.current.mode] ?? MODES.flick;
        if (mode.movement === 'peek') {
          const reactionMs = performance.now() - (entry.peek.exposedAt ?? entry.spawnedAt);
          entry.peek.hitThisExposure = true;
          entry.peek = state.initPeekState(entry, performance.now());
          entry.mesh.visible = false;
          entry.body.visible = false;
          entry.spawnedAt = performance.now();
          entry.poppedAt = performance.now();
          setStats((prev) => ({ ...prev, hits: prev.hits + 1, times: [...prev.times, reactionMs] }));
        } else if (mode.movement === 'switch') {
          if (entry.order === state.switchNext) {
            state.switchNext += 1;
            setStats((prev) => ({ ...prev, hits: prev.hits + 1 }));
            if (state.switchNext > targets.length) {
              state.reshuffleSwitch(targets, configRef.current);
              state.switchNext = 1;
            }
          } else {
            setStats((prev) => ({ ...prev, misses: prev.misses + 1 }));
          }
        } else if (mode.movement === 'snap') {
          if (entry.snapArmedAt === null) entry.snapArmedAt = performance.now();
        } else {
          const remaining = mode.hitsRequired ? (entry.hitsRemaining ?? mode.hitsRequired) - 1 : 0;
          if (mode.hitsRequired && remaining > 0) {
            entry.hitsRemaining = remaining;
            entry.poppedAt = performance.now();
            setStats((prev) => ({ ...prev, hits: prev.hits + 1 }));
          } else {
            const reactionMs = performance.now() - entry.spawnedAt;
            entry.mesh.position.copy(
              pickNonOverlappingPosition(configRef.current.spread, configRef.current.targetSize, targets, entry),
            );
            entry.anchor.copy(entry.mesh.position);
            Object.assign(entry, state.makeMotion(mode));
            entry.hitsRemaining = mode.hitsRequired ?? null;
            entry.spawnedAt = performance.now();
            entry.poppedAt = performance.now();
            setStats((prev) => ({ ...prev, hits: prev.hits + 1, times: [...prev.times, reactionMs] }));
          }
        }
      } else {
        setStats((prev) => ({ ...prev, misses: prev.misses + 1 }));
      }
    };

    const handleRelease = () => {
      const state = stateRef.current;
      if (!state.isTrackingHeld) return;
      state.isTrackingHeld = false;
      if (state.trackBeam) {
        state.scene.remove(state.trackBeam);
        state.trackBeam.geometry.dispose();
        state.trackBeam.material.dispose();
        state.trackBeam = null;
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('mouseup', handleRelease);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('mouseup', handleRelease);
    };
  }, []);

  useEffect(() => {
    if (phase !== 'running') return undefined;
    if (timeLeft <= 0) {
      stateRef.current.sessionEnded = true;
      clearTrackingHold();
      setPhase('done');
      document.exitPointerLock?.();
      return undefined;
    }
    const id = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, timeLeft]);

  const lockPointer = (onLocked) => {
    const canvas = mountRef.current?.querySelector('canvas');
    if (!canvas) return;
    const result = canvas.requestPointerLock({ unadjustedMovement: true });
    result
      ?.then(() => {
        debug('[aim-trainer] pointer lock : unadjustedMovement actif');
        setRawInputActive(true);
        onLocked?.();
      })
      .catch((err) => {
        debug('[aim-trainer] pointer lock : unadjustedMovement refusé, repli sans :', err?.message ?? err);
        setRawInputActive(false);
        const fallback = canvas.requestPointerLock();
        fallback
          ?.then(() => onLocked?.())
          .catch((fallbackErr) => {
            debug('[aim-trainer] pointer lock : repli aussi refusé :', fallbackErr?.message ?? fallbackErr);
          });
      });
  };

  const clearTrackingHold = () => {
    const state = stateRef.current;
    state.isTrackingHeld = false;
    if (state.trackBeam) {
      state.scene.remove(state.trackBeam);
      state.trackBeam.geometry.dispose();
      state.trackBeam.material.dispose();
      state.trackBeam = null;
    }
  };

  useEffect(() => {
    const handleLockChange = () => {
      const isLocked = !!document.pointerLockElement;
      setLocked(isLocked);
      if (!isLocked && phaseRef.current === 'running' && !stateRef.current.sessionEnded) {
        clearTrackingHold();
        setPhase('paused');
      }
    };
    document.addEventListener('pointerlockchange', handleLockChange);
    return () => document.removeEventListener('pointerlockchange', handleLockChange);
  }, []);

  const savedForSessionRef = useRef(false);
  const [saveState, setSaveState] = useState(null);

  const startSession = () => {
    setStats({ hits: 0, misses: 0, times: [] });
    setTimeLeft(config.duration);
    stateRef.current.sessionEnded = false;
    clearTrackingHold();
    const now = performance.now();
    const mode = MODES[config.mode] ?? MODES.flick;
    stateRef.current.targets?.forEach((entry) => {
      resetTargetForMode(entry, mode, config, now, stateRef.current);
    });
    if (mode.movement === 'switch') {
      stateRef.current.reshuffleSwitch(stateRef.current.targets, config);
      stateRef.current.switchNext = 1;
    }
    lockPointer(() => setPhase('running'));
  };

  const nextStep = () => {
    setStep((s) => s + 1);
    setStats({ hits: 0, misses: 0, times: [] });
    stateRef.current.sessionEnded = false;
    clearTrackingHold();
    const now = performance.now();

    if (playlistSteps) {
      const nextConfig = playlistSteps[step + 1];
      setTimeLeft(nextConfig.duration);
      const mode = { movement: 'none', lifetime: null };
      stateRef.current.targets?.forEach((entry) => {
        resetTargetForMode(entry, mode, nextConfig, now, stateRef.current);
      });
      lockPointer(() => setPhase('running'));
      return;
    }

    const nextMode = playlist[step + 1];
    setTimeLeft(config.duration);
    const mode = MODES[nextMode] ?? MODES.flick;
    stateRef.current.targets?.forEach((entry) => {
      resetTargetForMode(entry, mode, mode.preset, now, stateRef.current);
    });
    if (mode.movement === 'switch') {
      stateRef.current.reshuffleSwitch(stateRef.current.targets, mode.preset);
      stateRef.current.switchNext = 1;
    }
    lockPointer(() => setPhase('running'));
  };

  const resumeSession = () => {
    lockPointer(() => setPhase('running'));
  };

  const total = stats.hits + stats.misses;
  const accuracy = total > 0 ? (stats.hits / total) * 100 : null;
  const avgReaction = stats.times.length > 0 ? stats.times.reduce((a, b) => a + b, 0) / stats.times.length : null;
  const bestReaction = stats.times.length > 0 ? Math.min(...stats.times) : null;
  const hitsPerSecond = config.duration > 0 ? stats.hits / config.duration : 0;

  const score = (MODES[config.mode]?.holdTracking || MODES[config.mode]?.passiveTrack)
    ? (accuracy === null ? null : avgReaction === null ? Math.round(accuracy) : Math.round(accuracy * 0.7 + Math.max(0, 100 - avgReaction / 10) * 0.3))
    : (total > 0 ? stats.hits : null);

  useEffect(() => {
    if (phase !== 'done') {
      savedForSessionRef.current = false;
      setSaveState(null);
      return;
    }
    if (savedForSessionRef.current || score === null) return;
    savedForSessionRef.current = true;
    setSaveState('saving');
    saveScore(config.userId, {
      mode: config.mode,
      score,
      accuracy,
      hits: stats.hits,
      misses: stats.misses,
      duration: config.duration,
      avgReaction: avgReaction === null ? null : Math.round(avgReaction),
      challengeDate: config.challengeDate ?? null,
      dpi: config.dpi,
      sens: config.sens,
    }).then((result) => setSaveState(result.ok ? 'saved' : 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, score]);

  return (
    <div className="aim-game">
      <div ref={mountRef} className="aim-game-canvas" />

      {phase === 'running' && locked && (
        <>
          {config.crosshairCode ? (
            <CrosshairPreview
              code={config.crosshairCode}
              bare
              size={64}
              className="aim-trainer-crosshair-custom"
            />
          ) : (
            <div className="aim-trainer-crosshair" />
          )}
          <div className="aim-game-hud">
            <div className="aim-game-hud-item">
              <span className="aim-game-hud-value">{timeLeft}</span>
              <span className="aim-game-hud-label">secondes</span>
            </div>
            <div className="aim-game-hud-item">
              <span className="aim-game-hud-value">{stats.hits}</span>
              <span className="aim-game-hud-label">touchées</span>
            </div>
            <div className="aim-game-hud-item">
              <span className="aim-game-hud-value">{accuracy === null ? '–' : `${accuracy.toFixed(0)}%`}</span>
              <span className="aim-game-hud-label">précision</span>
            </div>
          </div>
        </>
      )}

      {phase !== 'running' && (
        <div className="aim-game-overlay">
          <div className="aim-game-panel">
            {phase === 'ready' && (
              <>
                <h1>
                  <Icon icon={MODES[config.mode]?.icon} style={{ color: MODES[config.mode]?.accent }} /> Prêt ?
                  {playlist && (
                    <span className="aim-game-step">
                      {' '}
                      · Routine {step + 1}/{playlist.length}
                    </span>
                  )}
                  {playlistSteps && (
                    <span className="aim-game-step">
                      {' '}
                      · Playlist {step + 1}/{playlistSteps.length}
                      {activeStepConfig?.name ? ` · ${activeStepConfig.name}` : ''}
                    </span>
                  )}
                </h1>
                <p>
                  Sensibilité <strong>{config.sens}</strong> · {config.dpi} DPI · {config.duration} secondes
                </p>
                {config.challengeDate && <p className="aim-game-tip"><Icon icon={Trophy} size={16} /> Défi du jour : score comptabilisé au classement</p>}
                {MODES[config.mode]?.holdTracking && (
                  <p className="aim-game-tip"><Icon icon={Waves} size={16} /> Maintiens le clic enfoncé et garde le viseur sur la cible en mouvement.</p>
                )}
                {MODES[config.mode]?.passiveTrack && (
                  <p className="aim-game-tip"><Icon icon={Footprints} size={16} /> Pas de tir ici : garde simplement le viseur sur la cible le plus longtemps possible.</p>
                )}
                {MODES[config.mode]?.movement === 'switch' && (
                  <p className="aim-game-tip"><Icon icon={Shuffle} size={16} /> Touche les cibles dans l'ordre affiché. Une erreur d'ordre compte comme un raté.</p>
                )}
                {MODES[config.mode]?.movement === 'snap' && (
                  <p className="aim-game-tip"><Icon icon={Hourglass} size={16} /> Un flick ne suffit pas : reste stabilisé sur la cible un instant pour que le tir compte.</p>
                )}

                <div className="aim-game-controls">
                  <span>
                    <kbd>Souris</kbd> viser
                  </span>
                  {!MODES[config.mode]?.passiveTrack && (
                    <span>
                      <kbd>{MODES[config.mode]?.holdTracking ? 'Clic maintenu' : 'Clic gauche'}</kbd>{' '}
                      {MODES[config.mode]?.holdTracking ? 'suivre' : 'tirer'}
                    </span>
                  )}
                  <span>
                    <kbd>Échap</kbd> pause
                  </span>
                </div>
                <Button variant="primary" className="refresh aim-game-cta" onClick={startSession}>
                  <Icon icon={Play} size={16} /> Démarrer
                </Button>
                <p className="aim-game-tip">Échap pour mettre en pause · la fenêtre se ferme avec le bouton ci-dessous</p>
                {rawInputActive !== null && (
                  <p className="aim-game-tip">
                    <Icon icon={MousePointerClick} size={16} /> Entrée souris brute : {rawInputActive ? 'active' : 'non disponible sur cette machine'}
                  </p>
                )}
              </>
            )}

            {phase === 'paused' && (
              <>
                <h1>Pause</h1>
                <p>Il te reste {timeLeft} secondes.</p>
                <Button variant="primary" className="refresh aim-game-cta" onClick={resumeSession}>
                  <Icon icon={Play} size={16} /> Reprendre
                </Button>
                {!config.challengeDate && (
                  <Button variant="ghost" className="account-forgot-password" onClick={startSession}>
                    <Icon icon={RotateCcw} size={16} /> Recommencer
                  </Button>
                )}
              </>
            )}

            {phase === 'done' && (
              <>
                <h1>Session terminée</h1>

                {score !== null && (
                  <div className="aim-game-score">
                    <span className="aim-game-score-value">{score}</span>
                    <span className="aim-game-score-label">Score global</span>
                  </div>
                )}

                <div className="aim-game-results">
                  <div className="aim-game-result">
                    <span className="aim-game-result-value">{accuracy === null ? '–' : `${accuracy.toFixed(1)}%`}</span>
                    <span className="aim-game-result-label">Précision</span>
                  </div>
                  <div className="aim-game-result">
                    <span className="aim-game-result-value aim-game-result-hit">{stats.hits}</span>
                    <span className="aim-game-result-label">Touchées</span>
                  </div>
                  <div className="aim-game-result">
                    <span className="aim-game-result-value aim-game-result-miss">{stats.misses}</span>
                    <span className="aim-game-result-label">Ratées</span>
                  </div>
                  <div className="aim-game-result">
                    <span className="aim-game-result-value">{total}</span>
                    <span className="aim-game-result-label">Tirs au total</span>
                  </div>
                  <div className="aim-game-result">
                    <span className="aim-game-result-value">
                      {avgReaction === null ? '–' : `${avgReaction.toFixed(0)} ms`}
                    </span>
                    <span className="aim-game-result-label">Réaction moyenne</span>
                  </div>
                  <div className="aim-game-result">
                    <span className="aim-game-result-value">
                      {bestReaction === null ? '–' : `${bestReaction.toFixed(0)} ms`}
                    </span>
                    <span className="aim-game-result-label">Meilleure réaction</span>
                  </div>
                  <div className="aim-game-result">
                    <span className="aim-game-result-value">{hitsPerSecond.toFixed(2)}</span>
                    <span className="aim-game-result-label">Cibles / seconde</span>
                  </div>
                  <div className="aim-game-result">
                    <span className="aim-game-result-value">{config.duration}s</span>
                    <span className="aim-game-result-label">Durée</span>
                  </div>
                </div>

                <p className="aim-game-tip">
                  Sensibilité {config.sens} · {config.dpi} DPI · cibles {config.targetSize.toFixed(2)}
                </p>

                {saveState === 'saving' && <p className="aim-game-tip"><Icon icon={Save} size={16} /> Enregistrement du score…</p>}
                {saveState === 'saved' && <p className="aim-game-tip"><Icon icon={CheckCircle2} size={16} /> Score enregistré sur ton compte</p>}
                {saveState === 'error' && (
                  <p className="aim-game-tip aim-game-save-error">
                    <Icon icon={AlertTriangle} size={16} /> Score non enregistré · vérifie ta connexion, le détail est dans la console.
                  </p>
                )}

                {playlist && !isLastStep && (
                  <Button variant="primary" className="refresh aim-game-cta" onClick={nextStep}>
                    <Icon icon={Play} size={16} /> Étape suivante :{' '}
                    <Icon icon={MODES[playlist[step + 1]].icon} style={{ color: MODES[playlist[step + 1]].accent }} />{' '}
                    {playlist[step + 1].charAt(0).toUpperCase() + playlist[step + 1].slice(1)} ({step + 2}/
                    {playlist.length})
                  </Button>
                )}
                {playlistSteps && !isLastStep && (
                  <Button variant="primary" className="refresh aim-game-cta" onClick={nextStep}>
                    <Icon icon={Play} size={16} /> Étape suivante · {playlistSteps[step + 1].name} ({step + 2}/
                    {playlistSteps.length})
                  </Button>
                )}
                {!config.challengeDate && (
                  <Button variant="primary" className="refresh aim-game-cta" onClick={startSession}>
                    <Icon icon={RotateCcw} size={16} /> Recommencer
                  </Button>
                )}
              </>
            )}

            <Button variant="ghost" className="aim-game-close" onClick={() => window.electronAPI.closeAimTrainer()}>
              Fermer la fenêtre
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AimTrainerGame;
