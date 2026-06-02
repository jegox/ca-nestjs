import { Module } from '@nestjs/common';
import { IAIAdapter } from '@domain/adapters';
import { OpenAIAdapter } from '@infrastructure/adapters/openai.adapter';

@Module({
  providers: [
    {
      provide: IAIAdapter,
      useClass: OpenAIAdapter,
    },
  ],
  exports: [IAIAdapter],
})
export class AIModule {}
