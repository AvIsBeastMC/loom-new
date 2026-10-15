import chalk from 'chalk';

const errorLogger = ({errMessage, where} : {errMessage: string, where: string}) => {
  console.log(
    `${chalk.gray(new Date().toISOString())} ` +
    `${chalk.redBright("[ERROR]")} ` +
    `${chalk.bold.white(where)} ` +
    `${chalk.bold.redBright(errMessage)}`
  );
};

export default errorLogger;