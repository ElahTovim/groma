// Badge « test à volume réaliste » : chronomètre les pages de groma, connecté
// comme un vrai utilisateur. À lancer contre l'application branchée sur la COPIE.
//
//   npx next build && npx next start -p 3999      (avec .env.local → la copie)
//   node docs/volume/mesurer.mjs http://localhost:3999 courriel motDePasse
//
// Chaque page est chargée une fois pour rien (le serveur se met en route), puis
// TOURS fois ; on retient la médiane et le plus lent.

const [base = "http://localhost:3999", email, motDePasse] = process.argv.slice(2);
const TOURS = 7;

if (!email || !motDePasse) {
  console.error("Usage : node docs/volume/mesurer.mjs <adresse> <courriel> <mot de passe>");
  process.exit(1);
}

const biscuits = new Map();
function garder(reponse) {
  for (const ligne of reponse.headers.getSetCookie()) {
    const [paire] = ligne.split(";");
    const i = paire.indexOf("=");
    biscuits.set(paire.slice(0, i), paire.slice(i + 1));
  }
}
const entete = () => [...biscuits].map(([k, v]) => `${k}=${v}`).join("; ");

async function seConnecter() {
  const r = await fetch(`${base}/api/auth/csrf`);
  garder(r);
  const { csrfToken } = await r.json();
  const corps = new URLSearchParams({ email, motDePasse, csrfToken, callbackUrl: base });
  const r2 = await fetch(`${base}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", cookie: entete() },
    body: corps,
    redirect: "manual",
  });
  garder(r2);
  if (![...biscuits.keys()].some((k) => k.includes("session-token"))) throw new Error("Connexion refusée");
}

async function chrono(chemin) {
  const debut = performance.now();
  const r = await fetch(`${base}${chemin}`, { headers: { cookie: entete() }, redirect: "manual" });
  const html = await r.text();
  return { ms: performance.now() - debut, statut: r.status, ko: Math.round(html.length / 1024) };
}

async function premierChantier() {
  const { html } = await fetch(`${base}/chantiers`, { headers: { cookie: entete() } }).then(async (r) => ({ html: await r.text() }));
  const m = html.match(/\/chantiers\/([0-9a-f-]{36})/);
  return m?.[1];
}

await seConnecter();
const id = await premierChantier();
const pages = [
  ["Accueil", "/"],
  ["Chantiers", "/chantiers"],
  ["Chantiers, à traiter", "/chantiers?statut=a_traiter"],
  ["Chantiers, en cours", "/chantiers?statut=en_cours"],
  ["Chantiers, recherche « Montreuil »", "/chantiers?q=Montreuil"],
  ...(id ? [["Fiche d'un chantier", `/chantiers/${id}`]] : []),
];

console.log(`\n${email} — ${TOURS} chargements par page\n`);
console.log("Page".padEnd(38), "médiane".padStart(9), "plus lent".padStart(10), "poids".padStart(8), " statut");
for (const [nom, chemin] of pages) {
  await chrono(chemin);
  const mesures = [];
  for (let i = 0; i < TOURS; i++) mesures.push(await chrono(chemin));
  const temps = mesures.map((m) => m.ms).sort((a, b) => a - b);
  const mediane = temps[Math.floor(temps.length / 2)];
  console.log(nom.padEnd(38), `${Math.round(mediane)} ms`.padStart(9), `${Math.round(temps.at(-1))} ms`.padStart(10), `${mesures[0].ko} Ko`.padStart(8), ` ${mesures[0].statut}`);
}
