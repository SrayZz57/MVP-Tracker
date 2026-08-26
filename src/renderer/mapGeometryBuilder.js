import * as THREE from 'three';

// Construit les meshes Three.js à partir d'une disposition de map purement
// déclarative (voir mapLayouts/*.js). Séparé de tout composant React : les
// futures features (mode d'entraînement 3D, heatmap 3D, outil de setup
// tactique) pourront réutiliser exactement la même disposition sans dupliquer
// de code de rendu — seule la partie interaction change.

// Matériaux neutres, volontairement génériques : gris pour les murs, un gris
// plus chaud pour les caisses (les distingue au premier coup d'œil sans
// recourir à une couleur propre au jeu), un gris plus clair pour le sol et
// les plateformes.
function createMaterials() {
  return {
    floor: new THREE.MeshStandardMaterial({ color: 0x9a9da4, roughness: 0.95, metalness: 0.02 }),
    wall: new THREE.MeshStandardMaterial({ color: 0x6b6f78, roughness: 0.9, metalness: 0.04 }),
    crate: new THREE.MeshStandardMaterial({ color: 0x8a7d68, roughness: 0.85, metalness: 0.03 }),
    pillar: new THREE.MeshStandardMaterial({ color: 0x5c5f68, roughness: 0.9, metalness: 0.04 }),
    platform: new THREE.MeshStandardMaterial({ color: 0x7d818a, roughness: 0.88, metalness: 0.03 }),
    ramp: new THREE.MeshStandardMaterial({ color: 0x7d818a, roughness: 0.88, metalness: 0.03 }),
  };
}

// `layout` : un objet du type exporté par mapLayouts/ascentSiteA.js.
// Retourne un THREE.Group contenant tout le block-out, avec
// `mesh.userData = { blockId, type }` sur chaque pièce pour permettre plus
// tard le picking (placement d'objets tactiques, par exemple).
export function buildMapGroup(layout) {
  const materials = createMaterials();
  const group = new THREE.Group();
  group.name = layout.id;

  layout.floors.forEach((floor) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(floor.size.w, floor.size.d), materials.floor);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(floor.position.x, layout.floorY, floor.position.z);
    mesh.receiveShadow = true;
    mesh.userData = { blockId: floor.id, type: 'floor' };
    group.add(mesh);
  });

  layout.blocks.forEach((block) => {
    const material = materials[block.type] ?? materials.wall;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(block.size.w, block.size.h, block.size.d), material);
    mesh.position.set(block.position.x, block.position.y, block.position.z);
    if (block.rotationY) mesh.rotation.y = block.rotationY;
    if (block.rotationX) mesh.rotation.x = block.rotationX;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { blockId: block.id, type: block.type };
    group.add(mesh);
  });

  return group;
}
