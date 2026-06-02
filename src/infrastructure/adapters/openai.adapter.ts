import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { IAIAdapter, AIOptions, ChatMessage } from '@domain/adapters';

@Injectable()
export class OpenAIAdapter implements IAIAdapter {
  private readonly logger = new Logger(OpenAIAdapter.name);
  private readonly client: OpenAI;
  private readonly defaultModel = 'gpt-4o-mini';

  constructor(configService: ConfigService) {
    const apiKey = configService.get<string>('config.ai.openaiApiKey') ?? '';
    this.client = new OpenAI({ apiKey });
  }

  async complete(prompt: string, options?: AIOptions): Promise<string> {
    this.logger.log('[complete] Sending completion request');

    const response = await this.client.chat.completions.create({
      model: options?.model ?? this.defaultModel,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens,
      messages: [{ role: 'user', content: prompt }],
    });

    return response.choices[0]?.message?.content ?? '';
  }

  async chat(messages: ChatMessage[], options?: AIOptions): Promise<string> {
    this.logger.log(
      `[chat] Sending chat request with ${messages.length} messages`,
    );

    const response = await this.client.chat.completions.create({
      model: options?.model ?? this.defaultModel,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    });

    return response.choices[0]?.message?.content ?? '';
  }

  async embed(text: string): Promise<number[]> {
    this.logger.log('[embed] Generating embedding');

    const response = await this.client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    return response.data[0]?.embedding ?? [];
  }
}
