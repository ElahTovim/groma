import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { count, eq } from "drizzle-orm";
import { OUTILS } from "@/lib/agent/outils";
import { verifierJeton } from "@/lib/agent/jetons";
import { budgetOutilsAtteint, BUDGET_AGENT, OUTILS_AGENT, resumer } from "@/lib/agent-regles";
import { db } from "@/lib/db";
import { agentEtapes } from "@/lib/db/schema";
import { journal } from "@/lib/journal";
import { atteinte, noter } from "@/lib/limites";

// Le serveur MCP de groma : les outils de l'agent, par HTTP, protégés par un jeton dans l'en-tête
// Authorization de chaque requête. Branché dans Claude Code (jeton personnel, Réglages) et utilisé
// par l'assistant (jeton d'exécution). Chaque appel est journalisé ; le budget est tenu ici.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function traiter(requete: Request): Promise<Response> {
  const acces = await verifierJeton(requete.headers.get("authorization"));
  if (!acces) {
    journal("mcp_refuse", { raison: "jeton absent, faux, expiré ou révoqué" });
    return Response.json({ jsonrpc: "2.0", error: { code: -32001, message: "Jeton absent, invalide, expiré ou révoqué." }, id: null }, { status: 401 });
  }
  const { qui, executionId, jetonId } = acces;
  const origine = executionId ? "assistant" : "mcp";
  const serveur = new McpServer({ name: "groma", version: "1.0.0" });

  for (const [nom, outil] of Object.entries(OUTILS)) {
    serveur.registerTool(nom, { description: OUTILS_AGENT[nom].description, inputSchema: outil.schema }, async (args: Record<string, unknown>) => {
      // Le budget : par exécution pour l'assistant, par heure pour un jeton personnel.
      if (executionId) {
        const [{ n }] = await db.select({ n: count() }).from(agentEtapes).where(eq(agentEtapes.executionId, executionId));
        if (budgetOutilsAtteint(n)) {
          await db.insert(agentEtapes).values({ executionId, compteId: qui.id, origine, outil: nom, entrees: args, resultat: "refusé : budget atteint", ok: false });
          return { content: [{ type: "text" as const, text: `Budget atteint : ${BUDGET_AGENT.appelsOutils} appels d'outils au plus. Arrête-toi et dis où tu en es.` }], isError: true };
        }
      } else if (await atteinte("appelsMcpParHeure", jetonId)) {
        return { content: [{ type: "text" as const, text: "Plafond d'appels atteint pour ce jeton : réessayez dans une heure." }], isError: true };
      }
      if (!executionId) await noter("appelsMcpParHeure", jetonId);
      let sortie;
      try {
        sortie = await outil.executer({ qui, executionId }, args);
      } catch (e) {
        sortie = { ok: false, texte: "L'outil a échoué de façon inattendue.", suspect: null };
        journal("mcp_outil_echec", { compte: qui.id, outil: nom, erreur: String(e).slice(0, 300) });
      }
      await db.insert(agentEtapes).values({ executionId, compteId: qui.id, origine, outil: nom, entrees: args, resultat: resumer(sortie.texte), ok: sortie.ok, suspect: sortie.suspect ?? null });
      journal("mcp_outil", { compte: qui.id, origine, execution: executionId, outil: nom, ok: sortie.ok, suspect: Boolean(sortie.suspect) });
      return { content: [{ type: "text" as const, text: sortie.texte }], isError: !sortie.ok };
    });
  }

  // Sans état : une requête, un serveur ; rien n'est gardé entre deux appels.
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await serveur.connect(transport);
  return transport.handleRequest(requete);
}

export { traiter as GET, traiter as POST, traiter as DELETE };
