import 'dotenv/config';
import { Agenda } from 'agenda';
import { PostgresBackend } from '@agendajs/postgres-backend';
import { env } from '../../env';

const CRON_DATABASE_URL = env.CRON_DATABASE_URL

if (!CRON_DATABASE_URL) {
  throw 'Error: CRON_DATABASE_URL not set';
}

const postgresBackend = new PostgresBackend({
  connectionString: CRON_DATABASE_URL!,
});

const agenda = new Agenda({
  backend: postgresBackend,
});

export { agenda }