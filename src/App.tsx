import { searchIbsKnowledge } from "./ibsKnowledge";
import demoCompanyDocument from "./demo-company.txt?raw";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";

type Role = "client" | "employee";

type RoleOption = {
  id: Role;
  title: string;
  icon: ReactNode;
};

type Message = {
  id: number;
  role: "assistant" | "user";
  text: string;
};

type EmployeeMode = "documents" | "staff";

type UploadedFile = {
  id: string;
  name: string;
  size: string;
  content: string;
};

const roleOptions: RoleOption[] = [
  {
    id: "client",
    title: "КЛИЕНТАМ",
    icon: (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M16 17.5a6.25 6.25 0 1 0 0-12.5 6.25 6.25 0 0 0 0 12.5Z" />
        <path d="M5.5 28c.8-5.1 4.3-8 10.5-8s9.7 2.9 10.5 8" />
      </svg>
    ),
  },
  {
    id: "employee",
    title: "СОТРУДНИКАМ",
    icon: (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <rect x="4.5" y="8.5" width="23" height="17.5" rx="4" />
        <path d="M11 8.5V7a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v1.5M4.5 16h23M12 16v2.5h8V16" />
      </svg>
    ),
  },
];

function BrandMark() {
  return (
    <div className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 36 36">
        <path
          className="ouroboros-body"
          d="M27.8 10.2A12.5 12.5 0 1 1 18 5.5c3.4 0 6.5 1.4 8.8 3.7"
        />
        <path className="ouroboros-head" d="m26 5.4 5.7 4.2-6.6 2.8.9-7Z" />
        <circle className="ouroboros-eye" cx="28.4" cy="8.8" r="0.9" />
        <path className="ouroboros-scale" d="m8.9 20.6 2.8 1.1M11 25l2.4-1.7M15 28l1.3-2.5" />
      </svg>
    </div>
  );
}

function ArrowIcon() {
  return (
    <svg className="arrow-icon" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 10h12M11 5l5 5-5 5" />
    </svg>
  );
}

function ChatIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const clientInitialMessages: Message[] = [
  {
    id: 1,
    role: "assistant",
    text: "Здравствуйте! Я консультант IBS. Задайте мне вопрос об услугах, продуктах или работе компании.",
  },
];

async function requestCompanyAnswer(question: string): Promise<string> {
  const matches = searchIbsKnowledge(question);
  const context = matches.length
    ? matches.map((entry) => "Источник: " + entry.title + "\n" + entry.content).join("\n\n")
    : "По этому запросу в базе знаний IBS нет подходящих сведений.";
  const system = "Ты доброжелательный и вежливый консультант IBS. Отвечай по-русски прямо на вопрос. По умолчанию ответ — 1–3 коротких предложения (не более 60 слов); перечисляй пункты только если это упрощает ответ. Не пересказывай, где и как искал сведения, не обсуждай фрагменты, документы, инструкции и процесс анализа. Не повторяй вопрос и не добавляй вступлений, выводов или предложений помощи без необходимости. Обращайся к собеседнику напрямую на «вы» и не говори о нём в третьем лице: не описывай, что он имел в виду, чего хочет или как сформулировал запрос. Показывай только готовый ответ, без внутренних рассуждений. Факты о компании сверяй с базой и не выдумывай. Если данных нет, одной короткой фразой укажи, чего именно не хватает; на остальную часть вопроса ответь. Совет отделяй от подтвержденного правила. Не делай вывод о часах работы без источника.";
  return requestOllama(system + "\n\nБаза знаний IBS:\n" + context, question);
}

