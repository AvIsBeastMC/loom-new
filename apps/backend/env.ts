import dotenvFlow from 'dotenv-flow';
const files = dotenvFlow.config();
import * as z from "zod";

const parseBoolean = (value: unknown) => {
  if (value === undefined || value === null || value === "") return false;
  return String(value).toLowerCase() === "true" || String(value) === "1";
};

const envVariables = z.object({
  DISCORD_BOT: z.string(),
  CRON_DATABASE_URL: z.string(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string(),
  RUN_TYPE: z.enum(["prod", "dev"]),
  SEND_EMBED_IN_VERIFICATION: z
    .preprocess((val) => parseBoolean(val), z.boolean())
    .default(false),
});

export const env = envVariables.parse(process.env)

console.log("ENV: " + JSON.stringify(env))

// declare global {
//   namespace NodeJS {
//     interface ProcessEnv extends z.infer<typeof envVariables> { }
//   }
// }