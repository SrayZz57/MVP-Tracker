import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import fpsRifleHandsUrl from '../assets/models/fps-rifle-hands.glb';

// Yaw de Valorant : degrés de rotation par "compte" de mouvement souris, à
// sensibilité 1.0. Officiel, identique à celui utilisé par les vrais
// convertisseurs de sensibilité (cm/360 = 2.54 * 360 / (dpi * sens * yaw)).
const VALORANT_YAW = 0.07;
const DEG_TO_RAD = Math.PI / 180;

const SESSION_SECONDS = 30;
const TARGET_RADIUS = 0.45;
const SPAWN_DISTANCE = 8;
const SPAWN_HALF_ANGLE_DEG = 28; // étendue où les cibles peuvent apparaître, autour du centre
const TRACER_LIFETIME_MS = 90;
const MUZZLE_FLASH_LIFETIME_MS = 55;

const SETTINGS_STORAGE_KEY = 'mvptracker-aim-trainer-settings';

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { dpi: 800, sens: 0.35 };
    return { dpi: 800, sens: 0.35, ...JSON.parse(raw) };
  } catch {
    return { dpi: 800, sens: 0.35 };
  }
}

function randomTargetPosition() {
  // Cible tirée dans un cône devant la caméra, pas juste sur un plan plat —
  // donne une vraie sensation "sphère de tir" plutôt qu'une grille figée.
  const yaw = (Math.random() * 2 - 1) * SPAWN_HALF_ANGLE_DEG * DEG_TO_RAD;
  const pitch = (Math.random() * 2 - 1) * SPAWN_HALF_ANGLE_DEG * DEG_TO_RAD * 0.6;
  const x = Math.sin(yaw) * Math.cos(pitch) * SPAWN_DISTANCE;
  const y = Math.sin(pitch) * SPAWN_DISTANCE;
  const z = -Math.cos(yaw) * Math.cos(pitch) * SPAWN_DISTANCE;
  return new THREE.Vector3(x, y, z);
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

function AimTrainer() {
  const { t } = useTranslation();
  const mountRef = useRef(null);
  const [settings, setSettings] = useState(loadSettings);
  const [phase, setPhase] = useState('idle'); // idle | running | done
  const [timeLeft, setTimeLeft] = useState(SESSION_SECONDS);
  const [stats, setStats] = useState({ hits: 0, misses: 0, times: [] });
  const [locked, setLocked] = useState(false);

  const stateRef = useRef({});

  useEffect(() => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  // Scène Three.js — montée une seule fois, pilotée ensuite via des refs pour
  // ne jamais avoir à la reconstruire (couteux) au fil des re-renders React.
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0c10);
    scene.fog = new THREE.Fog(0x0a0c10, 14, 30);

    const camera = new THREE.PerspectiveCamera(103, mount.clientWidth / mount.clientHeight, 0.1, 100);
    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    scene.add(camera); // nécessaire pour que les enfants de la caméra (l'arme) soient rendus

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(3, 6, 4);
    scene.add(dirLight);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.35);
    fillLight.position.set(-2, 1, -2);
    camera.add(fillLight); // éclaire l'arme quel que soit l'endroit visé

    // Petite salle simple : sol quadrillé + murs sombres, juste assez de 3D
    // pour donner un vrai repère de profondeur sans distraire des cibles.
    const grid = new THREE.GridHelper(40, 40, 0xff4655, 0x232833);
    grid.position.y = -4;
    scene.add(grid);
    const roomGeo = new THREE.BoxGeometry(30, 16, 30);
    const roomMat = new THREE.MeshStandardMaterial({ color: 0x12151d, side: THREE.BackSide });
    scene.add(new THREE.Mesh(roomGeo, roomMat));

    const targetGeo = new THREE.SphereGeometry(TARGET_RADIUS, 24, 24);
    const targetMat = new THREE.MeshStandardMaterial({ color: 0xff4655, emissive: 0x330006, roughness: 0.4 });
    const target = new THREE.Mesh(targetGeo, targetMat);
    target.position.copy(randomTargetPosition());
    scene.add(target);

    // Point d'origine du canon pour le flash/la traînée de balle — accroché
    // directement à la caméra (pas au modèle chargé) pour rester fiable même
    // si le modèle a une échelle/un pivot différent de ce qu'on attend.
    const muzzleTip = new THREE.Object3D();
    muzzleTip.position.set(0.18, -0.16, -0.35);
    camera.add(muzzleTip);

    const flashTexture = makeGlowTexture('rgba(255, 200, 80, 0.95)');
    const flashMaterial = new THREE.SpriteMaterial({
      map: flashTexture,
      transparent: true,
      opacity: 0,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });
    const muzzleFlash = new THREE.Sprite(flashMaterial);
    muzzleFlash.scale.set(0.35, 0.35, 1);
    muzzleTip.add(muzzleFlash);

    const impactTexture = makeGlowTexture('rgba(255, 90, 90, 0.9)');

    const raycaster = new THREE.Raycaster();
    const center = new THREE.Vector2(0, 0);

    stateRef.current = {
      scene,
      camera,
      renderer,
      euler,
      target,
      raycaster,
      center,
      spawnedAt: performance.now(),
      muzzleTip,
      muzzleFlash,
      impactTexture,
      mixer: null,
      fireAction: null,
      lastFrameTime: performance.now(),
      tracers: [],
      flashUntil: 0,
    };

    // Modèle réel (mains + arme + animation de tir), chargement asynchrone —
    // CC0, voir src/assets/models/CREDITS.md pour la provenance.
    new GLTFLoader().load(fpsRifleHandsUrl, (gltf) => {
      const model = gltf.scene;
      model.position.set(0.15, -0.35, -0.5);
      camera.add(model);

      if (gltf.animations?.length > 0) {
        const mixer = new THREE.AnimationMixer(model);
        const fireClip = THREE.AnimationClip.findByName(gltf.animations, 'fire') ?? gltf.animations[0];
        const fireAction = mixer.clipAction(fireClip);
        fireAction.setLoop(THREE.LoopOnce);
        fireAction.clampWhenFinished = true;
        stateRef.current.mixer = mixer;
        stateRef.current.fireAction = fireAction;
      }
    });

    let frameId;
    const animate = () => {
      const state = stateRef.current;
      const now = performance.now();
      const dt = now - state.lastFrameTime;
      state.lastFrameTime = now;

      state.mixer?.update(dt / 1000);
      muzzleFlash.material.opacity = now < state.flashUntil ? 1 : 0;

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

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rotation de la caméra à la vraie sensibilité Valorant, pendant que le
  // pointeur est capturé (Pointer Lock) — degrés = mouvement souris × sens ×
  // yaw, exactement la formule officielle du jeu.
  useEffect(() => {
    if (phase !== 'running') return undefined;

    const handleMouseMove = (e) => {
      const { camera, euler } = stateRef.current;
      if (!camera) return;
      const degX = e.movementX * settings.sens * VALORANT_YAW;
      const degY = e.movementY * settings.sens * VALORANT_YAW;
      euler.y -= degX * DEG_TO_RAD;
      euler.x -= degY * DEG_TO_RAD;
      euler.x = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, euler.x));
      camera.quaternion.setFromEuler(euler);
    };

    const handleClick = () => {
      const state = stateRef.current;
      const { camera, target, raycaster, center, spawnedAt, muzzleTip, scene, impactTexture } = state;
      if (!camera || !target) return;

      raycaster.setFromCamera(center, camera);
      const intersections = raycaster.intersectObject(target);
      const hit = intersections.length > 0;

      const muzzleWorldPos = new THREE.Vector3();
      muzzleTip.getWorldPosition(muzzleWorldPos);
      const endPoint = hit
        ? intersections[0].point
        : camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(20).add(camera.position);

      // Traînée de balle : un fin trait lumineux du canon jusqu'à l'impact.
      const tracerGeo = new THREE.BufferGeometry().setFromPoints([muzzleWorldPos, endPoint]);
      const tracerMat = new THREE.LineBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 1 });
      const tracerMesh = new THREE.Line(tracerGeo, tracerMat);
      scene.add(tracerMesh);
      state.tracers.push({ mesh: tracerMesh, createdAt: performance.now() });

      // Flash au canon + vraie animation de tir du modèle (recul inclus).
      state.flashUntil = performance.now() + MUZZLE_FLASH_LIFETIME_MS;
      if (state.fireAction) {
        state.fireAction.stop();
        state.fireAction.play();
      }

      if (hit) {
        // Petite étincelle d'impact sur la cible touchée.
        const sparkMat = new THREE.SpriteMaterial({
          map: impactTexture,
          transparent: true,
          depthTest: false,
          blending: THREE.AdditiveBlending,
        });
        const spark = new THREE.Sprite(sparkMat);
        spark.position.copy(endPoint);
        spark.scale.set(0.5, 0.5, 1);
        scene.add(spark);
        setTimeout(() => {
          scene.remove(spark);
          sparkMat.dispose();
        }, 120);

        const reactionMs = performance.now() - spawnedAt;
        target.position.copy(randomTargetPosition());
        state.spawnedAt = performance.now();
        setStats((prev) => ({ ...prev, hits: prev.hits + 1, times: [...prev.times, reactionMs] }));
      } else {
        setStats((prev) => ({ ...prev, misses: prev.misses + 1 }));
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClick);
    };
  }, [phase, settings.sens]);

  // Décompte de la session, indépendant de la boucle de rendu.
  useEffect(() => {
    if (phase !== 'running') return undefined;
    if (timeLeft <= 0) {
      setPhase('done');
      document.exitPointerLock?.();
      window.electronAPI.setFullScreen(false);
      return undefined;
    }
    const id = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, timeLeft]);

  useEffect(() => {
    const handleLockChange = () => {
      const isLocked = document.pointerLockElement === mountRef.current?.querySelector('canvas');
      setLocked(isLocked);
      if (!isLocked && phase === 'running') {
        // Le joueur a quitté le verrouillage pointeur (Échap) — on met la
        // session en pause plutôt que de continuer à décompter dans le vide.
        setPhase('idle');
        window.electronAPI.setFullScreen(false);
      }
    };
    document.addEventListener('pointerlockchange', handleLockChange);
    return () => document.removeEventListener('pointerlockchange', handleLockChange);
  }, [phase]);

  const handleStart = () => {
    setStats({ hits: 0, misses: 0, times: [] });
    setTimeLeft(SESSION_SECONDS);
    if (stateRef.current.target) {
      stateRef.current.target.position.copy(randomTargetPosition());
      stateRef.current.spawnedAt = performance.now();
    }
    // Le verrouillage du pointeur doit être demandé de façon synchrone, dans
    // la foulée immédiate du clic (exigence de sécurité de Chromium) — un
    // `await` avant cet appel le fait échouer silencieusement. Le plein
    // écran, lui, peut partir en tâche de fond sans bloquer.
    window.electronAPI.setFullScreen(true);
    mountRef.current?.querySelector('canvas')?.requestPointerLock();
    setPhase('running');
  };

  const total = stats.hits + stats.misses;
  const accuracy = total > 0 ? (stats.hits / total) * 100 : null;
  const avgReaction = stats.times.length > 0 ? stats.times.reduce((a, b) => a + b, 0) / stats.times.length : null;

  return (
    <div>
      <div className="card">
        <h3>{t('aimTrainer.title')}</h3>
        <p className="label">{t('aimTrainer.hint')}</p>
        <div className="filter-bar" style={{ marginTop: '0.75rem' }}>
          <label className="aim-trainer-setting">
            <span className="label">{t('aimTrainer.dpiLabel')}</span>
            <input
              type="number"
              value={settings.dpi}
              onChange={(e) => setSettings((s) => ({ ...s, dpi: Number(e.target.value) || 0 }))}
              disabled={phase === 'running'}
            />
          </label>
          <label className="aim-trainer-setting">
            <span className="label">{t('aimTrainer.sensLabel')}</span>
            <input
              type="number"
              step="0.01"
              value={settings.sens}
              onChange={(e) => setSettings((s) => ({ ...s, sens: Number(e.target.value) || 0 }))}
              disabled={phase === 'running'}
            />
          </label>
          {phase !== 'running' && (
            <button className="refresh" onClick={handleStart}>
              {phase === 'done' ? t('aimTrainer.restart') : t('aimTrainer.start')}
            </button>
          )}
        </div>
        <p className="label" style={{ marginTop: '0.5rem' }}>{t('aimTrainer.accuracyNote')}</p>
      </div>

      <div className="card aim-trainer-stage-card">
        <div
          ref={mountRef}
          className={phase === 'running' ? 'aim-trainer-canvas aim-trainer-canvas-active' : 'aim-trainer-canvas'}
        >
          {phase === 'running' && locked && <div className="aim-trainer-crosshair" />}
          {phase === 'running' && (
            <div className="aim-trainer-hud">
              <span>{t('aimTrainer.timeLeft', { seconds: timeLeft })}</span>
              <span>{t('aimTrainer.hitsCount', { count: stats.hits })}</span>
            </div>
          )}
          {phase === 'running' && !locked && (
            <div className="aim-trainer-overlay">
              <p>{t('aimTrainer.clickToResume')}</p>
              <button className="refresh" onClick={handleStart}>
                {t('aimTrainer.resume')}
              </button>
            </div>
          )}
          {phase !== 'running' && (
            <div className="aim-trainer-overlay">
              {phase === 'idle' ? (
                <p>{t('aimTrainer.readyHint')}</p>
              ) : (
                <div className="aim-trainer-results">
                  <h3>{t('aimTrainer.resultsTitle')}</h3>
                  <div className="stat-tiles">
                    <div className="stat-tile">
                      <div className="value">{stats.hits}</div>
                      <div className="label">{t('aimTrainer.hits')}</div>
                    </div>
                    <div className="stat-tile">
                      <div className="value">{accuracy === null ? '?' : `${accuracy.toFixed(0)}%`}</div>
                      <div className="label">{t('aimTrainer.accuracy')}</div>
                    </div>
                    <div className="stat-tile">
                      <div className="value">{avgReaction === null ? '?' : `${avgReaction.toFixed(0)} ms`}</div>
                      <div className="label">{t('aimTrainer.avgReaction')}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AimTrainer;
