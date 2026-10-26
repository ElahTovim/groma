import { Sandbox } from "@vercel/sandbox";
import { eq } from "drizzle-orm";
import { creerJeton, revoquerJeton } from "@/lib/agent/jetons";
import { BUDGET_AGENT, consigneAgent, NOMS_OUTILS, statutFinal, type FinAgent } from "@/lib/agent-regles";
import { db } from "@/lib/db";
import { agentEtapes, agentExecutions } from "@/lib/db/schema";
import { depenseDuMois } from "@/lib/ia";
import { DOLLAR_EN_EURO, MODELES, PLAFONDS_IA } from "@/lib/ia-regles";
import { journal } from "@/lib/journal";
import { atteinte, noter } from "@/lib/limites";
import { aujourdhuiParis } from "@/lib/regles";
import type { Appelant } from "@/lib/session";

// L'assistant : le SDK d'agents d'Anthropic tourne dans un bac à sable Vercel (son programme
// dépasse la taille d'une fonction). Il n'a AUCUN outil intégré : ni commandes, ni fichiers, ni
// web. Ses seuls outils sont ceux de groma, par le serveur MCP, avec un jeton valable le temps
// de l'exécution et les droits de la personne qui l'a lancé. Le réseau du bac à sable ne s'ouvre
// qu'à l'API Anthropic, au registre npm et à groma.

const SCRIPT = String.raw`
import { query } from "@anthropic-ai/claude-agent-sdk";
const c = JSON.parse(process.env.AGENT_CONFIG);
let fin = null;
for await (const m of query({
  prompt: c.demande,
  options: {
    model: c.modele,
    systemPrompt: c.consigne,
    tools: [],
    allowedTools: c.outils,
    permissionMode: "dontAsk",
    settingSources: [],
    maxTurns: c.tours,
    maxBudgetUsd: c.budgetUsd,
    mcpServers: { groma: { type: "http", url: c.url, headers: c.entetes } },
  },
})) {
  if (m.type === "result") fin = { sousType: m.subtype, resultat: m.result ?? null, coutUsd: m.total_cost_usd ?? 0, tours: m.num_turns ?? 0 };
}
console.log("@@FIN@@" + JSON.stringify(fin));
`;

export type ResultatAgent = { ok: true; executionId: string; statut: string; reponse: string; coutEur: number } | { ok: false; erreur: string; executionId?: string };

export async function lancerAgent(qui: Appelant | null, demande: string, site: string): Promise<ResultatAgent> {
  if (!qui) return { ok: false, erreur: "Votre session a expiré. Reconnectez-vous." };
  if (qui.role === "externe") return { ok: false, erreur: "L'assistant est réservé à l'équipe." };
  const texte = String(demande ?? "").trim();
  if (texte.length < 3) return { ok: false, erreur: "Écrivez votre demande." };
  if (texte.length > 2000) return { ok: false, erreur: "Demande trop longue : 2 000 caractères au plus." };
  if (!process.env.MY_claude) return { ok: false, erreur: "L'IA n'est pas configurée." };
  if ((await depenseDuMois()) >= PLAFONDS_IA.budgetMensuelEuros) return { ok: false, erreur: `Le budget IA du mois (${PLAFONDS_IA.budgetMensuelEuros} €) est atteint.` };
  if (await atteinte("executionsAgentParJour", qui.id)) return { ok: false, erreur: "Plafond d'utilisations de l'assistant atteint pour aujourd'hui." };
  await noter("executionsAgentParJour", qui.id);

  const [x] = await db.insert(agentExecutions).values({ compteId: qui.id, demande: texte }).returning({ id: agentExecutions.id });
  const { jeton, id: jetonId } = await creerJeton({ compteId: qui.id, nom: "exécution de l'assistant", executionId: x.id, dureeMs: 10 * 60 * 1000 });
  journal("agent_lance", { compte: qui.id, execution: x.id });

  const entetes: Record<string, string> = { Authorization: `Bearer ${jeton}` };
  // Une prévisualisation est protégée par Vercel : le bac à sable passe avec le secret prévu pour.
  if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) entetes["x-vercel-protection-bypass"] = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  const hote = new URL(site).hostname;
  const debut = Date.now();
  let fin: FinAgent | null = null;
  let erreur: string | null = null;
  let sandbox: Awaited<ReturnType<typeof Sandbox.create>> | null = null;
  try {
    sandbox = await Sandbox.create({
      runtime: "node22",
      timeout: 4 * 60 * 1000,
      resources: { vcpus: 2 },
      networkPolicy: { allow: ["api.anthropic.com", "registry.npmjs.org", hote] },
      env: { ANTHROPIC_API_KEY: process.env.MY_claude, DISABLE_TELEMETRY: "1", CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1" },
    });
    const installe = await sandbox.runCommand("npm", ["install", "--no-audit", "--no-fund", "@anthropic-ai/claude-agent-sdk"]);
    if (installe.exitCode !== 0) throw new Error(`installation du SDK : ${(await installe.output("both")).slice(-300)}`);
    await sandbox.writeFiles([{ path: "agent.mjs", content: Buffer.from(SCRIPT) }]);
    const config = {
      demande: texte,
      modele: MODELES.fin,
      consigne: consigneAgent({ nom: qui.nom, role: qui.role, aujourdhui: aujourdhuiParis() }),
      outils: NOMS_OUTILS.map((n) => `mcp__groma__${n}`),
      tours: BUDGET_AGENT.tours,
      budgetUsd: BUDGET_AGENT.coutEur / DOLLAR_EN_EURO,
      url: `${site}/api/mcp`,
      entetes,
    };
    const lance = await sandbox.runCommand({ cmd: "node", args: ["agent.mjs"], env: { AGENT_CONFIG: JSON.stringify(config) } });
    const sortie = await lance.output("both");
    const ligne = sortie.split("\n").find((l) => l.startsWith("@@FIN@@"));
    fin = ligne ? (JSON.parse(ligne.slice(7)) as FinAgent) : null;
    if (!fin) erreur = sortie.slice(-400) || "l'agent n'a rien rendu";
  } catch (e) {
    erreur = String(e).slice(0, 400);
  } finally {
    await sandbox?.stop().catch(() => {});
    await revoquerJeton(jetonId);
  }

  const appels = (await db.select({ id: agentEtapes.id }).from(agentEtapes).where(eq(agentEtapes.executionId, x.id))).length;
  const statut = erreur ? "erreur" : statutFinal(fin, appels);
  const coutEur = Math.round((fin?.coutUsd ?? 0) * DOLLAR_EN_EURO * 1e6) / 1e6;
  const reponse =
    statut === "budget"
      ? `${fin?.resultat ?? ""}\n\nL'assistant s'est arrêté à la limite de son budget (${BUDGET_AGENT.appelsOutils} outils, ${BUDGET_AGENT.tours} tours). Ce qui est fait est dans le journal ; relancez avec une demande plus précise.`.trim()
      : (fin?.resultat ?? "L'assistant n'a pas pu répondre.");
  await db
    .update(agentExecutions)
    .set({ statut, reponse, coutEur: String(coutEur), tours: fin?.tours ?? 0, erreur, fin: new Date() })
    .where(eq(agentExecutions.id, x.id));
  journal("agent_fini", { compte: qui.id, execution: x.id, statut, appels, cout_eur: coutEur, duree_ms: Date.now() - debut, erreur });
  if (statut === "erreur") return { ok: false, erreur: "L'assistant n'a pas pu aller au bout. Le détail est dans son journal.", executionId: x.id };
  return { ok: true, executionId: x.id, statut, reponse, coutEur };
}
