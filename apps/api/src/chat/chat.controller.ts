import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { chatRequestSchema, type ChatRequest, type ChatResponse } from '@vidntec/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ChatService } from './chat.service';

// Tighter than the orders/lookup precedent (10/min) since this hits a paid
// external API, not just the DB.
const CHAT_THROTTLE = { default: { limit: 8, ttl: 60_000 } };

@Controller('chat')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Post()
  @HttpCode(200)
  @Throttle(CHAT_THROTTLE)
  async send(
    @Body(new ZodValidationPipe(chatRequestSchema)) body: ChatRequest,
  ): Promise<ChatResponse> {
    const reply = await this.chat.reply(body.messages);
    return { reply };
  }
}
