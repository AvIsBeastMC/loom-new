import { agenda } from "../cron";
import { prisma } from "../../db";
import type { Job } from "agenda";
import { google } from '@ai-sdk/google';
import { generateText, Output } from 'ai';
import { z } from 'zod';
import fs from 'node:fs'
import chalk from "chalk";
import classNames from "classnames";
import moment from "moment";
import { ai_messages_check_instruction } from "../instructions";
import { ai_messages_check_validation } from "@repo/extra-types";

export const defineSystemJob = () => {
  agenda.define('ai_messages_check', async (data: Job<{}>) => {
    console.log('ai_messages_check triggered', JSON.stringify(data.attrs.data));

    console.log(classNames(chalk.bgRed.white(moment().format('LLL')), chalk.bgWhite.black.bold('ai_messages_check'), 'Beginning operation...'));

    // get all messages for the day
    const today = new Date();

    // actually make this last 24 hours.
    const endOfToday = new Date();
    const startOfToday = moment().subtract(24, 'hours').toDate();

    try {
      const messages = await prisma.guildMessages.findMany({
        where: {
          dateTime: {
            gte: startOfToday,
            lt: endOfToday,
          },
        },
      });

      const finalMessages = messages.map((m) => {
        return {
          user_id: m.user.id,
          message_id: m.id,
          message_content: m.content
        }
      })

      console.log(classNames(chalk.bgRed.white(moment().format('LLL')), chalk.bgWhite.black.bold('ai_messages_check'), `Fetched ${finalMessages.length} messages successfully.`));

      console.log(classNames(chalk.bgRed.white(moment().format('LLL')), chalk.bgWhite.black.bold('ai_messages_check'), 'AI: Processing...'));

      const { output } = await generateText({
        model: google('gemma-4-31b-it'),
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text', text: ai_messages_check_instruction
              },
              {
                type: 'file',
                data: Buffer.from(JSON.stringify(finalMessages)), // Uint8Array, Buffer, or base64 string
                mediaType: 'application/json',
              },
            ],
          },
        ],
        output: Output.object({
          schema: ai_messages_check_validation
        }),
      });

      console.log(classNames(chalk.bgRed.white(moment().format('LLL')), chalk.bgWhite.black.bold('ai_messages_check'), '✅ Success!'));

      console.log(output)

      console.log(classNames(chalk.bgRed.white(moment().format('LLL')), chalk.bgWhite.black.bold('ai_messages_check'), 'Now posting to DB.'));

      const messagesFromOutput = output.violations.flatMap((v) => v.messageIdList);
      // using lodash, organize messages by guild id (message, guildId data is present in `messages`, use that to do the grouping for the message id strings coming out as output)
      // whats the following code doing exactly? how does it work? 
      // 1. filter messages to only those that are in the output (messagesFromOutput)
      // 2. map those messages to their guildId
      // 3. use Set to get unique guildIds
      const guildsFromMessages = [...new Set(messages.filter((m) => messagesFromOutput.includes(m.id)).map((m) => m.guildId))];

      const guildWiseReports = guildsFromMessages.map((g) => {
        // give me the violations for this guild from the output
        const violationsForGuild = output.violations.filter((v) => {
          const messageIdsForUser = v.messageIdList;
          const messagesForGuild = messages.filter((m) => m.guildId === g);
          const messageIdsForGuild = messagesForGuild.map((m) => m.id);
          // check if any of the messageIds for this user overlap with the messageIds for this guild
          return messageIdsForUser.some((id) => messageIdsForGuild.includes(id));
        })

        const usersFromViolationMessages = violationsForGuild.flatMap((v) => v.user)

        const violatorsForGuild = usersFromViolationMessages.map((u) => ({
          user: u,
          count: messages.filter((m) => m.user.id == u).length
        }))

        return {
          guildId: g,
          violators: violatorsForGuild,
          violations: violationsForGuild
        }
      })

      const posting = guildWiseReports.map((r) => prisma.violationReports.create({
        data: {
          report: {
            violations: r.violations,
            violators: r.violators
          },
          generatedBy: "SYSTEM",
          guild: {
            connectOrCreate: {
              create: {
                id: r.guildId
              },
              where: {
                id: r.guildId
              }
            }
          }
        }
      }));

      try {
        const transaction = await prisma.$transaction(posting);
        console.log(classNames(chalk.bgRed.white(moment().format('LLL')), chalk.bgWhite.black.bold('ai_messages_check'), '✅ Successfully posted to Database!'));
      } catch (error) {
        console.log(classNames(chalk.bgRed.white(moment().format('LLL')), chalk.bgWhite.red.bold('ai_messages_check'), 'Failed to report to DB'));
        console.log(error);
      }
    } catch (error) {
      console.log(classNames(chalk.bgRed.white(moment().format('LLL')), chalk.bgWhite.red.bold('ai_messages_check'), 'Failed!'));
      console.log(error);
    }
  }, { concurrency: 1 });
};