import handleList from './list';
import handleAddAdmin from './add_admin';
import handleRemoveAdmin from './remove_admin';
import type { CacheType, ChatInputCommandInteraction } from 'discord.js';
import handleReminder, { handleStopReminder } from './reminder';
import handleLeaderboards from './main/handleLeaderboards';

const commandHandlers: Record<string, (interaction: ChatInputCommandInteraction<CacheType>) => Promise<any>> = {
  // list: handleList,
  // add_admin: handleAddAdmin,
  // remove_admin: handleRemoveAdmin,
  // reminder: handleReminder,
  // stop_reminder: handleStopReminder,
  leaderboards: handleLeaderboards,
};

export default commandHandlers;