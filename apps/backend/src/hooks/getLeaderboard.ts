import { prisma } from "../db"
import { getDiscordUserCached } from "./getDiscordUser"

export const getLeaderboard = async (pastCutoff: Date, guildId: string) => {
	const users = await prisma.voiceSession.groupBy({
		by: ["userId"],
		where: {
			guildId,
			OR: [
				{ status: "ACTIVE" },
				{
					status: "PAST",
					leftAt: { gte: pastCutoff }
				}
			]
		},
		_sum: { durationSeconds: true },
		orderBy: { _sum: { durationSeconds: "desc" } }
	})

	const activeSessions = await prisma.voiceSession.findMany({
		where: { guildId, status: "ACTIVE" },
		select: { userId: true, joinedAt: true }
	})
	const timeByUser = new Map(
		users.map(({ userId, _sum }) => [userId, _sum.durationSeconds ?? 0])
	)
	for (const session of activeSessions) {
		const elapsedSeconds = Math.max(
			0,
			Math.floor((Date.now() - session.joinedAt.getTime()) / 1000)
		)
		timeByUser.set(
			session.userId,
			(timeByUser.get(session.userId) ?? 0) + elapsedSeconds
		)
	}

	return Promise.all(
		[...timeByUser.entries()]
			.sort(([, firstTime], [, secondTime]) => secondTime - firstTime)
			.map(async ([userId, timeSpent]) => {
				const hours = Math.floor(timeSpent / 3600)
				const minutes = Math.floor((timeSpent % 3600) / 60)

				return {
					user: await getDiscordUserCached(userId),
					timeSpent,
					formattedTimeSpent: `${hours}h ${minutes}m`
				}
			})
	)
}