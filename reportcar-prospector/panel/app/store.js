// Capa de datos: Firestore (modo normal) o localStorage (modo demo, para probar sin Firebase: ?demo).
import { FIREBASE_CONFIG } from './firebase-config.js';

const SDK = 'https://www.gstatic.com/firebasejs/10.13.0';
export const CONFIG_DEFAULT = { maxContactosDia: 20, horaRecordatorio: '08:30', diasHabiles: [1, 2, 3, 4, 5], rubroActivo: 'talleres' };

async function rubroDesdeArchivo(id) {
  const r = await fetch(`rubros/${id}.json`);
  if (!r.ok) throw new Error(`No existe rubros/${id}.json`);
  return r.json();
}

// ───────────────────────── Firestore ─────────────────────────
async function crearFirestoreStore() {
  const [{ initializeApp }, fs, au] = await Promise.all([
    import(`${SDK}/firebase-app.js`), import(`${SDK}/firebase-firestore.js`), import(`${SDK}/firebase-auth.js`),
  ]);
  const app = initializeApp(FIREBASE_CONFIG);
  const db = fs.initializeFirestore(app, { localCache: fs.persistentLocalCache() });
  const auth = au.getAuth(app);
  const ts = () => fs.serverTimestamp();
  const aFecha = (v) => (v && typeof v.toDate === 'function' ? v.toDate() : v ?? null);
  const uid = () => auth.currentUser?.uid || null;

  return {
    modo: 'firebase',
    onUsuario(cb) {
      return au.onAuthStateChanged(auth, async (user) => {
        if (!user) return cb(null, false);
        try {
          const u = await fs.getDoc(fs.doc(db, 'usuarios', user.uid));
          cb(user, u.exists());
        } catch { cb(user, false); }
      });
    },
    login: () => au.signInWithPopup(auth, new au.GoogleAuthProvider()),
    logout: () => au.signOut(auth),
    async cargarConfig() {
      const s = await fs.getDoc(fs.doc(db, 'config', 'general'));
      return { ...CONFIG_DEFAULT, ...(s.exists() ? s.data() : {}) };
    },
    async guardarConfig(patch) { await fs.setDoc(fs.doc(db, 'config', 'general'), patch, { merge: true }); },
    async cargarRubro(id) {
      const ref = fs.doc(db, 'rubros', id);
      const s = await fs.getDoc(ref);
      if (s.exists()) return s.data();
      const r = await rubroDesdeArchivo(id);
      await fs.setDoc(ref, { ...r, actualizado: ts() });
      return r;
    },
    async guardarRubro(r) { await fs.setDoc(fs.doc(db, 'rubros', r.id), { ...r, actualizado: ts() }); },
    async listarNegocios(rubro) {
      const q = fs.query(fs.collection(db, 'negocios'), fs.where('rubro', '==', rubro));
      const s = await fs.getDocs(q);
      return s.docs.map((d) => ({ ...d.data(), id: d.id, creado: aFecha(d.get('creado')), actualizado: aFecha(d.get('actualizado')) }));
    },
    async crearNegocios(lista, onProgreso) {
      for (let i = 0; i < lista.length; i += 200) {
        const b = fs.writeBatch(db);
        for (const n of lista.slice(i, i + 200)) {
          const { id, ...datos } = n;
          b.set(fs.doc(db, 'negocios', id), { ...datos, creado: ts(), actualizado: ts() });
          b.set(fs.doc(fs.collection(db, 'negocios', id, 'eventos')), { tipo: 'nota', texto: `Alta (${n.origen})`, fecha: ts(), usuario: uid() });
        }
        await b.commit();
        onProgreso?.(Math.min(i + 200, lista.length));
      }
    },
    async actualizar(id, patch, evento) {
      const b = fs.writeBatch(db);
      b.update(fs.doc(db, 'negocios', id), { ...patch, actualizado: ts() });
      if (evento) b.set(fs.doc(fs.collection(db, 'negocios', id, 'eventos')), { ...evento, fecha: ts(), usuario: uid() });
      await b.commit();
    },
    async listarEventos(id) {
      const s = await fs.getDocs(fs.query(fs.collection(db, 'negocios', id, 'eventos'), fs.orderBy('fecha', 'desc')));
      return s.docs.map((d) => ({ ...d.data(), id: d.id, fecha: aFecha(d.get('fecha')) }));
    },
    /** Eventos de todos los negocios desde una fecha (métricas). Usa el índice de grupo de colección de `fecha`. */
    async listarEventosDesde(desde) {
      const q = fs.query(fs.collectionGroup(db, 'eventos'), fs.where('fecha', '>=', desde));
      const s = await fs.getDocs(q);
      return s.docs.map((d) => ({ tipo: d.get('tipo'), negocioId: d.ref.parent.parent?.id, fecha: aFecha(d.get('fecha')) }));
    },
    async listarMensajes(id) {
      const s = await fs.getDocs(fs.collection(db, 'negocios', id, 'mensajes'));
      return Object.fromEntries(s.docs.map((d) => [d.id, d.data()]));
    },
  };
}

