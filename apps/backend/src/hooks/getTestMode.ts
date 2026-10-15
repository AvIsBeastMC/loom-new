import { prisma } from "../db";
import { store } from "../store"
import { env } from "../../env";

type Data = {
  guild: {
    test_channel: string | null;
    test_mode: boolean;
  },
  server: {
    allTestMode: boolean,
    run_type: 'prod' | 'dev'
  }
}

export const getServerWideTestMode = () => {
  return store.getState().allTestMode;
}

export const getTestMode = async (guild: string): Promise<Data> => {
  const allTestMode = store.getState().allTestMode;

  const data = await prisma.discordServer.findUniqueOrThrow({
    where: {
      id: guild
    },
    select: {
      test_mode: true,
      test_channel: true
    }
  })
  return {
    guild: data,
    server: {
      allTestMode,
      run_type: env.RUN_TYPE
    }
  }
}