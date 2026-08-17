import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config
export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      // Le dossier de build electron-forge (out/) contient des DLL parfois
      // verrouillées par un .exe empaqueté en cours d'exécution — le watcher
      // Vite plantait dessus (EBUSY) sans cette exclusion.
      ignored: ['**/out/**'],
    },
  },
});
