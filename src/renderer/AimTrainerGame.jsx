import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { WEAPONS, DEFAULT_WEAPON } from './weapons.js';
import { getWeaponModelUrl } from './weaponModels.js';
import floorColorUrl from '../assets/textures/floor-color.jpg';
import floorNormalUrl from '../assets/textures/floor-normal.jpg';
import floorRoughnessUrl from '../assets/textures/floor-roughness.jpg';
import wallColorUrl from '../assets/textures/wall-color.jpg';
import wallNormalUrl from '../assets/textures/wall-normal.jpg';
import wallRoughnessUrl from '../assets/textures/wall-roughness.jpg';
import { saveScore } from './aimScores.js';

// Yaw de Valorant : degrés de rotation par "compte" de mouvement souris, à
// sensibilité 1.0. Officiel, identique à celui utilisé par les vrais
// convertisseurs de sensibilité (cm/360 = 2.54 * 360 / (dpi * sens * yaw)).
const VALORANT_YAW = 0.07;
const DEG_TO_RAD = Math.PI / 180;

const SPAWN_DISTANCE = 13;
const TRACER_LIFETIME_MS = 80;
const MUZZLE_FLASH_LIFETIME_MS = 50;
const POP_DURATION_MS = 130; // apparition/disparition des cibles
// Caméra à hauteur 0 : le sol plus bas donne un point de vue plus haut et une
// arène qui paraît à l'échelle, au lieu de la sensation "d'être tout petit".
const FLOOR_Y = -2.6;
const TARGET_MIN_CLEARANCE = 0.6; // marge minimale entre une cible et le sol

// Modes d'entraînement. Chacun n'est qu'un préréglage + un comportement de
// cible : le moteur reste le même, ce qui évite de dupliquer la logique de
// tir/score pour chaque mode.
//   movement : 'none' (statique) | 'drift' (translation continue) | 'orbit'
//   lifetime : durée de vie d'une cible en ms (null = illimitée)
export const MODES = {
  flick: {
    icon: '🎯',
    accent: '#ff4655',
    labelKey: 'aimTrainer.modes.flick',
    descKey: 'aimTrainer.modes.flickDesc',
    movement: 'none',
    lifetime: null,
    preset: { targetCount: 1, targetSize: 0.45, spread: 28 },
  },
  gridshot: {
    icon: '🔢',
    accent: '#ffc857',
    labelKey: 'aimTrainer.modes.gridshot',
    descKey: 'aimTrainer.modes.gridshotDesc',
    movement: 'none',
    lifetime: null,
    preset: { targetCount: 4, targetSize: 0.4, spread: 26 },
  },
  tracking: {
    icon: '🌊',
    accent: '#4ec9f5',
    labelKey: 'aimTrainer.modes.tracking',
    descKey: 'aimTrainer.modes.trackingDesc',
    movement: 'drift',
    lifetime: null,
    preset: { targetCount: 1, targetSize: 0.5, spread: 30 },
  },
  reflex: {
    icon: '⚡',
    accent: '#9b7bff',
    labelKey: 'aimTrainer.modes.reflex',
    descKey: 'aimTrainer.modes.reflexDesc',
    movement: 'none',
    lifetime: 1100,
    preset: { targetCount: 1, targetSize: 0.5, spread: 34 },
  },
  micro: {
    icon: '🔬',
    accent: '#3ddc84',
    labelKey: 'aimTrainer.modes.micro',
    descKey: 'aimTrainer.modes.microDesc',
    movement: 'none',
    lifetime: null,
    preset: { targetCount: 1, targetSize: 0.2, spread: 12 },
  },
  orbit: {
    icon: '🪐',
    accent: '#ff8fab',
    labelKey: 'aimTrainer.modes.orbit',
    descKey: 'aimTrainer.modes.orbitDesc',
    movement: 'orbit',
    lifetime: null,
    preset: { targetCount: 2, targetSize: 0.42, spread: 30 },
  },
};