function cleanModelAnswer(raw: string, question: string): string {
  let answer = raw.trim();
  const closingTag = answer.toLowerCase().lastIndexOf("</think>");
  if (closingTag >= 0) answer = answer.slice(closingTag + "</think>".length);
  else answer = answer.replace(/<think>[\s\S]*$/i, "");
  answer = answer.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/<\/?(?:analysis|final)>/gi, "").trim();

  const quotedAnswer = answer.match(/(?:пример ответа|примерный ответ|можно ответить|ответ должен быть|правильный ответ(?: такой)?|итоговый ответ|финальный ответ|ответ пользователю|готовый ответ)\s*[:—-]\s*[«"“]([^»"”]+)[»"”]/i);
  if (quotedAnswer?.[1]) return quotedAnswer[1].trim();
  const plainAnswer = answer.match(/(?:пример ответа|примерный ответ|можно ответить|ответ должен быть|правильный ответ(?: такой)?|итоговый ответ|финальный ответ|ответ пользователю|готовый ответ)\s*[:—-]\s*([^\n]+)/i);
  if (plainAnswer?.[1]) {
    const extracted = plainAnswer[1].replace(/[«"“]|[»"”]/g, "").split(/\s+(?=(?:но нужно проверить|однако|важно проверить|проверяю|сначала проверю)\b)/i)[0]?.trim();
    if (extracted) return extracted;
  }

  const markedFinal = answer.match(/(?:^|\n)\s*(?:итоговый ответ|финальный ответ|ответ пользователю|готовый ответ)\s*[:—-]\s*([\s\S]*)$/i);
  if (markedFinal?.[1]) answer = markedFinal[1].trim();

  const thoughtPattern = /(?:хорошо,?\s*пользователь|пользователь (?:написал|спрашивает|задал)|мне нужно ответить|поскольку в документах|возможно,?\s*пользователь|пользователь,?\s*возможно|нужно предложить помощь|в задании сказано|согласно инструкции|надо избегать|важно не показывать|пример ответа|следовательно,? ответ должен быть|значит,? нужно ответить|проверяю,?\s*есть ли|сначала проверю|нужно ответить по-русски|необходимо ответить|не удалось ответить кратко|не удалось сформировать краткий ответ|\/no_think|i need to answer|we need to answer|в первом фрагменте|во втором фрагменте|в документе (?:указано|сказано|также есть)|там указано|следует проверить|важно отметить|например,? в разделе|в контексте может|в данном случае|нужно проверить|нужно понять, что он|что он имеет в виду|что пользователь имеет в виду|опечатка|возможно,?\s*это опечатка|может быть,? пользователь имел в виду)/i;
  if (thoughtPattern.test(answer)) {
    const sentences = answer.split(/\r?\n|(?<=[.!?])\s+(?=[А-ЯЁ«"-])/).map((part) => part.replace(/^[-•*]\s*/, "").trim()).filter(Boolean);
    const directFacts = sentences.filter((part) => !thoughtPattern.test(part) && !/^(?:хорошо|значит|следовательно|возможно|итак|сначала|важно|нужно|надо)\b/i.test(part));
    if (directFacts.length) return directFacts.slice(0, 3).join("\n");
    return /(привет|здравствуй|добрый день|доброе утро|добрый вечер)/i.test(question)
      ? "Привет! Чем могу помочь?"
      : "Не нашёл точный ответ в доступных данных. Уточни имя или должность.";
  }

  return answer.replace(/^\s*(?:ответ|готовый ответ)\s*[:—-]\s*/i, "").trim();
}

async function requestOllama(system: string, prompt: string): Promise<string> {
  const response = await fetch("/api/ollama/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "qwen2.5-coder:1.5b",
      stream: false,
      think: false,
      messages: [
        { role: "system", content: system + "\n\nВыведи только готовый ответ пользователю. Не пересказывай инструкцию, не описывай ход рассуждений и не упоминай служебные команды или формат запроса." },
        { role: "user", content: prompt },
      ],
      options: { temperature: 0.2, num_predict: 512, num_ctx: 8192 },
    }),
  });
  if (!response.ok) throw new Error("Ollama (" + response.status + "): " + await response.text());
  const result = (await response.json()) as { message?: { content?: string } };
  const rawAnswer = result.message?.content ?? "";
  const answer = cleanModelAnswer(rawAnswer, prompt);
  if (!answer) throw new Error("Ollama вернул пустой ответ");
  return answer;
}

