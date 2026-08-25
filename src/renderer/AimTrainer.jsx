import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as THREE from 'three';

// Yaw de Valorant : degrés de rotation par "compte" de mouvement souris, à
// sensibilité 1.0. Officiel, identique à celui utilisé par les vrais
// convertisseurs de sensibilité (cm/360 = 2.54 * 360 / (dpi * sens * yaw)).
const VALORANT_YAW = 0.07;
const DEG_TO_RAD = Math.PI / 180;

const SESSION_SECONDS = 30;
const TARGET_RADIUS = 0.45;
const SPAWN_DISTANCE = 8;
const SPAWN_HALF_ANGLE_DEG = 28; // étendue où les cibles peuvent apparaître, autour du centre

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

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(3, 6, 4);
    scene.add(dirLight);

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

    const raycaster = new THREE.Raycaster();
    const center = new THREE.Vector2(0, 0);

    stateRef.current = { scene, camera, renderer, euler, target, raycaster, center, spawnedAt: performance.now() };

    let frameId;
    const animate = () => {
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
      const { camera, target, raycaster, center, spawnedAt } = stateRef.current;
      if (!camera || !target) return;
      raycaster.setFromCamera(center, camera);
      const hit = raycaster.intersectObject(target).length > 0;
      if (hit) {
        const reactionMs = performance.now() - spawnedAt;
        target.position.copy(randomTargetPosition());
        stateRef.current.spawnedAt = performance.now();
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
    const canvas = mountRef.current?.querySelector('canvas');
    canvas?.requestPointerLock();
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
        <div ref={mountRef} className="aim-trainer-canvas">
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
              <button
                className="refresh"
                onClick={() => mountRef.current?.querySelector('canvas')?.requestPointerLock()}
              >
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
