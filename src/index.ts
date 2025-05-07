// index.ts
import { runOption1 } from './option1';
import { runOption2 } from './option2';
import chalk from 'chalk';
import inquirer from 'inquirer';

async function pressEnterToContinue() {
  // Prompt for input and only allow the Enter key to proceed
  await inquirer.prompt([
    {
      type: 'input',
      name: 'continue',
      message: chalk.gray('Press Enter to continue...'),
      filter: (input) => input, // Capture the input, but won't validate it yet
      validate: (input) => input === '' || 'Please press Enter to continue.',  // Only allow Enter key (empty input)
    },
  ]);
}

async function mainPrompt() {
  console.clear();
  console.log(chalk.bold.blue('SPL Token Account Closing Tool')); // Title in blue background
  console.log(chalk.gray('---------------------------------------------------------------')); // Gray separator line
  console.log(chalk.white('Tool that attempts to close all SPL token accounts that have\na valid state and a zero balance.')); // Description in bold white
  console.log(chalk.gray('---------------------------------------------------------------\n')); // Gray separator line
 
  try {
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'choice',
        message: chalk.bold.blue('Please select your wallet type:'), // Updated message
        choices: [
          { name: chalk.yellow('1. Hardware (use Ledger)'), value: '1' },
          { name: chalk.yellow('2. Keypair (use Private Key)'), value: '2' },
          { name: chalk.red('Exit'), value: '3' },
        ],
      },
    ]);

    switch (answers.choice) {
      case '1':
        console.log(chalk.greenBright('Running using a ledger wallet...'));
        await runOption1();
        await pressEnterToContinue(); // Wait for the user to press Enter before returning
        break;
      case '2':
        console.log(chalk.greenBright('Running using a keypair wallet...'));
        await runOption2();
        await pressEnterToContinue(); // Wait for the user to press Enter before returning
        break;
      case '3':
        console.log(chalk.redBright('Exiting...'));
        return;
      default:
        console.log(chalk.red('Invalid choice. Please select a valid option.'));
    }

    await mainPrompt(); // Return to the main menu
  } catch (err: any) {
    console.log(chalk.bgRed('An error occurred while processing your choice:'));
    console.error(chalk.redBright(err.message || err));
    await pressEnterToContinue(); // Pause and wait for Enter before returning to the main menu
    await mainPrompt();
  }
}

async function main() {
  await mainPrompt();
}

main().then(
  () => process.exit(),
  (err) => {
    console.error(chalk.bgRed('Unhandled error:'));
    console.error(chalk.redBright(err.message || err));
    process.exit(-1);
  }
);
