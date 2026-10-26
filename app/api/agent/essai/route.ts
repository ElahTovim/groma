import { Sandbox } from "@vercel/sandbox";
import { journal } from "@/lib/journal";
import { appelant } from "@/lib/session";

// TRANCHE 0, essai technique à retirer : le SDK d'agents d'Anthropic tourne-t-il dans un
// bac à sable Vercel ? Réservé au gérant connecté. Coût : moins d'un centime.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const SCRIPT = `
import { query } from "@anthropic-ai/claude-agent-sdk";
const debut = Date.now();
for await (const m of query({
  prompt: "Réponds seulement, en une ligne : bonjour depuis le bac à sable de groma.",
  options: { model: "claude-haiku-4-5-20251001", maxTurns: 1, allowedTools: [], permissionMode: "default" },
})) {
  if (m.type === "result") console.log(JSON.stringify({ sousType: m.subtype, resultat: m.result, coutUsd: m.total_cost_usd, tours: m.num_turns, dureeMs: Date.now() - debut }));
}
`;

export async function GET() {
  const qui = await appelant();
  if (!qui || qui.role !== "gerant") return new Response("Réservé au gérant connecté.", { status: 401 });
  journal("agent_essai", { compte: qui.id });
  const t: Record<string, number> = {};
  const t0 = Date.now();
  const sandbox = await Sandbox.create({ runtime: "node22", timeout: 5 * 60 * 1000, resources: { vcpus: 2 }, env: { ANTHROPIC_API_KEY: process.env.MY_claude ?? "" } });
  t.creation = Date.now() - t0;
  try {
    const t1 = Date.now();
    const installe = await sandbox.runCommand("npm", ["install", "--no-audit", "--no-fund", "@anthropic-ai/claude-agent-sdk"]);
    t.installation = Date.now() - t1;
    if (installe.exitCode !== 0) return Response.json({ ok: false, etape: "installation", t, sortie: (await installe.output("both")).slice(-2000) });
    await sandbox.writeFiles([{ path: "essai.mjs", content: Buffer.from(SCRIPT) }]);
    const t2 = Date.now();
    const lance = await sandbox.runCommand("node", ["essai.mjs"]);
    t.agent = Date.now() - t2;
    return Response.json({ ok: lance.exitCode === 0, t, sortie: (await lance.output("both")).slice(-3000) });
  } finally {
    await sandbox.stop().catch(() => {});
  }
}
