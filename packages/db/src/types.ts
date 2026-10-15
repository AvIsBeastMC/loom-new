// This file must be a module, so we include an empty export.
export { };

import type { ai_messages_check_validation } from '@repo/extra-types';
import { type APIGuildMemberUser } from 'discord-api-types/v10'
import { z } from 'zod';

declare global {
  namespace PrismaJson {
    // Define a type for a user's profile information.
    type DiscordUser = {
      username: string;
      icon: string;
      id: string;
    }
    type DiscordMessageInfo = {
      channelId: string;
      messageId: string;
    }
    type Violation = z.infer<typeof ai_messages_check_validation>
  }
}