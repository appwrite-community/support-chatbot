export const UNKNOWN =
  "I couldn't find an answer in the help articles. Try asking about a documented feature or contact support.";
export function validateInput(body) {
  if (
    !body ||
    typeof body.question !== "string" ||
    !body.question.trim() ||
    body.question.length > 1000
  )
    throw new Error("Enter a question between 1 and 1,000 characters.");
  const history = body.history ?? [];
  if (
    !Array.isArray(history) ||
    history.length > 6 ||
    history.some(
      (m) =>
        !m ||
        !["user", "assistant"].includes(m.role) ||
        typeof m.content !== "string" ||
        m.content.length > 4000,
    )
  )
    throw new Error("Invalid conversation history.");
  return { question: body.question.trim(), history };
}
export function selectSources(documents) {
  return documents
    .filter(
      (d) =>
        d.metadata &&
        typeof d.metadata.text === "string" &&
        typeof d.metadata.title === "string" &&
        /^\/help\/[a-z0-9-]+$/.test(d.metadata.url),
    )
    .map((d, i) => ({
      id: i + 1,
      title: d.metadata.title,
      text: d.metadata.text,
      url: d.metadata.url,
    }));
}
export function validateAnswer(answer, sources) {
  if (
    !answer ||
    answer.supported !== true ||
    typeof answer.answer !== "string" ||
    !answer.answer.trim() ||
    !Array.isArray(answer.sourceIds)
  )
    return { answer: UNKNOWN, sources: [] };
  const ids = [...new Set(answer.sourceIds)];
  if (
    !ids.length ||
    ids.some((id) => !Number.isInteger(id) || !sources.some((s) => s.id === id))
  )
    return { answer: UNKNOWN, sources: [] };
  const unique = new Map();
  for (const source of sources.filter((s) => ids.includes(s.id)))
    unique.set(source.url, { title: source.title, url: source.url });
  return { answer: answer.answer, sources: [...unique.values()] };
}
export function splitArticle(article, maxChars = 650) {
  const chunks = [];
  let text = "";
  // Keep source paragraphs intact where possible, then split oversized paragraphs on words.
  for (const word of article.body.split(/\s+/)) {
    if (text && text.length + word.length + 1 > maxChars) {
      chunks.push(text);
      text = "";
    }
    text += (text ? " " : "") + word;
  }
  if (text) chunks.push(text);
  return chunks.map((text, i) => ({
    id: `${article.id}-${i}`,
    metadata: {
      articleId: article.id,
      title: article.title,
      category: article.category,
      kind: article.kind,
      text,
      url: `/help/${article.id}`,
    },
    input: `${article.title}\n${text}`,
  }));
}
