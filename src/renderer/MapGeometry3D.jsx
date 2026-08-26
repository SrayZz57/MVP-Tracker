import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { buildMapGroup } from './mapGeometryBuilder.js';
import { ABYSS_SITE_A } from './mapLayouts/abyssSiteA.js';

const DEG_TO_RAD = Math.PI / 180;
const MOVE_SPEED = 5.5; // m/s
const MOUSE_SENS = 0.0022; // radians par pixel de mouvement souris

// Prévisualisation en vue première personne d'une disposition de map
// déclarative (mapLayouts/*.js) — pose la base commune réutilisable pour un
// futur mode d'entraînement 3D et un futur outil de placement tactique.
// Volontairement minimal : pas de collisions, pas de gameplay, seulement de
// quoi juger les proportions en s'y déplaçant.
function MapGeometry3D({ layout = ABYSS_SITE_A }) {
  const mountRef = useRef(null);
  const [locked, setLocked] = useState(false);
  const stateRef = useRef({ keys: {} });

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xb9c9d8);
    scene.fog = new THREE.FogExp2(0xb9c9d8, 0.018);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 300);
    camera.position.set(layout.spawn.x, layout.spawn.y, layout.spawn.z);
    const euler = new THREE.Euler(0, layout.spawn.yawDeg * DEG_TO_RAD, 0, 'YXZ');
    camera.quaternion.setFromEuler(euler);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const sun = new THREE.DirectionalLight(0xfff2d8, 1.6);
    sun.position.set(12, 18, -6);
    sun.castShadow = true;
    scene.add(sun);
    const fill = new THREE.HemisphereLight(0xcfe0ff, 0x555a63, 0.5);
    scene.add(fill);

    const mapGroup = buildMapGroup(layout);
    scene.add(mapGroup);

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    const onMouseMove = (e) => {
      if (document.pointerLockElement !== renderer.domElement) return;
      euler.y -= e.movementX * MOUSE_SENS;
      euler.x -= e.movementY * MOUSE_SENS;
      euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x));
      camera.quaternion.setFromEuler(euler);
    };
    document.addEventListener('mousemove', onMouseMove);

    const onKeyDown = (e) => {
      stateRef.current.keys[e.code] = true;
    };
    const onKeyUp = (e) => {
      stateRef.current.keys[e.code] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const onClick = () => renderer.domElement.requestPointerLock();
    renderer.domElement.addEventListener('click', onClick);

    const onLockChange = () => setLocked(document.pointerLockElement === renderer.domElement);
    document.addEventListener('pointerlockchange', onLockChange);

    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    const clock = new THREE.Clock();
    let raf;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      const { keys } = stateRef.current;

      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      right.crossVectors(forward, camera.up).normalize();

      const move = new THREE.Vector3();
      if (keys.KeyW) move.add(forward);
      if (keys.KeyS) move.sub(forward);
      if (keys.KeyD) move.add(right);
      if (keys.KeyA) move.sub(right);
      if (move.lengthSq() > 0) {
        move.normalize().multiplyScalar(MOVE_SPEED * dt);
        camera.position.add(move);
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      renderer.domElement.removeEventListener('click', onClick);
      document.removeEventListener('pointerlockchange', onLockChange);
      if (document.pointerLockElement === renderer.domElement) document.exitPointerLock();
      mount.removeChild(renderer.domElement);
      renderer.dispose();
    };
    // Le montage ne dépend que de la disposition choisie au départ : la
    // reconstruire à chaque changement de référence casserait inutilement la
    // caméra/les contrôles pour un simple re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code === 'Escape' && !locked) window.electronAPI?.closeMapPreview?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [locked]);

  return (
    <div className="map-preview" ref={mountRef}>
      {!locked && (
        // Le panneau d'accueil est rendu par React AU-DESSUS du canvas Three.js :
        // un clic dessus n'atteint jamais le canvas, donc la demande de
        // verrouillage souris doit partir d'ici, pas d'un listener posé sur
        // le canvas lui-même (sinon le panneau ne se ferme jamais).
        <div
          className="map-preview-overlay"
          onClick={() => mountRef.current?.querySelector('canvas')?.requestPointerLock()}
        >
          <div className="map-preview-panel">
            <h1>🧱 {layout.label}</h1>
            <p>Block-out géométrique — proportions générales seulement, aucune texture du jeu.</p>
            <p className="map-preview-hint">Clique pour entrer · WASD pour se déplacer · Échap pour sortir</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default MapGeometry3D;