export const DEFAULT_CONFIG = {
  mode: 'flick',
  dpi: 800,
  sens: 0.35,
  duration: 30,
  targetSize: 0.45,
  targetColor: '#ff4655',
  targetCount: 1,
  spread: 28,
  fov: 103,
  showWeapon: true,
  weapon: DEFAULT_WEAPON,
};

// Les FPS (Valorant inclus) expriment le champ de vision à l'HORIZONTALE,
// alors que la caméra de Three.js attend une valeur VERTICALE. Passer 103
// directement donnait un FOV horizontal d'environ 140° en 16:9 : image
// déformée sur les bords et sensation de visée faussée. On convertit donc,
// en tenant compte du ratio réel de la fenêtre.
function horizontalToVerticalFov(hFovDeg, aspect) {
  const hFovRad = hFovDeg * DEG_TO_RAD;
  return (2 * Math.atan(Math.tan(hFovRad / 2) / aspect)) / DEG_TO_RAD;
}

function randomTargetPosition(spreadDeg, targetSize = 0.45) {
  // Cible tirée dans un cône devant la caméra, pas juste sur un plan plat —
  // donne une vraie sensation "sphère de tir" plutôt qu'une grille figée.
  const yaw = (Math.random() * 2 - 1) * spreadDeg * DEG_TO_RAD;
  const pitch = (Math.random() * 2 - 1) * spreadDeg * DEG_TO_RAD * 0.55;
  // Sans garde-fou, un pitch négatif marqué envoie la cible sous le sol
  // (elle s'y enfonce et devient impossible à toucher proprement).
  const minY = FLOOR_Y + targetSize + TARGET_MIN_CLEARANCE;
  return new THREE.Vector3(
    Math.sin(yaw) * Math.cos(pitch) * SPAWN_DISTANCE,
    Math.max(Math.sin(pitch) * SPAWN_DISTANCE, minY),
    -Math.cos(yaw) * Math.cos(pitch) * SPAWN_DISTANCE,
  );
}

// Bruit de valeur lissé, base de toutes les textures procédurales ci-dessous
// (aucune image externe : l'app doit rester autonome et légère).
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

// Textures PBR photographiques (couleur + normales + rugosité), CC0 —
// provenance dans src/assets/textures/CREDITS.md. Bien plus crédibles que
// des motifs dessinés au canvas : le relief des normales réagit vraiment à
// l'éclairage de la scène.
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

