import { useState, useRef, useCallback } from "react";
import { generateEmail, TONE_LABELS, type Tone } from "./api.ts";

type Status = "idle" | "generating" | "success" | "error";

const TONES = Object.keys(TONE_LABELS) as Tone[];

// ─── Icons (inline SVG) ──────────────────────────────────────────────

function MailIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      <path d="M20 3v4" />
      <path d="M22 5h-4" />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function LoaderIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2v4" />
      <path d="m16.2 7.8 2.9-2.9" />
      <path d="M18 12h4" />
      <path d="m16.2 16.2 2.9 2.9" />
      <path d="M12 18v4" />
      <path d="m4.9 19.1 2.9-2.9" />
      <path d="M2 12h4" />
      <path d="m4.9 4.9 2.9 2.9" />
    </svg>
  );
}

function ReplyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="9 17 4 12 9 7" />
      <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
    </svg>
  );
}

// ─── Header ──────────────────────────────────────────────────────────

function Header() {
  return (
    <header className="pt-12 pb-8 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 mb-5">
        <MailIcon className="w-7 h-7 text-primary" />
      </div>
      <h1 className="text-2xl font-bold text-grey-900 tracking-tight">
        MailCraft
      </h1>
      <p className="mt-2 text-base text-grey-500 max-w-md mx-auto">
        Transform your rough thoughts into polished, ready-to-send emails.
      </p>
    </header>
  );
}

// ─── Email Input ─────────────────────────────────────────────────────

function EmailInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="card p-6">
      <label
        htmlFor="raw-thoughts"
        className="block text-sm font-semibold text-grey-800 mb-2"
      >
        What do you want to say?
      </label>
      <p className="text-sm text-grey-500 mb-3">
        Write your thoughts freely — grammar, structure, and polish are on us.
      </p>
      <textarea
        id="raw-thoughts"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={5}
        placeholder="e.g. Need to tell Sarah the project deadline moved to next Friday. Want to keep it positive but make sure she knows it's firm this time..."
        className="w-full resize-none rounded-lg border border-grey-200 bg-white px-4 py-3 text-base text-grey-900 placeholder:text-grey-400 shadow-input transition-shadow duration-200 focus:shadow-input-focus focus:border-primary focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
      />
      <div className="mt-2 text-right">
        <span className="text-xs text-grey-400">
          {value.length > 0 ? `${value.length} characters` : ""}
        </span>
      </div>
    </div>
  );
}

// ─── Reply Context ───────────────────────────────────────────────────

