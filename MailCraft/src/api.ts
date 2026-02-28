import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY as string,
  dangerouslyAllowBrowser: true,
});

export type Tone =
  | "professional"
  | "warm"
  | "concise"
  | "friendly"
  | "formal"
  | "persuasive"
  | "apologetic"
  | "grateful";

export const TONE_LABELS: Record<Tone, string> = {
  professional: "Professional",
  warm: "Warm",
  concise: "Concise",
  friendly: "Friendly",
  formal: "Formal",
  persuasive: "Persuasive",
  apologetic: "Apologetic",
  grateful: "Grateful",
};

const TONE_DESCRIPTIONS: Record<Tone, string> = {
  professional:
    "Clear, polished, and business-appropriate. Confident without being stiff.",
  warm:
    "Friendly and personable with genuine warmth. Approachable yet respectful.",
  concise:
    "Brief and to the point. Every sentence earns its place. No filler.",
  friendly:
    "Casual and upbeat. Like writing to a colleague you get along with.",
  formal:
    "Traditional business correspondence. Proper structure and courteous language.",
  persuasive:
    "Compelling and action-oriented. Builds a clear case with confident language.",
  apologetic:
    "Sincere and accountable. Acknowledges the issue and offers a path forward.",
  grateful:
    "Genuinely thankful and appreciative. Specific about what you value.",
};

function buildSystemPrompt(tone: Tone): string {
  return `You are an expert email writer. Your task is to transform the user's rough thoughts into a polished, well-structured email.

Tone: ${TONE_LABELS[tone]} — ${TONE_DESCRIPTIONS[tone]}

Rules:
- Write ONLY the email body. No subject line, no meta-commentary, no explanations.
- Start directly with the greeting (e.g., "Hi Sarah," or "Dear Mr. Thompson,").
- End with an appropriate sign-off (e.g., "Best regards," or "Thanks,") followed by a blank line for the sender's name.
- Match the tone precisely. Every word should feel intentional.
- Keep paragraphs short (2-3 sentences max) for readability.
- If the user provides context about an email they're replying to, weave in relevant references naturally.
- Never use placeholder brackets like [Name] — if information is missing, write around it gracefully.
- Do not include a subject line or any text before the greeting.`;
}

function buildUserMessage(
  rawThoughts: string,
  replyContext: string | null
): string {
  let message = `Here are my rough thoughts for this email:\n\n${rawThoughts}`;

  if (replyContext && replyContext.trim().length > 0) {
    message += `\n\n---\n\nThis is a reply to the following email:\n\n${replyContext}`;
  }

  return message;
}

export async function generateEmail(
  rawThoughts: string,
  tone: Tone,
  replyContext: string | null,
  onChunk: (text: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const stream = client.messages.stream(
    {
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: buildSystemPrompt(tone),
      messages: [
        {
          role: "user",
          content: buildUserMessage(rawThoughts, replyContext),
        },
      ],
    },
    { signal }
  );

  let fullText = "";

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      fullText += event.delta.text;
      onChunk(fullText);
    }
  }

  return fullText;
}