// ───────────────────────── Demo (localStorage) ─────────────────────────
function crearDemoStore() {
  const KEY = 'reportcar-prospector:demo';
  const leer = () => JSON.parse(localStorage.getItem(KEY) || '{"negocios":{},"eventos":{},"config":{},"rubros":{}}');
  const escribir = (d) => localStorage.setItem(KEY, JSON.stringify(d));
  const ahora = () => new Date().toISOString();
  const usuario = { uid: 'demo', displayName: 'Modo demo', email: 'demo' };
  const conFechas = (n) => ({ ...n, creado: n.creado && new Date(n.creado), actualizado: n.actualizado && new Date(n.actualizado) });
  const pushEvento = (d, id, ev) => { (d.eventos[id] ||= []).push({ ...ev, id: crypto.randomUUID(), fecha: ahora(), usuario: 'demo' }); };

  return {
    modo: 'demo',
    onUsuario(cb) { setTimeout(() => cb(usuario, true), 0); return () => {}; },
    login: async () => {},
    logout: async () => { if (confirm('¿Borrar todos los datos del modo demo?')) { localStorage.removeItem(KEY); location.reload(); } },
    async cargarConfig() { return { ...CONFIG_DEFAULT, ...leer().config }; },
    async guardarConfig(p) { const d = leer(); d.config = { ...d.config, ...p }; escribir(d); },
    async cargarRubro(id) {
      const d = leer();
      if (!d.rubros[id]) { d.rubros[id] = await rubroDesdeArchivo(id); escribir(d); }
      return d.rubros[id];
    },
    async guardarRubro(r) { const d = leer(); d.rubros[r.id] = r; escribir(d); },
    async listarNegocios(rubro) { return Object.values(leer().negocios).filter((n) => n.rubro === rubro).map(conFechas); },
    async crearNegocios(lista, onProgreso) {
      const d = leer();
      for (const n of lista) {
        d.negocios[n.id] = { ...n, creado: ahora(), actualizado: ahora() };
        pushEvento(d, n.id, { tipo: 'nota', texto: `Alta (${n.origen})` });
      }
      escribir(d); onProgreso?.(lista.length);
    },
    async actualizar(id, patch, evento) {
      const d = leer();
      d.negocios[id] = { ...d.negocios[id], ...patch, actualizado: ahora() };
      if (evento) pushEvento(d, id, evento);
      escribir(d);
    },
    async listarEventos(id) {
      return (leer().eventos[id] || []).map((e) => ({ ...e, fecha: new Date(e.fecha) })).sort((a, b) => b.fecha - a.fecha);
    },
    async listarEventosDesde(desde) {
      return Object.entries(leer().eventos).flatMap(([negocioId, evs]) =>
        evs.map((e) => ({ tipo: e.tipo, negocioId, fecha: new Date(e.fecha) })).filter((e) => e.fecha >= desde));
    },
    async listarMensajes() { return {}; },
  };
}

export async function crearStore() {
  const demo = new URLSearchParams(location.search).has('demo');
  if (demo) return crearDemoStore();
  if (!FIREBASE_CONFIG.apiKey) return null;
  return crearFirestoreStore();
}
