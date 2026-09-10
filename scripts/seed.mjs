import { readFile } from "node:fs/promises";
import {
  Client,
  Embeddings,
  EmbeddingModel,
  VectorsDB,
  VectorsDBIndexType,
} from "node-appwrite";
import { splitArticle } from "../functions/chat/src/knowledge.js";
const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);
const vectorsDB = new VectorsDB(client);
const embeddings = new Embeddings(client);
const databaseId = process.env.APPWRITE_DATABASE_ID;
const collectionId = process.env.APPWRITE_COLLECTION_ID;
const collection = await vectorsDB.getCollection({ databaseId, collectionId });
if (collection.dimension !== 384)
  throw new Error("Choose an all-minilm collection with 384 dimensions.");
try {
  await vectorsDB.getIndex({
    databaseId,
    collectionId,
    key: "embeddings_cosine",
  });
} catch (e) {
  if (e.code !== 404) throw e;
  await vectorsDB.createIndex({
    databaseId,
    collectionId,
    key: "embeddings_cosine",
    type: VectorsDBIndexType.HnswCosine,
    attributes: ["embeddings"],
  });
}
for (let attempt = 0; attempt < 60; attempt++) {
  const index = await vectorsDB.getIndex({
    databaseId,
    collectionId,
    key: "embeddings_cosine",
  });
  if (index.status === "available") break;
  if (index.status === "failed" || attempt === 59)
    throw new Error("Vector index did not become available.");
  await new Promise((r) => setTimeout(r, 1000));
}
const articles = JSON.parse(
  await readFile(new URL("../data/articles.json", import.meta.url), "utf8"),
);
let count = 0;
for (const article of articles) {
  for (const chunk of splitArticle(article)) {
    const result = await embeddings.createTextEmbeddings({
      texts: [chunk.input],
      model: EmbeddingModel.Allminilm,
    });
    const vector = result.embeddings[0];
    if (vector.error || vector.embedding.length !== 384)
      throw new Error(`Could not embed ${chunk.id}`);
    const data = { embeddings: vector.embedding, metadata: chunk.metadata };
    try {
      await vectorsDB.createDocument({
        databaseId,
        collectionId,
        documentId: chunk.id,
        data,
      });
    } catch (e) {
      if (e.code !== 409) throw e;
      await vectorsDB.updateDocument({
        databaseId,
        collectionId,
        documentId: chunk.id,
        data,
      });
    }
    count++;
  }
  console.log(`Seeded: ${article.title}`);
}
console.log(
  `${articles.length} articles and FAQs, ${count} searchable chunks.`,
);
