import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Client, Functions, ExecutionMethod } from "appwrite";
import {
  ArrowUp,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  LifeBuoy,
  MessageCircle,
  Plus,
  Search,
  Ship,
  X,
} from "lucide-react";
import articles from "../data/articles.json";
import "./style.css";
const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);
const functions = new Functions(client);
type Source = { title: string; url: string };
type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
};
const suggestions = [
  "How do I invite a client to one project?",
  "Can I export my tasks to a spreadsheet?",
  "What happens if my payment fails?",
  "How do I recover a deleted task?",
];
function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [path, setPath] = useState(location.pathname);
  const [browse, setBrowse] = useState(false);
  const [search, setSearch] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const handler = () => setPath(location.pathname);
    addEventListener("popstate", handler);
    return () => removeEventListener("popstate", handler);
  }, []);
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);
  function navigate(url: string) {
    history.pushState({}, "", url);
    setPath(url);
    setBrowse(false);
  }
  const article = articles.find((a) => `/help/${a.id}` === path);
  async function ask(text: string) {
    if (!text.trim() || busy) return;
    const previous = messages;
    const current = text.trim();
    setMessages([...previous, { role: "user", content: current }]);
    setQuestion("");
    setBusy(true);
    setError("");
    try {
      const execution = await functions.createExecution({
        functionId: import.meta.env.VITE_APPWRITE_FUNCTION_ID,
        body: JSON.stringify({
          question: current,
          history: previous
            .slice(-6)
            .map(({ role, content }) => ({ role, content })),
        }),
        async: false,
        method: ExecutionMethod.POST,
      });
      const result = JSON.parse(execution.responseBody || "{}");
      if (
        execution.responseStatusCode !== 200 ||
        typeof result.answer !== "string"
      )
        throw new Error(
          result.error ||
            "The help assistant is unavailable. Please try again.",
        );
      setMessages([
        ...previous,
        { role: "user", content: current },
        { role: "assistant", content: result.answer, sources: result.sources },
      ]);
    } catch (e) {
      setMessages(previous);
      setQuestion(current);
      setError(
        e instanceof Error ? e.message : "Unable to connect. Please try again.",
      );
    } finally {
      setBusy(false);
      input.current?.focus();
    }
  }
  return (
    <div className="shell">
      <aside>
        <a
          href="/"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            navigate("/");
          }}
        >
          <span className="brand-icon">
            <Ship size={23} />
          </span>
          harbor<span className="help-tag">help</span>
        </a>
        <div className="workspace">
          <span className="workspace-icon">H</span>
          <div>
            Harbor workspace<small>Product support</small>
          </div>
        </div>
        <nav>
          <button
            className={!browse ? "selected" : ""}
            onClick={() => {
              navigate("/");
              setBrowse(false);
            }}
          >
            <MessageCircle size={18} />
            Ask Harbor
          </button>
          <button
            className={browse ? "selected" : ""}
            onClick={() => {
              navigate("/");
              setBrowse(true);
            }}
          >
            <BookOpen size={18} />
            Help articles<span className="count">{articles.length}</span>
          </button>
        </nav>
        <p className="nav-label">EXPLORE THE HELP CENTER</p>
        <div className="categories">
          {[
            "Getting started",
            "Projects",
            "Tasks",
            "Teams",
            "Billing",
            "Integrations",
            "Security",
          ].map((category) => (
            <button
              key={category}
              onClick={() => {
                navigate("/");
                setBrowse(true);
                setSearch(category);
              }}
            >
              {category}
              <ChevronRight size={14} />
            </button>
          ))}
        </div>
        <div className="sidebar-bottom">
          <LifeBuoy size={17} />
          <div>
            Answers from our help center
            <small>Articles and FAQs, all in one place.</small>
          </div>
        </div>
      </aside>
      <main>
        <header>
          <div>
            <span className="breadcrumb">Help center</span>
            <ChevronRight size={13} />
            <span>
              {article ? "Article" : browse ? "Help articles" : "Ask Harbor"}
            </span>
          </div>
          <button
            className="new-chat"
            disabled={busy}
            onClick={() => {
              setMessages([]);
              setError("");
              navigate("/");
            }}
          >
            <Plus size={16} />
            New conversation
          </button>
        </header>
        {article ? (
          <section className="article">
            <button className="back" onClick={() => navigate("/")}>
              ← Back to conversation
            </button>
            <span className="eyebrow">
              {article.category} / {article.kind === "faq" ? "FAQ" : "GUIDE"}
            </span>
            <h1>{article.title}</h1>
            <p>{article.body}</p>
            <div className="article-note">
              <BookOpen size={17} />
              From the Harbor help center
            </div>
          </section>
        ) : browse ? (
          <section className="library">
            <span className="eyebrow">HARBOR KNOWLEDGE BASE</span>
            <h1>A little help goes a long way.</h1>
            <div className="search">
              <Search size={18} />
              <input
                aria-label="Search articles"
                placeholder="Search articles and FAQs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button aria-label="Clear search" onClick={() => setSearch("")}>
                  <X size={15} />
                </button>
              )}
            </div>
            <div className="article-grid">
              {articles
                .filter((a) =>
                  `${a.title} ${a.category} ${a.body}`
                    .toLowerCase()
                    .includes(search.toLowerCase()),
                )
                .map((a) => (
                  <a
                    key={a.id}
                    href={`/help/${a.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(`/help/${a.id}`);
                    }}
                  >
                    <span>
                      {a.category} · {a.kind === "faq" ? "FAQ" : "Guide"}
                    </span>
                    <h2>{a.title}</h2>
                    <ArrowUpRight size={18} />
                  </a>
                ))}
            </div>
          </section>
        ) : (
          <>
            <div
              className={`conversation ${messages.length ? "has-messages" : ""}`}
            >
              {!messages.length ? (
                <div className="welcome">
                  <span className="assistant-mark">
                    <Ship size={30} />
                  </span>
                  <span className="eyebrow">YOUR HARBOR HELP ASSISTANT</span>
                  <h1>What can we help you with?</h1>
                  <p>
                    Ask a question about Harbor. Get an answer
                    <br className="desktop-break" /> with the help articles to
                    back it up.
                  </p>
                  <div className="suggestions">
                    {suggestions.map((s, i) => (
                      <button key={s} onClick={() => ask(s)}>
                        <span>
                          {
                            [
                              "Team access",
                              "Import & export",
                              "Billing",
                              "Tasks",
                            ][i]
                          }
                        </span>
                        {s}
                        <ArrowUpRight size={17} />
                      </button>
                    ))}
                  </div>
                  <div className="grounded">
                    <Check size={14} />
                    Grounded in {articles.length} help articles and FAQs
                  </div>
                </div>
              ) : (
                <div className="messages" aria-live="polite">
                  {messages.map((m, i) => (
                    <div className={`message ${m.role}`} key={i}>
                      {m.role === "assistant" && (
                        <span className="message-avatar">
                          <Ship size={18} />
                        </span>
                      )}
                      <div className="message-body">
                        <span className="message-author">
                          {m.role === "user" ? "You" : "Harbor assistant"}
                        </span>
                        <div className="message-text">{m.content}</div>
                        {!!m.sources?.length && (
                          <div className="sources">
                            <span>HELP ARTICLES</span>
                            {m.sources.map((s) => (
                              <a
                                key={s.url}
                                href={s.url}
                                onClick={(e) => {
                                  e.preventDefault();
                                  navigate(s.url);
                                }}
                              >
                                <BookOpen size={15} />
                                {s.title}
                                <ArrowUpRight size={14} />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {busy && (
                    <div className="message assistant">
                      <span className="message-avatar">
                        <Ship size={18} />
                      </span>
                      <div className="thinking" role="status">
                        Looking through the help center<span>•••</span>
                      </div>
                    </div>
                  )}
                  <div ref={bottom} />
                </div>
              )}
            </div>
            <div className="composer-wrap">
              {error && (
                <p role="alert" className="error">
                  {error}
                </p>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  ask(question);
                }}
              >
                <textarea
                  ref={input}
                  aria-label="Ask a question"
                  placeholder="Ask anything about Harbor…"
                  value={question}
                  maxLength={1000}
                  rows={1}
                  disabled={busy}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      ask(question);
                    }
                  }}
                />
                <button
                  aria-label="Send question"
                  disabled={busy || !question.trim()}
                >
                  <ArrowUp size={20} />
                </button>
              </form>
              <p className="composer-note">
                Answers are based on Harbor's help center. Check the linked
                articles for details.
              </p>
            </div>
          </>
        )}
        <footer>
          <span>Harbor Help</span>
          <span>
            Built with{" "}
            <a href="https://appwrite.io" target="_blank" rel="noreferrer">
              Appwrite
            </a>
          </span>
        </footer>
      </main>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
