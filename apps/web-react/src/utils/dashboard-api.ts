export function discordAvatar(userId: string, avatar: string | null): string {
  return avatar
    ? `https://cdn.discordapp.com/avatars/${userId}/${avatar}.png`
    : "https://cdn.discordapp.com/embed/avatars/0.png";
}

export function discordGuildIcon(guild: { id: string; icon: string | null }): string {
  return guild.icon
    ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
    : "https://cdn.discordapp.com/embed/avatars/0.png";
}