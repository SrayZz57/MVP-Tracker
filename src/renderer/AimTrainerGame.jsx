import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import fpsRifleHandsUrl from '../assets/models/fps-rifle-hands.glb';

// Yaw de Valorant : degrés de rotation par "compte" de mouvement souris, à
// sensibilité 1.0. Officiel, identique à celui utilisé par les vrais
// convertisseurs de sensibilité (cm/360 = 2.54 * 360 / (dpi * sens * yaw)).
const VALORANT_YAW = 0.07;
const DEG_TO_RAD = Math.PI / 180;

const SPAWN_DISTANCE = 9;
const TRACER_LIFETIME_MS = 80;
const MUZZLE_FLASH_LIFETIME_MS = 50;
const POP_DURATION_MS = 130; // apparition/disparition des cibles
const FLOOR_Y = -1.7; // caméra à hauteur 0 => regard à ~1,70 m du sol
const TARGET_MIN_CLEARANCE = 0.6; // marge minimale entre une cible et le sol

export const DEFAULT_CONFIG = {
  dpi: 800,
  sens: 0.35,
  duration: 30,
  targetSize: 0.45,
  targetColor: '#ff4655',
  targetCount: 1,
  spread: 28,
  fov: 103,
  showWeapon: true,
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

// Sol : dalles de béton avec joints marqués et grain, plutôt qu'un aplat.
function makeFloorTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#3b4250';
  ctx.fillRect(0, 0, size, size);

  const noise = valueNoise(size, size, 26, 7);
  const image = ctx.getImageData(0, 0, size, size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const n = (noise(x, y) - 0.5) * 26;
      const i = (y * size + x) * 4;
      image.data[i] += n;
      image.data[i + 1] += n;
      image.data[i + 2] += n;
    }
  }
  ctx.putImageData(image, 0, 0);

  // Joints entre dalles : 4x4 par tuile de texture.
  const tile = size / 4;
  ctx.strokeStyle = 'rgba(18, 21, 28, 0.75)';
  ctx.lineWidth = 3;
  for (let i = 0; i <= 4; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * tile, 0);
    ctx.lineTo(i * tile, size);
    ctx.moveTo(0, i * tile);
    ctx.lineTo(size, i * tile);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(15, 15);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Murs : panneaux verticaux avec rainures et salissures douces.
function makeWallTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const base = ctx.createLinearGradient(0, 0, 0, size);
  base.addColorStop(0, '#5a6377');
  base.addColorStop(1, '#3d4453');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  const noise = valueNoise(size, size, 40, 21);
  const image = ctx.getImageData(0, 0, size, size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const n = (noise(x, y) - 0.5) * 20;
      const i = (y * size + x) * 4;
      image.data[i] += n;
      image.data[i + 1] += n;
      image.data[i + 2] += n;
    }
  }
  ctx.putImageData(image, 0, 0);

  ctx.strokeStyle = 'rgba(24, 28, 36, 0.55)';
  ctx.lineWidth = 4;
  for (let i = 1; i < 4; i += 1) {
    ctx.beginPath();
    ctx.moveTo((i * size) / 4, 0);
    ctx.lineTo((i * size) / 4, size);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 2);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
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
  const config = { ...DEFAULT_CONFIG, ...rawConfig };
  const mountRef = useRef(null);
  const [phase, setPhase] = useState('ready'); // ready | running | done
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
      new THREE.MeshStandardMaterial({ map: makeFloorTexture(), roughness: 0.85, metalness: 0.05 }),
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
    const wallMat = new THREE.MeshStandardMaterial({
      map: makeWallTexture(),
      roughness: 0.9,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
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

    const targets = [];
    for (let i = 0; i < config.targetCount; i += 1) {
      const mesh = new THREE.Mesh(targetGeo, targetMat);
      mesh.position.copy(randomTargetPosition(config.spread, config.targetSize));
      mesh.scale.setScalar(config.targetSize);
      scene.add(mesh);
      targets.push({ mesh, spawnedAt: performance.now(), poppedAt: performance.now() });
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

    // --- Modèle mains + arme (CC0, voir src/assets/models/CREDITS.md) -------
    if (config.showWeapon) {
      new GLTFLoader().load(fpsRifleHandsUrl, (gltf) => {
        const model = gltf.scene;

        // Le modèle vient d'une source externe : sa taille d'origine est
        // inconnue (ici ~10 unités de long, d'où le rendu "à l'intérieur de
        // l'arme"). On le normalise à une taille de viewmodel réaliste au
        // lieu de deviner une échelle en dur.
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

        // Le modèle est déjà orienté canon vers -Z (sa dimension dominante va
        // de Z=-6.5 à Z=+2.7), c'est-à-dire dans la direction où regarde la
        // caméra en Three.js — aucune rotation de retournement à appliquer.
        // Un léger lacet/tangage suffit pour l'angle "viewmodel" classique.
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

      // Petite pulsation des cibles à l'apparition — rend le spawn lisible.
      state.targets.forEach((entry) => {
        const age = now - entry.poppedAt;
        const base = configRef.current.targetSize;
        const scale = age < POP_DURATION_MS ? base * (0.4 + 0.6 * (age / POP_DURATION_MS)) : base;
        entry.mesh.scale.setScalar(scale);
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

  const startSession = () => {
    setStats({ hits: 0, misses: 0, times: [] });
    setTimeLeft(config.duration);
    stateRef.current.sessionEnded = false;
    const now = performance.now();
    stateRef.current.targets?.forEach((entry) => {
      entry.mesh.position.copy(randomTargetPosition(config.spread, config.targetSize));
      entry.spawnedAt = now;
      entry.poppedAt = now;
    });
    // Le verrouillage du pointeur doit être demandé de façon synchrone dans la
    // foulée du clic (exigence de sécurité de Chromium) — pas d'await avant.
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
                <h1>Prêt ?</h1>
                <p>
                  Sensibilité <strong>{config.sens}</strong> · {config.dpi} DPI · {config.duration} secondes
                </p>
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

                <button className="refresh aim-game-cta" onClick={startSession}>
                  🔄 Recommencer
                </button>
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
