import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config
export default defineConfig({
  plugins: [react()],
  // Vite ne reconnaît pas .glb/.gltf comme des assets par défaut — sans ça,
  // il essaie de les parser comme du JS et plante (utilisé par l'Aim Trainer).
  assetsInclude: ['**/*.glb', '**/*.gltf'],
  server: {
    watch: {
      // Le dossier de build electron-forge (out/) contient des DLL parfois
      // verrouillées par un .exe empaqueté en cours d'exécution — le watcher
      // Vite plantait dessus (EBUSY) sans cette exclusion.
      ignored: ['**/out/**'],
    },
  },
});
