export interface AIOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export abstract class IAIAdapter {
  abstract complete(prompt: string, options?: AIOptions): Promise<string>;
  abstract chat(messages: ChatMessage[], options?: AIOptions): Promise<string>;
  abstract embed(text: string): Promise<number[]>;
}
