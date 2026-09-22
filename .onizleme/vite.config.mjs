import react from '@vitejs/plugin-react'
import path from 'node:path'
const kok = path.resolve('.onizleme')
export default { root: kok, plugins: [react()], server: { port: 5190, fs: { allow: [path.resolve('.')] } },
  resolve: { alias: [{ find: /^.*\/lib\/supabase\.js$/, replacement: path.join(kok, 'sahte-supabase.js') }] } }
