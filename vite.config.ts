import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

/** Strip module attribute and external refs so the file works on SharePoint */
function sharepointCompat(): Plugin {
  return {
    name: 'sharepoint-compat',
    enforce: 'post',
    generateBundle(_, bundle) {
      for (const file of Object.values(bundle)) {
        if (file.type === 'asset' && file.fileName === 'index.html') {
          let html = typeof file.source === 'string'
            ? file.source
            : new TextDecoder().decode(file.source);
          // Remove type="module" so SharePoint doesn't block the script
          html = html.replace(/<script type="module" crossorigin>/g, '<script>');
          // Remove external favicon link
          html = html.replace(/<link rel="icon"[^>]*\/>\s*/g, '');
          file.source = html;
        }
      }
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), viteSingleFile(), sharepointCompat()],
})
