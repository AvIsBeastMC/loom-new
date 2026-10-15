import { prisma } from "../db";

export const getUserViolations = async (id: string) => {
  // 10 times over 10 minutes.
  const violations = await prisma.violation.findMany({
    where: {
      user: id,
      // the last 10 minutes?
      time: {
        gte: new Date(Date.now() - 10 * 60 * 1000)
      }
    }
  });

  return violations;
}