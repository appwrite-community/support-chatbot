# Appwrite support chatbot

Harbor Help answers questions using 40 help articles and FAQs about a fictional project-management product. It retrieves excerpts from Appwrite VectorsDB, generates answers through OpenRouter inside an Appwrite Function, and links to the original help pages. The React interface runs on Appwrite Sites.

## Requirements

- Node.js 22 or later and pnpm 10.
- An Appwrite project with VectorsDB, Functions, and Sites.
- An OpenRouter API key with credit for `openai/gpt-5.6-luna`, or another model that supports structured outputs.

## Create the knowledge base

In your project on https://appwrite.io, create a VectorsDB database with ID `support`. Create a collection named Articles with ID `articles`, selecting the `all-minilm` embedding model, which uses 384 dimensions. Leave collection permissions empty; the Function reads with its dynamic API key.

Create a seeding API key with these scopes:

- `vectorsdb.collections.read`
- `vectorsdb.indexes.read`
- `vectorsdb.indexes.write`
- `vectorsdb.documents.read`
- `vectorsdb.documents.write`
- `embeddings.write`

```sh
git clone https://github.com/appwrite-community/support-chatbot.git
cd support-chatbot
pnpm install
cp .env.example .env
```

Fill `.env` with the project's endpoint, ID, and seed key. The endpoint is shown in Project settings. Run:

```sh
pnpm seed
```

The script creates and waits for an HNSW cosine index, generates embeddings, and writes the documents. IDs are deterministic, so rerunning the same seed updates existing documents. If you remove an article or shorten one enough to remove chunks, delete its obsolete documents separately. `data/articles.json` contains the demo's source content, including all prices and policies. These describe Harbor, not Appwrite.

## Deploy the Function

Create a Node.js 22 Function named Support chatbot, with ID `support-chat`.

| Setting                       | Value                                          |
| ----------------------------- | ---------------------------------------------- |
| Root directory when using Git | `functions/chat`                               |
| Entrypoint                    | `src/main.js`                                  |
| Build command                 | `npm install --omit=dev`                       |
| Dynamic API key scopes        | `embeddings.write`, `vectorsdb.documents.read` |
| Execute access                | Any, for this public help-center demo          |
| Timeout                       | 60 seconds                                     |

Configure these Function variables before deployment:

| Variable                 | Value                 | Secret |
| ------------------------ | --------------------- | ------ |
| `APPWRITE_DATABASE_ID`   | `support`             | No     |
| `APPWRITE_COLLECTION_ID` | `articles`            | No     |
| `OPENROUTER_API_KEY`     | Your provider key     | Yes    |
| `OPENROUTER_MODEL`       | `openai/gpt-5.6-luna` | No     |

Deploy the Function through **GitHub** or the **Appwrite CLI**.

For GitHub, fork the companion repository and connect your fork to the Function under **Settings > Configuration > Git settings**. Set the production branch to `main` and the root directory to `functions/chat`. Use `src/main.js` as the entrypoint and `npm install --omit=dev` as the build command. Pushing a commit to `main` creates, builds, and activates a deployment. See [deploying Functions from Git](https://appwrite.io/docs/products/functions/deploy-from-git).

For the CLI, [install the Appwrite CLI](https://appwrite.io/docs/tooling/command-line/installation), then run these commands from your local repository root:

```sh
appwrite login
appwrite init project
appwrite pull functions --no-code
```

Select your project and the existing `support-chat` Function when prompted. In the generated `appwrite.config.json`, set that Function's `path` to `functions/chat`, `entrypoint` to `src/main.js`, and `commands` to `npm install --omit=dev`. Then deploy it:

```sh
appwrite push functions --function-id support-chat --activate
```

The CLI packages and uploads the Function code. See the [CLI Functions guide](https://appwrite.io/docs/tooling/command-line/functions) for configuration details.

The runtime supplies `APPWRITE_FUNCTION_API_ENDPOINT`, `APPWRITE_FUNCTION_PROJECT_ID`, and the `x-appwrite-key` request header. Do not copy the seeding key into the Function.

## Run the interface locally

Set the three `VITE_` values in `.env`. These are public configuration; never put an API key in a `VITE_` variable. Add a Web app with hostname `localhost` under your project's Apps section.

```sh
pnpm dev
```

The browser calls `Functions.createExecution` and displays its answer and verified source links. Conversation history stays in React state and resets on reload. The last six messages are sent to help interpret follow-up questions.

## Deploy on Appwrite Sites

Create a Site using Vite. Connect a fork of this repository, with the root directory left at the repository root. Use `pnpm install` for installation, `pnpm build` for the build, and `dist` for the output directory. Choose static rendering and set the fallback file to `index.html` so help article links work on refresh.

Set `VITE_APPWRITE_ENDPOINT`, `VITE_APPWRITE_PROJECT_ID`, and `VITE_APPWRITE_FUNCTION_ID` as Site variables before building. Choose an available Appwrite subdomain. Add that hostname as a Web app in the project if it is not already registered.

Push changes to the connected production branch to deploy the Site. The Function and Site are deployed separately. Update the vector documents with `pnpm seed` and redeploy the Site after changing articles so the source pages match the retrieved text.

## Verification

```sh
pnpm test
pnpm build
pnpm test:live
```

The live suite requires a deployed Function and a local test key with `executions.write` in addition to the seed scopes. It checks guest access, paraphrased CSV export, a contextual follow-up, an exact price, an unsupported question, an instruction-injection attempt, and invalid input. LLM outputs can vary; a passing suite is evidence for these cases, not a guarantee against hallucination.

The Function retrieves six candidates. Similarity is retrieval evidence, not confidence. It asks the model to refuse unsupported answers and rejects nonexistent citation IDs. It does not execute model-generated code or URLs. Public execute access is suitable for this demonstration; production deployments should apply authentication and request limits appropriate to their audience and provider budget.

## Repository structure

- `functions/chat/src/main.js`: request validation, retrieval, follow-up rewriting, and answer generation.
- `functions/chat/src/knowledge.js`: chunking and citation validation.
- `scripts/seed.mjs`: repeatable knowledge-base import.
- `scripts/test-live.mjs`: deployed Function checks.
- `src/`: Vite React chat and source article pages.
- `data/articles.json`: 40 fictional help articles and FAQs.

MIT licensed.