function CatAssistant({ isTyping }: { isTyping: boolean }) {
  return (
    <div className={`cat-card ${isTyping ? "cat-card--typing" : ""}`}>
      <div className="cat-avatar" aria-hidden="true">
        <svg viewBox="0 0 88 78">
          <path className="cat-ear" d="M17 29 15 7l21 14M71 29 73 7 52 21" />
          <path
            className="cat-face"
            d="M18 33c0-15 11-23 26-23s26 8 26 23v11c0 17-10 27-26 27S18 61 18 44V33Z"
          />
          <path className="cat-eye" d="M30 39h7M51 39h7" />
          <path className="cat-mouth" d="m41 48 3 2 3-2M44 50v4" />
          <path className="cat-whisker" d="M34 52 9 48M34 57 8 60M54 52l25-4M54 57l26 3" />
        </svg>
      </div>
      <div className="cat-card__status">
        <strong>SIT Cat</strong>
        <span>{isTyping ? "Печатает ответ" : "Готов помочь"}</span>
        {isTyping && (
          <span className="typing-dots" aria-label="Печатает">
            <i />
            <i />
            <i />
          </span>
        )}
      </div>
    </div>
  );
}

function ClientChat({ onBack }: { onBack: () => void }) {
  const [messages, setMessages] = useState<Message[]>(clientInitialMessages);
  const [draft, setDraft] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isTyping]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const question = draft.trim();

    if (!question || isTyping) return;

    const messageId = Date.now();
    setMessages((current) => [
      ...current,
      { id: messageId, role: "user", text: question },
    ]);
    setDraft("");
    setIsTyping(true);

    try {
      const answer = await requestCompanyAnswer(question);
      setMessages((current) => [
        ...current,
        { id: messageId + 1, role: "assistant", text: answer },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: messageId + 1,
          role: "assistant",
          text: error instanceof Error ? error.message : "Не удалось получить ответ. Проверьте, что Ollama запущен, и попробуйте ещё раз.",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <main className="client-page">
      <div className="ambient ambient--left" />
      <div className="ambient ambient--right" />

      <nav className="topbar" aria-label="Навигация клиентского чата">
        <button className="brand brand--button" type="button" onClick={onBack} aria-label="IBS — на главную">
          <BrandMark />
          <span>IBS</span>
        </button>
        <button className="back-link" type="button" onClick={onBack}>
          <ChatIcon>
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </ChatIcon>
          На главную
        </button>
      </nav>

      <section className="client-shell">
        <aside className="client-sidebar">
          <CatAssistant isTyping={isTyping} />
          <div className="client-sidebar__copy">
            <span>КЛИЕНТСКИЙ ПОМОЩНИК</span>
            <h2>Спросите о компании</h2>
            <p>
              Помощник отвечает только по услугам, продуктам, условиям и работе
              компании.
            </p>
          </div>
          <div className="question-starters">
            <span>МОЖНО СПРОСИТЬ</span>
            <button type="button" onClick={() => setDraft("Какие услуги предлагает IBS?")} disabled={isTyping}>Какие услуги предлагает IBS?</button>
            <button type="button" onClick={() => setDraft("Расскажите кратко о компании IBS")} disabled={isTyping}>О компании IBS</button>
            <button type="button" onClick={() => setDraft("Где узнать часы работы компании?")} disabled={isTyping}>Часы работы</button>
          </div>
        </aside>

        <div className="company-chat">
          <header className="company-chat__header">
            <div>
              <span className="status-dot" />
              <strong>Консультант компании</strong>
            </div>
            <span>Ответы на основе корпоративной базы знаний</span>
          </header>

          <div className="chat-messages" aria-live="polite">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`chat-message chat-message--${message.role}`}
              >
                <span>{message.role === "assistant" ? "IBS AI" : "ВЫ"}</span>
                <p>{message.text}</p>
              </div>
            ))}
            {isTyping && (
              <ThinkingIndicator kind="client" />
            )}
            <div ref={messagesEndRef} aria-hidden="true" />
          </div>

          <form className="chat-composer" onSubmit={handleSubmit}>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              rows={1}
              placeholder="Задайте вопрос о компании..."
              aria-label="Вопрос о компании"
            />
            <button type="submit" disabled={isTyping} aria-label="Отправить вопрос">
              <ChatIcon>
                <path d="m22 2-7 20-4-9-9-4Z" />
                <path d="M22 2 11 13" />
              </ChatIcon>
            </button>
            <small>
              Помощник не отвечает на вопросы, не связанные с компанией
            </small>
          </form>
        </div>
      </section>
    </main>
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} КБ`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

function ThinkingIndicator({ kind }: { kind: "client" | "documents" | "staff" }) {
  const [step, setStep] = useState(0);
  const steps = kind === "documents"
    ? ["Читаю общие документы…", "Ищу нужные сведения…", "Готовлю короткий ответ…"]
    : kind === "staff"
      ? ["Сверяюсь с базой знаний…", "Подбираю полезные детали…", "Готовлю короткий ответ…"]
      : ["Разбираюсь в вопросе…", "Подбираю нужные сведения…", "Формулирую ответ…"];
  useEffect(() => {
    const timer = window.setInterval(() => setStep((current) => (current + 1) % steps.length), 1500);
    return () => window.clearInterval(timer);
  }, [steps.length]);
  return (
    <div className="chat-message chat-message--typing thinking-message">
      <span>{kind === "client" ? "SIT CAT" : "SIT AI"}</span>
      <div className="thinking-status" aria-live="polite">
        <span className="thinking-pulse" aria-hidden="true" />
        <span>{steps[step]}</span>
        <span className="message-dots" aria-hidden="true"><i /><i /><i /></span>
      </div>
    </div>
  );
}

function DocumentPreview({ file, onClose }: { file: UploadedFile; onClose: () => void }) {
  return (
    <div className="document-preview-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="document-preview" role="dialog" aria-modal="true" aria-labelledby="document-preview-title">
        <header>
          <div><span>ОБЩИЙ ДОКУМЕНТ</span><h2 id="document-preview-title">{file.name}</h2><small>{file.size}</small></div>
          <button type="button" onClick={onClose} aria-label="Закрыть просмотр">×</button>
        </header>
        <pre>{file.content}</pre>
      </section>
    </div>
  );
}

function normalizeSearchToken(token: string): string {
  let normalized = token.toLowerCase().replace(/ё/g, "е");
  if (normalized.length > 5) normalized = normalized.replace(/(?:иями|ями|ами|ого|ему|ыми|ими|ее|ие|ые|ая|яя|ой|ый|ий|ом|ем|ам|ям|ах|ях|ов|ев|ей|ую|юю|а|я|ы|и|е|у|ю|о)$/u, "");
  return normalized;
}

function selectRelevantDocumentContext(question: string, files: UploadedFile[]): string {
  const stopWords = new Set(["что", "это", "как", "где", "когда", "есть", "для", "при", "про", "или", "мне", "нам", "вас", "вам", "они", "она", "оно", "кто", "чем", "могу", "можно", "пожалуйста", "скажите", "расскажи", "расскажите", "найди", "покажи", "документ", "файл"]);
  const terms = [...new Set((question.toLowerCase().replace(/ё/g, "е").match(/[a-zа-я0-9]{3,}/giu) ?? []).map(normalizeSearchToken).filter((term) => term.length > 1 && !stopWords.has(term)))];
  const chunks: Array<{ name: string; text: string; index: number; score: number }> = [];
  for (const file of files) {
    const content = file.content.replace(/\r\n/g, "\n");
    const chunkSize = 2600;
    const overlap = 280;
    let start = 0;
    let index = 0;
    while (start < content.length) {
      let end = Math.min(start + chunkSize, content.length);
      if (end < content.length) {
        const boundary = content.lastIndexOf("\n", end);
        if (boundary > start + 1500) end = boundary;
      }
      const text = content.slice(start, end).trim();
      if (text) {
        const tokenSet = (file.name + " " + text).toLowerCase().replace(/ё/g, "е").match(/[a-zа-я0-9]{3,}/giu) ?? [];
        const normalizedTokens = tokenSet.map(normalizeSearchToken);
        let score = 0;
        for (const term of terms) {
          const hits = normalizedTokens.filter((token) => token === term || (term.length >= 4 && (token.startsWith(term) || term.startsWith(token)))).length;
          score += Math.min(hits, 3) * 2;
        }
        chunks.push({ name: file.name, text, index, score });
      }
      if (end >= content.length) break;
      start = Math.max(start + 1, end - overlap);
      index += 1;
    }
  }
  const relevant = chunks.filter((chunk) => chunk.score > 0).sort((a, b) => b.score - a.score || a.index - b.index);
  if (!relevant.length) return "Подходящих фрагментов в загруженных документах не найдено.";
  const selected: typeof relevant = [];
  let totalChars = 0;
  for (const chunk of relevant) {
    const cost = chunk.text.length + chunk.name.length + 24;
    if (selected.length >= 5 || totalChars + cost > 9000) continue;
    selected.push(chunk);
    totalChars += cost;
  }
  return selected.map((chunk) => "Документ «" + chunk.name + "» (фрагмент " + (chunk.index + 1) + "):\n" + chunk.text).join("\n\n---\n\n");
}

async function requestEmployeeAnswer(mode: EmployeeMode, question: string, files: UploadedFile[]): Promise<string> {
  const documentContext = selectRelevantDocumentContext(question, files.filter((file) => file.content.trim()));
  if (!documentContext) throw new Error("В загруженных файлах не найден поддерживаемый текст");
  const system = mode === "documents"
    ? "Ты полезный ассистент по документам. Отвечай прямо на вопрос, обычно 1–3 короткими предложениями и не более 60 слов. Не пересказывай поиск, документы, фрагменты и ход анализа. Не добавляй вступлений и повторов. Обращайся к собеседнику напрямую и не описывай его в третьем лице. Для фактов используй документы; не выдавай предположения за факты. Если данных не хватает, коротко назови пробел и ответь на то, что подтверждается. Показывай только готовый ответ, без внутренних рассуждений и служебных тегов."
    : "Ты коллега по команде: дружелюбно, на равных и естественно, на «ты». Отвечай сразу по сути, обычно 1–3 короткими предложениями и не более 60 слов. Не пересказывай поиск, документы и ход анализа; не добавляй вступлений или повторов. Для фактов используй документы, советы отделяй от правил. Если данных не хватает, коротко обозначь пробел и помоги с остальной частью задачи. Показывай только готовый ответ, без внутренних рассуждений и служебных тегов.";
  return requestOllama(system + "\n\nФрагменты загруженных документов:\n" + documentContext, question);
}

const privateDocumentsDatabase = "sit-private-documents";
const privateDocumentsStore = "documents";

function openPrivateDocumentsDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) { reject(new Error("Этот браузер не поддерживает сохранение документов.")); return; }
    const request = window.indexedDB.open(privateDocumentsDatabase, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(privateDocumentsStore)) database.createObjectStore(privateDocumentsStore, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Не удалось открыть хранилище документов."));
    request.onblocked = () => reject(new Error("Закройте другие вкладки сайта и повторите попытку."));
  });
}

async function loadPrivateDocuments(): Promise<UploadedFile[]> {
  const database = await openPrivateDocumentsDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(privateDocumentsStore, "readonly");
    const request = transaction.objectStore(privateDocumentsStore).getAll();
    request.onsuccess = () => resolve(request.result as UploadedFile[]);
    request.onerror = () => reject(request.error ?? new Error("Не удалось прочитать документы."));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => { database.close(); reject(transaction.error ?? new Error("Не удалось прочитать документы.")); };
  });
}

async function savePrivateDocument(document: UploadedFile): Promise<void> {
  const database = await openPrivateDocumentsDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(privateDocumentsStore, "readwrite");
    transaction.objectStore(privateDocumentsStore).put(document);
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onerror = () => { database.close(); reject(transaction.error ?? new Error("Недостаточно места в хранилище браузера.")); };
    transaction.onabort = () => { database.close(); reject(transaction.error ?? new Error("Браузер не сохранил документ.")); };
  });
}

async function deletePrivateDocument(id: string): Promise<void> {
  const database = await openPrivateDocumentsDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(privateDocumentsStore, "readwrite");
    transaction.objectStore(privateDocumentsStore).delete(id);
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onerror = () => { database.close(); reject(transaction.error ?? new Error("Не удалось удалить документ.")); };
    transaction.onabort = () => { database.close(); reject(transaction.error ?? new Error("Не удалось удалить документ.")); };
  });
}


function EmployeeWorkspace({
  mode,
  onBack,
}: {
  mode: EmployeeMode;
  onBack: () => void;
}) {
  const isDocuments = mode === "documents";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<UploadedFile[]>(() => [{
    id: "demo-company-sample",
    name: "IBS-и-команда-проекта.txt",
    size: formatFileSize(new Blob([demoCompanyDocument]).size),
    content: demoCompanyDocument,
  }]);
  const [draft, setDraft] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "assistant",
      text: isDocuments
        ? "Добавил справочный документ об IBS и команде учебного проекта. Спросите об услугах, продуктах, руководстве IBS или вкладе участников проекта."
        : "Я добавил небольшой пример документа. Загрузи материалы команды — разберёмся с рабочими вопросами вместе.",
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isTyping]);

  useEffect(() => {
    let isMounted = true;
    void loadPrivateDocuments().then((storedDocuments) => {
      if (!isMounted) return;
      setFiles((current) => {
        const demoFile = current.find((file) => file.id === "demo-company-sample");
        return demoFile ? [demoFile, ...storedDocuments] : storedDocuments;
      });
      setUploadError("");
    }).catch((error) => {
      if (isMounted) setUploadError(error instanceof Error ? error.message : "Не удалось открыть документы в этом браузере.");
    });
    return () => { isMounted = false; };
  }, []);

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const selectedFiles = Array.from(input.files ?? []);
    setUploadError("");
    try {
      for (const file of selectedFiles) {
        if (!/\.(txt|csv)$/i.test(file.name)) throw new Error("Поддерживаются только файлы TXT и CSV.");
        if (file.size > 55 * 1024) throw new Error("Максимальный размер одного документа — 55 КБ.");
        const content = await file.text();
        const document: UploadedFile = {
          id: "private-" + window.crypto.randomUUID(),
          name: file.name,
          size: formatFileSize(file.size),
          content,
        };
        await savePrivateDocument(document);
        setFiles((current) => [document, ...current.filter((item) => item.id !== document.id)]);
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Не удалось сохранить документ в этом браузере.");
    } finally {
      input.value = "";
    }
  };

  const handleDeleteFile = async (file: UploadedFile) => {
    if (file.id === "demo-company-sample") return;
    if (!window.confirm("Удалить «" + file.name + "» из хранилища этого браузера?")) return;
    setUploadError("");
    try {
      await deletePrivateDocument(file.id);
      setFiles((current) => current.filter((item) => item.id !== file.id));
      setSelectedFile((current) => current?.id === file.id ? null : current);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Не удалось удалить документ.");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const question = draft.trim();

    if (!question || isTyping || files.length === 0) return;

    const messageId = Date.now();
    setMessages((current) => [
      ...current,
      { id: messageId, role: "user", text: question },
    ]);
    setDraft("");
    setIsTyping(true);

    try {
      const answer = await requestEmployeeAnswer(mode, question, files);
      setMessages((current) => [
        ...current,
        { id: messageId + 1, role: "assistant", text: answer },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: messageId + 1,
          role: "assistant",
          text: error instanceof Error ? error.message : "Не удалось получить ответ от ИИ. Проверьте подключение и попробуйте ещё раз.",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <main className="client-page employee-page">
      <div className="ambient ambient--left" />
      <div className="ambient ambient--right" />

      <nav className="topbar" aria-label="Навигация рабочего пространства">
        <button className="brand brand--button" type="button" onClick={onBack} aria-label="IBS — на главную">
          <BrandMark />
          <span>IBS</span>
        </button>
        <button className="back-link" type="button" onClick={onBack}>
          <ChatIcon>
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </ChatIcon>
          На главную
        </button>
      </nav>

      <section className="client-shell employee-shell">
        <aside className="employee-sidebar">
          <div className="employee-sidebar__heading">
            <span>{isDocuments ? "АНАЛИЗ МАТЕРИАЛОВ" : "БАЗА ДЛЯ СОТРУДНИКОВ"}</span>
            <h2>
              {isDocuments ? "Работа с документами" : "Работа с сотрудниками"}
            </h2>
            <p>
              {isDocuments
                ? "Добавляйте документы частями или целыми пакетами."
                : "Сформируйте корпоративную базу знаний для команды."}
            </p>
          </div>

          <input
            ref={fileInputRef}
            className="visually-hidden"
            type="file"
            multiple
            accept=".txt,.csv"
            onChange={handleFiles}
          />
          <button
            className="upload-card"
            type="button"
            onClick={() => fileInputRef.current?.click()}
          >
            <ChatIcon>
              <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" />
              <path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
            </ChatIcon>
            <span>
              <strong>Загрузить документы</strong>
              <small>TXT/CSV · до 55 КБ · только в этом браузере</small>
            </span>
          </button>
          {uploadError && <p className="employee-files__empty" role="alert">{uploadError}</p>}

          <div className="employee-files">
            <div className="employee-files__header">
              <span>ДОКУМЕНТЫ</span>
              <b>{files.length}</b>
            </div>
            {files.length === 0 ? (
              <p className="employee-files__empty">Файлы ещё не добавлены</p>
            ) : (
              files.map((file) => (
                <div className="employee-file" key={file.id}>
                  <button className="employee-file__open" type="button" onClick={() => setSelectedFile(file)} aria-label={"Открыть " + file.name} title={file.name}>
                    <ChatIcon>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                      <path d="M14 2v6h6" />
                    </ChatIcon>
                    <span><strong>{file.name}</strong><small>{file.size}</small></span>
                  </button>
                  {file.id !== "demo-company-sample" && <button className="employee-file__delete" type="button" onClick={() => void handleDeleteFile(file)} aria-label={"Удалить " + file.name} title="Удалить у всех">×</button>}
                </div>
              ))
            )}
          </div>

          <div className="model-connect" aria-label="Подключенная модель">
            <span className="status-dot" />
            <span>
              <strong>Ollama · qwen2.5-coder:1.5b</strong>
              <small>Модель подключена</small>
            </span>
          </div>
        </aside>

        <div className="company-chat">
          <header className="company-chat__header">
            <div>
              <span className="status-dot" />
              <strong>
                {isDocuments ? "Ассистент по документам" : "Корпоративный коллега"}
              </strong>
            </div>
            <span>
              {isDocuments
                ? "Отвечает только по загруженным файлам"
                : "Обсудим рабочие вопросы по-командному"}
            </span>
          </header>

          <div className="chat-messages" aria-live="polite">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`chat-message chat-message--${message.role}`}
              >
                <span>{message.role === "assistant" ? "SIT AI" : "ВЫ"}</span>
                <p>{message.text}</p>
              </div>
            ))}
            {isTyping && (
              <ThinkingIndicator kind={isDocuments ? "documents" : "staff"} />
            )}
            <div ref={messagesEndRef} aria-hidden="true" />
          </div>

          <form className="chat-composer" onSubmit={handleSubmit}>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              rows={1}
              disabled={files.length === 0}
              placeholder={
                files.length === 0
                  ? "Сначала загрузите документы..."
                  : isDocuments
                    ? "Задайте вопрос по документам..."
                    : "Задайте рабочий вопрос..."
              }
              aria-label="Сообщение"
            />
            <button
              type="submit"
              disabled={isTyping || files.length === 0}
              aria-label="Отправить вопрос"
            >
              <ChatIcon>
                <path d="m22 2-7 20-4-9-9-4Z" />
                <path d="M22 2 11 13" />
              </ChatIcon>
            </button>
            <small>
              {isDocuments
                ? "Ответ формируется исключительно по выбранным документам"
                : "Помогу разобраться в рабочих материалах и задачах"}
            </small>
          </form>
        </div>
      </section>
      {selectedFile && <DocumentPreview file={selectedFile} onClose={() => setSelectedFile(null)} />}
    </main>
  );
}

function RoleCard({
  option,
  onSelect,
  onEmployeeMode,
  isSelected,
}: {
  option: RoleOption;
  onSelect: (role: Role) => void;
  onEmployeeMode: (mode: EmployeeMode) => void;
  isSelected: boolean;
}) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (
      option.id === "client" &&
      (event.key === "Enter" || event.key === " ")
    ) {
      event.preventDefault();
      onSelect(option.id);
    }
  };

  return (
    <div
      className={`role-card role-card--${option.id} ${isSelected ? "role-card--selected" : ""}`}
      role={option.id === "client" ? "button" : "group"}
      tabIndex={0}
      aria-label={option.title}
      aria-pressed={option.id === "client" ? isSelected : undefined}
      onClick={() => onSelect(option.id)}
      onKeyDown={handleKeyDown}
    >
      <div className="role-icon">{option.icon}</div>
      <p className="role-card__title">{option.title}</p>
      <ArrowIcon />
      {option.id === "employee" && (
        <div className="employee-options">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onEmployeeMode("documents");
            }}
          >
            <ChatIcon>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
              <path d="M14 2v6h6M8 13h8M8 17h5" />
            </ChatIcon>
            <span>Работа с документами</span>
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onEmployeeMode("staff");
            }}
          >
            <ChatIcon>
              <circle cx="9" cy="8" r="4" />
              <path d="M3 21v-2a6 6 0 0 1 12 0v2M16 3.5a4 4 0 0 1 0 7.7M18 15a6 6 0 0 1 3 5.2" />
            </ChatIcon>
            <span>Работа с сотрудниками</span>
          </button>
        </div>
      )}
    </div>
  );
}


export default function App() {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isClientChatOpen, setIsClientChatOpen] = useState(false);
  const [employeeMode, setEmployeeMode] = useState<EmployeeMode | null>(null);

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    if (role === "client") {
      setIsClientChatOpen(true);
    }
  };

  if (isClientChatOpen) {
    return <ClientChat onBack={() => setIsClientChatOpen(false)} />;
  }

  if (employeeMode) {
    return <EmployeeWorkspace mode={employeeMode} onBack={() => setEmployeeMode(null)} />;
  }

  return (
    <main className="welcome">
      <div className="ambient ambient--left" />
      <div className="ambient ambient--right" />

      <nav className="topbar" aria-label="Главная навигация">
        <button className="brand brand--button" type="button" onClick={() => { setIsClientChatOpen(false); setEmployeeMode(null); setSelectedRole(null); }} aria-label="IBS — на главную">
          <BrandMark />
          <span>IBS</span>
        </button>
        <div className="assistant-badge">
          <span className="status-dot" />
          Всегда на связи
        </div>
      </nav>

      <section className="welcome__content">
        <div className="intro">
          <div className="ai-label">
            <span className="ai-label__spark">✦</span>
            IBS · помощник для клиентов и команды
          </div>
          <h1>
            Помощник IBS.
            <br />
            <span>Внедрение ИИ</span>
          </h1>
          <p className="intro__copy">
            Справка по услугам, внутренним материалам и повседневным задачам команды.
          </p>
        </div>

        <div className="role-section">
          <div className="role-section__header">
            <p>Выберите роль</p>
          </div>

          <div className="role-grid">
            {roleOptions.map((option) => (
              <RoleCard
                key={option.id}
                option={option}
                onSelect={handleRoleSelect}
                onEmployeeMode={setEmployeeMode}
                isSelected={selectedRole === option.id}
              />
            ))}
          </div>
        </div>
      </section>

      <footer>
        <span className="footer-meta">SIT · Защищено</span>
      </footer>
    </main>
  );
}