function ReplyContext({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-6 py-4 text-left cursor-pointer hover:bg-grey-100/50 transition-colors duration-200"
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-2 text-sm font-medium text-grey-600">
          <ReplyIcon className="w-4 h-4" />
          Replying to an email?
          {value.trim().length > 0 && !isOpen && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-xs text-primary font-medium">
              Added
            </span>
          )}
        </span>
        <ChevronDownIcon
          className={`w-4 h-4 text-grey-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <div
        className={`grid transition-all duration-300 ease-in-out ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-6 pb-5">
            <label htmlFor="reply-context" className="sr-only">
              Original email you are replying to
            </label>
            <textarea
              id="reply-context"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
              rows={4}
              placeholder="Paste the email you're replying to here..."
              className="w-full resize-none rounded-lg border border-grey-200 bg-grey-100/50 px-4 py-3 text-sm text-grey-800 placeholder:text-grey-400 shadow-input transition-shadow duration-200 focus:shadow-input-focus focus:border-primary focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tone Selector ───────────────────────────────────────────────────

function ToneSelector({
  selected,
  onSelect,
  disabled,
}: {
  selected: Tone;
  onSelect: (tone: Tone) => void;
  disabled: boolean;
}) {
  return (
    <div className="card p-6">
      <fieldset disabled={disabled}>
        <legend className="block text-sm font-semibold text-grey-800 mb-3">
          Choose a tone
        </legend>
        <div className="flex flex-wrap gap-2" role="radiogroup">
          {TONES.map((tone) => {
            const isSelected = tone === selected;
            return (
              <button
                key={tone}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => onSelect(tone)}
                disabled={disabled}
                className={`
                  inline-flex items-center px-4 py-2 rounded-full text-sm font-medium
                  transition-all duration-200 cursor-pointer
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${
                    isSelected
                      ? "bg-primary text-white shadow-button"
                      : "bg-grey-100 text-grey-600 hover:bg-grey-200 hover:text-grey-800"
                  }
                `}
              >
                {TONE_LABELS[tone]}
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}

// ─── Generate Button ─────────────────────────────────────────────────

function GenerateButton({
  onClick,
  disabled,
  isGenerating,
}: {
  onClick: () => void;
  disabled: boolean;
  isGenerating: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="btn-primary w-full py-3.5 text-base"
    >
      {isGenerating ? (
        <>
          <LoaderIcon className="w-4 h-4 animate-spin" />
          Crafting your email...
        </>
      ) : (
        <>
          <SparklesIcon className="w-4 h-4" />
          Generate Email
        </>
      )}
    </button>
  );
}

// ─── Email Output ────────────────────────────────────────────────────

function EmailOutput({
  email,
  status,
  onRegenerate,
}: {
  email: string;
  status: Status;
  onRegenerate: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = email;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [email]);

  if (status === "idle") return null;

  return (
    <div className="card animate-slide-up overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-grey-200">
        <h2 className="text-sm font-semibold text-grey-800">
          {status === "generating" ? "Generating..." : "Your Email"}
        </h2>
        {status === "success" && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRegenerate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-grey-600 hover:text-grey-800 hover:bg-grey-100 transition-colors duration-200 cursor-pointer"
              aria-label="Regenerate email"
            >
              <RefreshIcon className="w-3.5 h-3.5" />
              Regenerate
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className={`
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium
                transition-all duration-200 cursor-pointer
                ${
                  copied
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-primary/10 text-primary hover:bg-primary/20"
                }
              `}
              aria-label={copied ? "Copied to clipboard" : "Copy email to clipboard"}
            >
              {copied ? (
                <>
                  <CheckIcon className="w-3.5 h-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <CopyIcon className="w-3.5 h-3.5" />
                  Copy
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <div className="px-6 py-5">
        {status === "generating" && email.length === 0 ? (
          <div className="space-y-3">
            <div className="h-4 bg-grey-100 rounded animate-pulse w-3/4" />
            <div className="h-4 bg-grey-100 rounded animate-pulse w-full" />
            <div className="h-4 bg-grey-100 rounded animate-pulse w-5/6" />
            <div className="h-4 bg-grey-100 rounded animate-pulse w-2/3" />
          </div>
        ) : (
          <pre className="whitespace-pre-wrap font-sans text-base text-grey-800 leading-relaxed">
            {email}
            {status === "generating" && (
              <span className="inline-block w-0.5 h-5 bg-primary ml-0.5 animate-pulse align-text-bottom" />
            )}
          </pre>
        )}
      </div>
    </div>
  );
}

// ─── Error Banner ────────────────────────────────────────────────────

function ErrorBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div
      className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 animate-fade-in"
      role="alert"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-red-800">
            Something went wrong
          </p>
          <p className="mt-1 text-sm text-red-600">{message}</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-md p-1 text-red-400 hover:text-red-600 hover:bg-red-100 transition-colors duration-200 cursor-pointer"
          aria-label="Dismiss error"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="py-8 text-center">
      <p className="text-xs text-grey-400">
        Built with Claude. Your thoughts stay between you and the AI.
      </p>
    </footer>
  );
}

// ─── App ─────────────────────────────────────────────────────────────

export default function App() {
  const [rawThoughts, setRawThoughts] = useState("");
  const [replyContext, setReplyContext] = useState("");
  const [selectedTone, setSelectedTone] = useState<Tone>("professional");
  const [generatedEmail, setGeneratedEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const abortRef = useRef<AbortController | null>(null);

  const canGenerate = rawThoughts.trim().length > 0 && status !== "generating";

  const handleGenerate = useCallback(async () => {
    if (!canGenerate) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("generating");
    setGeneratedEmail("");
    setErrorMessage("");

    try {
      await generateEmail(
        rawThoughts.trim(),
        selectedTone,
        replyContext.trim() || null,
        (text) => setGeneratedEmail(text),
        controller.signal
      );
      setStatus("success");
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMessage(message);
      setStatus("error");
    }
  }, [rawThoughts, selectedTone, replyContext, canGenerate]);

  const handleRegenerate = useCallback(() => {
    handleGenerate();
  }, [handleGenerate]);

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-content px-5">
        <Header />

        <div className="space-y-4 pb-4">
          <EmailInput
            value={rawThoughts}
            onChange={setRawThoughts}
            disabled={status === "generating"}
          />

          <ReplyContext
            value={replyContext}
            onChange={setReplyContext}
            disabled={status === "generating"}
          />

          <ToneSelector
            selected={selectedTone}
            onSelect={setSelectedTone}
            disabled={status === "generating"}
          />

          <GenerateButton
            onClick={handleGenerate}
            disabled={!canGenerate}
            isGenerating={status === "generating"}
          />

          {status === "error" && errorMessage && (
            <ErrorBanner
              message={errorMessage}
              onDismiss={() => {
                setErrorMessage("");
                setStatus("idle");
              }}
            />
          )}

          <EmailOutput
            email={generatedEmail}
            status={status}
            onRegenerate={handleRegenerate}
          />
        </div>

        <Footer />
      </main>
    </div>
  );
}
