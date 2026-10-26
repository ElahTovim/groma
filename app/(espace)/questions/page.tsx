import { redirect } from "next/navigation";

// Questions sur les documents et assistant ne font plus qu'un : l'assistant cherche lui-même
// dans les documents (outil « chercher_dans_les_documents ») et cite document et page. Les
// anciens liens vers /questions (avec ou sans question) arrivent chez l'assistant, phrase
// pré-remplie, jamais lancée sans un clic. Les documents eux-mêmes : /questions/documents.
export default async function PageQuestions({ searchParams }: PageProps<"/questions">) {
  const { q } = await searchParams;
  redirect(typeof q === "string" && q.trim() ? `/assistant?q=${encodeURIComponent(q.slice(0, 2000))}` : "/assistant");
}
