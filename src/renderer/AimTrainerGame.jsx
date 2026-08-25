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

function randomTargetPosition(spreadDeg) {
  // Cible tirée dans un cône devant la caméra, pas juste sur un plan plat —
  // donne une vraie sensation "sphère de tir" plutôt qu'une grille figée.
  const yaw = (Math.random() * 2 - 1) * spreadDeg * DEG_TO_RAD;
  const pitch = (Math.random() * 2 - 1) * spreadDeg * DEG_TO_RAD * 0.55;
  return new THREE.Vector3(
    Math.sin(yaw) * Math.cos(pitch) * SPAWN_DISTANCE,
    Math.sin(pitch) * SPAWN_DISTANCE,
    -Math.cos(yaw) * Math.cos(pitch) * SPAWN_DISTANCE,
  );
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
    scene.background = new THREE.Color(0x0b0d12);
    scene.fog = new THREE.FogExp2(0x0b0d12, 0.022);

    const camera = new THREE.PerspectiveCamera(config.fov, mount.clientWidth / mount.clientHeight, 0.05, 200);
    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    scene.add(camera); // nécessaire pour que les enfants de la caméra (l'arme) soient rendus

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    mount.appendChild(renderer.domElement);

    // --- Éclairage : ambiance froide + accents rouges façon Valorant --------
    scene.add(new THREE.HemisphereLight(0x9fb4ff, 0x14161c, 0.55));

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
    keyLight.position.set(4, 9, 3);
    scene.add(keyLight);

    const accentLeft = new THREE.PointLight(0xff4655, 2.2, 34, 2);
    accentLeft.position.set(-9, 2.5, -4);
    scene.add(accentLeft);

    const accentRight = new THREE.PointLight(0x4ec9f5, 1.6, 34, 2);
    accentRight.position.set(9, 2.5, -6);
    scene.add(accentRight);

    // Lumière attachée à la caméra : garde l'arme lisible où qu'on vise.
    const weaponLight = new THREE.PointLight(0xffffff, 1.4, 4, 2);
    weaponLight.position.set(0.3, -0.1, 0.2);
    camera.add(weaponLight);

    // --- Arène -------------------------------------------------------------
    const arena = new THREE.Group();
    scene.add(arena);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshStandardMaterial({ color: 0x161922, roughness: 0.75, metalness: 0.15 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -4;
    arena.add(floor);

    const grid = new THREE.GridHelper(60, 60, 0xff4655, 0x2a3040);
    grid.position.y = -3.99;
    grid.material.opacity = 0.32;
    grid.material.transparent = true;
    arena.add(grid);

    const walls = new THREE.Mesh(
      new THREE.BoxGeometry(44, 22, 44),
      new THREE.MeshStandardMaterial({ color: 0x1b1f29, roughness: 0.9, metalness: 0.05, side: THREE.BackSide }),
    );
    walls.position.y = 7;
    arena.add(walls);

    // Bandeaux lumineux sur le mur du fond : donne de la profondeur et une
    // vraie identité visuelle plutôt qu'un fond noir plat.
    [-6.5, 0, 6.5].forEach((x, i) => {
      const strip = new THREE.Mesh(
        new THREE.PlaneGeometry(0.35, 13),
        new THREE.MeshBasicMaterial({
          color: i === 1 ? 0xff4655 : 0x3a4358,
          transparent: true,
          opacity: i === 1 ? 0.55 : 0.32,
        }),
      );
      strip.position.set(x, 2.5, -17.8);
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
      mesh.position.copy(randomTargetPosition(config.spread));
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
        model.scale.setScalar(0.55 / longestSide);

        // Recentre le modèle sur son propre pivot avant de le placer, sinon
        // l'offset interne du fichier décale tout.
        const center3 = new THREE.Vector3();
        new THREE.Box3().setFromObject(model).getCenter(center3);
        model.position.sub(center3);

        const holder = new THREE.Group();
        holder.add(model);
        holder.position.set(0.26, -0.24, -0.6);
        holder.rotation.set(0, Math.PI, 0); // face à la caméra, canon vers l'avant
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
      camera.aspect = window.innerWidth / window.innerHeight;
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
        entry.mesh.position.copy(randomTargetPosition(configRef.current.spread));
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
      // plutôt que de laisser le chrono tourner dans le vide.
      if (!isLocked && phaseRef.current === 'running') setPhase('paused');
    };
    document.addEventListener('pointerlockchange', handleLockChange);
    return () => document.removeEventListener('pointerlockchange', handleLockChange);
  }, []);

  const startSession = () => {
    setStats({ hits: 0, misses: 0, times: [] });
    setTimeLeft(config.duration);
    const now = performance.now();
    stateRef.current.targets?.forEach((entry) => {
      entry.mesh.position.copy(randomTargetPosition(config.spread));
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
  const hitsPerSecond = config.duration > 0 ? stats.hits / config.duration : 0;

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
                <div className="aim-game-results">
                  <div className="aim-game-result">
                    <span className="aim-game-result-value">{stats.hits}</span>
                    <span className="aim-game-result-label">Cibles touchées</span>
                  </div>
                  <div className="aim-game-result">
                    <span className="aim-game-result-value">{accuracy === null ? '—' : `${accuracy.toFixed(0)}%`}</span>
                    <span className="aim-game-result-label">Précision</span>
                  </div>
                  <div className="aim-game-result">
                    <span className="aim-game-result-value">
                      {avgReaction === null ? '—' : `${avgReaction.toFixed(0)}`}
                    </span>
                    <span className="aim-game-result-label">Réaction moy. (ms)</span>
                  </div>
                  <div className="aim-game-result">
                    <span className="aim-game-result-value">{hitsPerSecond.toFixed(1)}</span>
                    <span className="aim-game-result-label">Cibles / seconde</span>
                  </div>
                </div>
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