// Ciel : dégradé du zénith à l'horizon + nuages issus de plusieurs octaves de
// bruit, appliqué à l'intérieur d'une grande sphère.
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

  // Halo solaire, cohérent avec la direction de la lumière directionnelle.
  const sunGlow = ctx.createRadialGradient(width * 0.72, height * 0.26, 0, width * 0.72, height * 0.26, height * 0.55);
  sunGlow.addColorStop(0, 'rgba(255, 244, 214, 0.95)');
  sunGlow.addColorStop(0.25, 'rgba(255, 232, 186, 0.35)');
  sunGlow.addColorStop(1, 'rgba(255, 232, 186, 0)');
  ctx.fillStyle = sunGlow;
  ctx.fillRect(0, 0, width, height);

  // Nuages : trois octaves de bruit, seuillées puis adoucies.
  const octaves = [
    { noise: valueNoise(width, height, 150, 3), weight: 0.55 },
    { noise: valueNoise(width, height, 70, 11), weight: 0.3 },
    { noise: valueNoise(width, height, 32, 29), weight: 0.15 },
  ];
  const clouds = ctx.createImageData(width, height);
  for (let y = 0; y < height; y += 1) {
    // Les nuages s'estompent vers le zénith et vers l'horizon.
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

// Texture radiale générée en canvas — sert pour le flash de tir et l'impact
// de balle, sans dépendre d'une image externe.
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

function AimTrainerGame({ config: rawConfig }) {
  // Routine d'échauffement : une liste de modes enchaînés dans la même
  // fenêtre. L'étape courante remplace le mode et ses réglages de cibles ;
  // le nombre de cibles reste celui du départ (elles sont créées une seule
  // fois au montage de la scène).
  const playlist = rawConfig?.playlist ?? null;
  const [step, setStep] = useState(0);
  const activeMode = playlist ? playlist[Math.min(step, playlist.length - 1)] : rawConfig?.mode;
  const config = {
    ...DEFAULT_CONFIG,
    ...rawConfig,
    ...(playlist ? { mode: activeMode, targetSize: MODES[activeMode].preset.targetSize, spread: MODES[activeMode].preset.spread } : {}),
  };
  const isLastStep = !playlist || step >= playlist.length - 1;

  const mountRef = useRef(null);
  const [phase, setPhase] = useState('ready'); // ready | running | paused | done
  const [timeLeft, setTimeLeft] = useState(config.duration);
  const [stats, setStats] = useState({ hits: 0, misses: 0, times: [] });
  const [locked, setLocked] = useState(false);

  const stateRef = useRef({});
  const configRef = useRef(config);
  configRef.current = config;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  // Scène Three.js — montée une seule fois, pilotée ensuite via des refs pour
  // ne jamais avoir à la reconstruire (couteux) au fil des re-renders React.
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x9dc2e0);
    // Brouillard léger, teinté comme l'horizon du ciel : fond la limite de
    // l'arène dans le décor au lieu d'une coupure nette.
    scene.fog = new THREE.FogExp2(0xa8cbe8, 0.008);

    const initialAspect = window.innerWidth / window.innerHeight;
    const camera = new THREE.PerspectiveCamera(
      horizontalToVerticalFov(config.fov, initialAspect),
      initialAspect,
      0.05,
      200,
    );
    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    scene.add(camera); // nécessaire pour que les enfants de la caméra (l'arme) soient rendus

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    mount.appendChild(renderer.domElement);

    // --- Éclairage ----------------------------------------------------------
    // Ciel/sol : donne une base lumineuse partout, sans zone totalement noire.
    scene.add(new THREE.HemisphereLight(0xbfd4ff, 0x3a4152, 1.5));
    scene.add(new THREE.AmbientLight(0xffffff, 0.45));

    // "Soleil" principal, chaud et franc, avec sa lumière de contre-jour.
    const sun = new THREE.DirectionalLight(0xfff2dc, 2.6);
    sun.position.set(8, 16, 6);
    scene.add(sun);

    const backLight = new THREE.DirectionalLight(0xa8c4ff, 0.9);
    backLight.position.set(-6, 8, -10);
    scene.add(backLight);

    const accentLeft = new THREE.PointLight(0xff4655, 3.5, 40, 2);
    accentLeft.position.set(-9, 3, -4);
    scene.add(accentLeft);

    const accentRight = new THREE.PointLight(0x4ec9f5, 2.6, 40, 2);
    accentRight.position.set(9, 3, -6);
    scene.add(accentRight);

    // Lumière attachée à la caméra : garde l'arme et les mains lisibles où
    // qu'on vise, sans dépendre de l'orientation du soleil.
    const weaponLight = new THREE.PointLight(0xffffff, 3, 5, 2);
    weaponLight.position.set(0.35, 0.1, 0.3);
    camera.add(weaponLight);

    // --- Ciel ---------------------------------------------------------------
    // Grande sphère texturée vue de l'intérieur : l'arène est à ciel ouvert,
    // donc le ciel est visible au-dessus des murs.
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(120, 40, 24),
      new THREE.MeshBasicMaterial({ map: makeSkyTexture(), side: THREE.BackSide, fog: false, depthWrite: false }),
    );
    scene.add(sky);

    // --- Arène -------------------------------------------------------------
    const arena = new THREE.Group();
    scene.add(arena);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(70, 70),
      loadPbrMaterial(
        { color: floorColorUrl, normal: floorNormalUrl, roughness: floorRoughnessUrl },
        [18, 18],
        { metalness: 0.05 },
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

    // Murs bas et ouverts sur le ciel (pas de plafond), avec un liseré
    // lumineux en crête pour délimiter proprement l'aire de jeu.
    const wallMat = loadPbrMaterial(
      { color: wallColorUrl, normal: wallNormalUrl, roughness: wallRoughnessUrl },
      [8, 2],
      { metalness: 0.45, side: THREE.DoubleSide },
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

    // Bandeaux lumineux verticaux sur le mur du fond : repères de profondeur.
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

    // --- Cibles ------------------------------------------------------------
    const targetGeo = new THREE.SphereGeometry(1, 28, 28); // rayon 1, mis à l'échelle par cible
    const targetMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(config.targetColor),
      emissive: new THREE.Color(config.targetColor),
      emissiveIntensity: 0.35,
      roughness: 0.35,
      metalness: 0.1,
    });

    // Paramètres de mouvement propres à chaque cible (utilisés seulement par
    // les modes mobiles) : direction de dérive, ou angle et rayon d'orbite.
    const makeMotion = () => ({
      drift: new THREE.Vector3(Math.random() * 2 - 1, (Math.random() * 2 - 1) * 0.5, 0)
        .normalize()
        .multiplyScalar(1.6 + Math.random() * 1.6),
      orbitAngle: Math.random() * Math.PI * 2,
      orbitRadius: 2.2 + Math.random() * 2,
      orbitSpeed: (0.6 + Math.random() * 0.7) * (Math.random() < 0.5 ? -1 : 1),
    });

    const targets = [];
    for (let i = 0; i < config.targetCount; i += 1) {
      const mesh = new THREE.Mesh(targetGeo, targetMat);
      mesh.position.copy(randomTargetPosition(config.spread, config.targetSize));
      mesh.scale.setScalar(config.targetSize);
      scene.add(mesh);
      targets.push({
        mesh,
        spawnedAt: performance.now(),
        poppedAt: performance.now(),
        anchor: mesh.position.clone(),
        ...makeMotion(),
      });
    }

    const flashTexture = makeGlowTexture('rgba(255, 210, 130, 0.95)');
    const impactTexture = makeGlowTexture('rgba(255, 245, 220, 0.95)');

    // Origine du canon pour le flash/la traînée — accrochée à la caméra (pas
    // au modèle) pour rester fiable quelle que soit l'échelle du modèle chargé.
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
      raycaster,
      center,
      muzzleTip,
      muzzleFlash,
      impactTexture,
      mixer: null,
      fireAction: null,
      lastFrameTime: performance.now(),
      tracers: [],
      sparks: [],
      flashUntil: 0,
    };

    // --- Modèle d'arme (mains incluses ou non selon l'arme, voir
    // src/renderer/weapons.js + src/assets/models/CREDITS.md pour la
    // provenance et l'attribution de chaque modèle) -------------------------
    if (config.showWeapon) {
      const weaponId = config.weapon in WEAPONS ? config.weapon : DEFAULT_WEAPON;
      const weaponDef = WEAPONS[weaponId];
      const modelUrl = getWeaponModelUrl(weaponId);

      if (!modelUrl) {
        console.warn(`[aim-trainer] modèle introuvable pour l'arme "${weaponId}" — vérifie src/assets/models/`);
      } else {
        new GLTFLoader().load(modelUrl, (gltf) => {
          const model = gltf.scene;

          // Le modèle vient d'une source externe : sa taille d'origine est
          // inconnue, donc normalisée à une taille de viewmodel réaliste
          // plutôt que de deviner une échelle en dur par arme.
          const box = new THREE.Box3().setFromObject(model);
          const size = new THREE.Vector3();
          box.getSize(size);
          const longestSide = Math.max(size.x, size.y, size.z) || 1;
          model.scale.setScalar(0.75 / longestSide);

          // Recentre le modèle sur son propre pivot avant de le placer, sinon
          // l'offset interne du fichier décale tout.
          const center3 = new THREE.Vector3();
          new THREE.Box3().setFromObject(model).getCenter(center3);
          model.position.sub(center3);

          if (weaponDef.flip180) model.rotation.y += Math.PI;

          const holder = new THREE.Group();
          holder.add(model);
          holder.position.set(weaponDef.holderOffset.x, weaponDef.holderOffset.y, weaponDef.holderOffset.z);
          holder.rotation.set(weaponDef.holderRotation.x, weaponDef.holderRotation.y, weaponDef.holderRotation.z);
          camera.add(holder);

          if (weaponDef.animationClip && gltf.animations?.length > 0) {
            const mixer = new THREE.AnimationMixer(model);
            const clip = THREE.AnimationClip.findByName(gltf.animations, weaponDef.animationClip) ?? gltf.animations[0];
            const action = mixer.clipAction(clip);
            action.setLoop(THREE.LoopOnce);
            action.clampWhenFinished = true;
            stateRef.current.mixer = mixer;
            stateRef.current.fireAction = action;
          }
        });
      }
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
        // Pulsation à l'apparition — rend le spawn lisible.
        const age = now - entry.poppedAt;
        const scale = age < POP_DURATION_MS ? cfg.targetSize * (0.4 + 0.6 * (age / POP_DURATION_MS)) : cfg.targetSize;
        entry.mesh.scale.setScalar(scale);

        if (phaseRef.current !== 'running') return;

        if (mode.movement === 'drift') {
          // Translation continue, avec rebond dans les limites du cône de jeu.
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
          // Rotation autour d'un point d'ancrage, dans le plan vertical.
          entry.orbitAngle += entry.orbitSpeed * (dt / 1000);
          const minY = FLOOR_Y + cfg.targetSize + TARGET_MIN_CLEARANCE;
          entry.mesh.position.set(
            entry.anchor.x + Math.cos(entry.orbitAngle) * entry.orbitRadius,
            Math.max(entry.anchor.y + Math.sin(entry.orbitAngle) * entry.orbitRadius * 0.55, minY),
            entry.anchor.z,
          );
        }

        // Mode réflexe : une cible non touchée à temps disparaît et compte
        // comme manquée, pour forcer la réactivité plutôt que la lenteur.
        if (mode.lifetime && now - entry.spawnedAt > mode.lifetime) {
          entry.mesh.position.copy(randomTargetPosition(cfg.spread, cfg.targetSize));
          entry.anchor.copy(entry.mesh.position);
          entry.spawnedAt = now;
          entry.poppedAt = now;
          setStats((prev) => ({ ...prev, misses: prev.misses + 1 }));
        }
      });

      // Traînées de balle : durée de vie très courte, fondu puis suppression.
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
      // Le FOV vertical dépend du ratio : il doit être recalculé à chaque
      // redimensionnement pour que le FOV horizontal reste celui demandé.
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rotation de la caméra à la vraie sensibilité Valorant, pendant que le
  // pointeur est capturé — degrés = mouvement souris × sens × yaw, exactement
  // la formule officielle du jeu.
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
      const { camera, targets, raycaster, center, muzzleTip, scene, impactTexture } = state;
      if (!camera) return;

      raycaster.setFromCamera(center, camera);
      const meshes = targets.map((entry) => entry.mesh);
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
        const entry = targets.find((tgt) => tgt.mesh === hitMesh);
        const reactionMs = performance.now() - entry.spawnedAt;
        entry.mesh.position.copy(randomTargetPosition(configRef.current.spread, configRef.current.targetSize));
        entry.anchor.copy(entry.mesh.position);
        Object.assign(entry, state.makeMotion());
        entry.spawnedAt = performance.now();
        entry.poppedAt = performance.now();
        setStats((prev) => ({ ...prev, hits: prev.hits + 1, times: [...prev.times, reactionMs] }));
      } else {
        setStats((prev) => ({ ...prev, misses: prev.misses + 1 }));
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousedown', handleClick);
    };
  }, []);

  // Décompte de la session, indépendant de la boucle de rendu.
  useEffect(() => {
    if (phase !== 'running') return undefined;
    if (timeLeft <= 0) {
      // Marqué AVANT de relâcher la souris : sinon l'événement
      // `pointerlockchange` qui suit voit encore la phase "running" (React
      // n'a pas re-rendu) et bascule à tort en pause, masquant le résumé.
      stateRef.current.sessionEnded = true;
      setPhase('done');
      document.exitPointerLock?.();
      return undefined;
    }
    const id = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, timeLeft]);

  useEffect(() => {
    const handleLockChange = () => {
      const isLocked = !!document.pointerLockElement;
      setLocked(isLocked);
      // Sortie du verrouillage (Échap) pendant une session : on met en pause
      // plutôt que de laisser le chrono tourner dans le vide. En fin de
      // session, c'est le code lui-même qui relâche la souris : on ne doit
      // pas repasser en pause par-dessus le résumé.
      if (!isLocked && phaseRef.current === 'running' && !stateRef.current.sessionEnded) setPhase('paused');
    };
    document.addEventListener('pointerlockchange', handleLockChange);
    return () => document.removeEventListener('pointerlockchange', handleLockChange);
  }, []);

  const savedForSessionRef = useRef(false);
  const [saveState, setSaveState] = useState(null); // null | saving | saved | error

  const startSession = () => {
    setStats({ hits: 0, misses: 0, times: [] });
    setTimeLeft(config.duration);
    stateRef.current.sessionEnded = false;
    const now = performance.now();
    stateRef.current.targets?.forEach((entry) => {
      entry.mesh.position.copy(randomTargetPosition(config.spread, config.targetSize));
      entry.anchor.copy(entry.mesh.position);
      Object.assign(entry, stateRef.current.makeMotion());
      entry.spawnedAt = now;
      entry.poppedAt = now;
    });
    // Le verrouillage du pointeur doit être demandé de façon synchrone dans la
    // foulée du clic (exigence de sécurité de Chromium) — pas d'await avant.
    mountRef.current?.querySelector('canvas')?.requestPointerLock();
    setPhase('running');
  };

  // Étape suivante de la routine : on change de mode puis on relance dans la
  // foulée (le clic reste le même geste, donc le verrouillage souris passe).
  const nextStep = () => {
    setStep((s) => s + 1);
    setStats({ hits: 0, misses: 0, times: [] });
    const nextMode = playlist[step + 1];
    setTimeLeft(config.duration);
    stateRef.current.sessionEnded = false;
    const now = performance.now();
    stateRef.current.targets?.forEach((entry) => {
      entry.mesh.position.copy(randomTargetPosition(MODES[nextMode].preset.spread, MODES[nextMode].preset.targetSize));
      entry.anchor.copy(entry.mesh.position);
      Object.assign(entry, stateRef.current.makeMotion());
      entry.spawnedAt = now;
      entry.poppedAt = now;
    });
    mountRef.current?.querySelector('canvas')?.requestPointerLock();
    setPhase('running');
  };

  const resumeSession = () => {
    mountRef.current?.querySelector('canvas')?.requestPointerLock();
    setPhase('running');
  };

  const total = stats.hits + stats.misses;
  const accuracy = total > 0 ? (stats.hits / total) * 100 : null;
  const avgReaction = stats.times.length > 0 ? stats.times.reduce((a, b) => a + b, 0) / stats.times.length : null;
  const bestReaction = stats.times.length > 0 ? Math.min(...stats.times) : null;
  const hitsPerSecond = config.duration > 0 ? stats.hits / config.duration : 0;

  // Note globale simple et lisible : la précision compte le plus, la vitesse
  // de réaction module le reste. Sert de repère de progression d'une session
  // à l'autre, pas de classement absolu.
  const score =
    accuracy === null || avgReaction === null
      ? null
      : Math.round(accuracy * 0.7 + Math.max(0, 100 - avgReaction / 10) * 0.3);

  // Enregistre le score une fois la session terminée. Placé après le calcul
  // du score, et protégé par un drapeau pour ne partir qu'une seule fois par
  // session (pas à chaque re-render de l'écran de résultats).
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
    }).then((result) => setSaveState(result.ok ? 'saved' : 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, score]);

  return (
    <div className="aim-game">
      <div ref={mountRef} className="aim-game-canvas" />

      {phase === 'running' && locked && (
        <>
          <div className="aim-trainer-crosshair" />
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
              <span className="aim-game-hud-value">{accuracy === null ? '—' : `${accuracy.toFixed(0)}%`}</span>
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
                  {MODES[config.mode]?.icon} Prêt ?
                  {playlist && (
                    <span className="aim-game-step">
                      {' '}
                      · Routine {step + 1}/{playlist.length}
                    </span>
                  )}
                </h1>
                <p>
                  Sensibilité <strong>{config.sens}</strong> · {config.dpi} DPI · {config.duration} secondes
                </p>
                {config.challengeDate && <p className="aim-game-tip">🏆 Défi du jour — score comptabilisé au classement</p>}

                <div className="aim-game-controls">
                  <span>
                    <kbd>Souris</kbd> viser
                  </span>
                  <span>
                    <kbd>Clic gauche</kbd> tirer
                  </span>
                  <span>
                    <kbd>Échap</kbd> pause
                  </span>
                </div>
                <button className="refresh aim-game-cta" onClick={startSession}>
                  ▶️ Démarrer
                </button>
                <p className="aim-game-tip">Échap pour mettre en pause · la fenêtre se ferme avec le bouton ci-dessous</p>
              </>
            )}

            {phase === 'paused' && (
              <>
                <h1>Pause</h1>
                <p>Il te reste {timeLeft} secondes.</p>
                <button className="refresh aim-game-cta" onClick={resumeSession}>
                  ▶️ Reprendre
                </button>
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
                    <span className="aim-game-result-value">{accuracy === null ? '—' : `${accuracy.toFixed(1)}%`}</span>
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
                      {avgReaction === null ? '—' : `${avgReaction.toFixed(0)} ms`}
                    </span>
                    <span className="aim-game-result-label">Réaction moyenne</span>
                  </div>
                  <div className="aim-game-result">
                    <span className="aim-game-result-value">
                      {bestReaction === null ? '—' : `${bestReaction.toFixed(0)} ms`}
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

                {saveState === 'saving' && <p className="aim-game-tip">💾 Enregistrement du score…</p>}
                {saveState === 'saved' && <p className="aim-game-tip">✅ Score enregistré sur ton compte</p>}
                {saveState === 'error' && (
                  <p className="aim-game-tip aim-game-save-error">
                    ⚠️ Score non enregistré — vérifie ta connexion, le détail est dans la console.
                  </p>
                )}

                {playlist && !isLastStep ? (
                  <button className="refresh aim-game-cta" onClick={nextStep}>
                    ▶️ Étape suivante — {MODES[playlist[step + 1]].icon}{' '}
                    {playlist[step + 1].charAt(0).toUpperCase() + playlist[step + 1].slice(1)} ({step + 2}/
                    {playlist.length})
                  </button>
                ) : (
                  <button className="refresh aim-game-cta" onClick={startSession}>
                    🔄 Recommencer
                  </button>
                )}
              </>
            )}

            <button className="aim-game-close" onClick={() => window.electronAPI.closeAimTrainer()}>
              Fermer la fenêtre
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AimTrainerGame;
