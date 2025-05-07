import { 
  Connection, 
  PublicKey, 
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID, 
  AccountLayout,
  createCloseAccountInstruction,
  AccountState,
} from '@solana/spl-token';
import TransportNodeHid from '@ledgerhq/hw-transport-node-hid';
import AppSolana from '@ledgerhq/hw-app-solana';
import bs58 from 'bs58';
import chalk from 'chalk';
import inquirer from 'inquirer';

const PATH = process.env["DERIVATION_PATH"] || "44'/501'/0'/0'"; // BIP32 path for Solana
const RPC_ENDPOINT = process.env["RPC"] || "https://api.mainnet-beta.solana.com";

// Setup connection to Solana
const connection = new Connection(RPC_ENDPOINT, {
  commitment: "confirmed",
  confirmTransactionInitialTimeout: 60000, // Ensure ample time for confirmations
});

export async function runOption1() {

// Prompt to unlock ledger before continuing
await inquirer.prompt([
  {
    type: 'input',
    name: 'continue',
    message: chalk.blue('Please unlock ledger before continuing. Press Enter to continue...'),
    filter: (input) => input, // Capture the input, but won't validate it yet
    validate: (input) => input === '' || 'Please press Enter to continue.',  // Only allow Enter key (empty input)
  },
]);

  // Open connection to Ledger device
  const transport = await TransportNodeHid.create();
  const solanaApp = new AppSolana(transport);

  // Get public key from Ledger
  const result = await solanaApp.getAddress(PATH);
  const base58Address = bs58.encode(result.address);
  const ledgerPublicKey = new PublicKey(base58Address);

  // Fetch token accounts for the wallet
  const tokenAccounts = await connection.getTokenAccountsByOwner(ledgerPublicKey, {
    programId: TOKEN_PROGRAM_ID,
  });

  console.log(`SPL token accounts found: ${tokenAccounts.value.length}`);
  console.log(`Attempting to close all SPL token accounts with 0 balance...`);
  
  const instructions: TransactionInstruction[] = [];
  const tokenAccountsToClose: PublicKey[] = [];

  for (const tokenAccount of tokenAccounts.value) {
    const tokenAccountPubkey = tokenAccount.pubkey;
    const accountInfo = AccountLayout.decode(tokenAccount.account.data);
    const tokenBalance = accountInfo.amount; //.readBigUInt64LE(0); 

    // Check if the token account is empty (amount is zero)
    if (tokenBalance === 0n && accountInfo.state != AccountState.Frozen) {
      tokenAccountsToClose.push(tokenAccountPubkey);
    }
  }

  if (tokenAccountsToClose.length === 0) {
    console.log("No SPL token accounts to close.");  
    return;
  }  
  
  // Looping doesn't work reliably based on some accounts not being able to be closed, so we close one account at a time
  // Also the Ledger device seems to have a limit on the number of instructions per transaction
  const tokenToClose = tokenAccountsToClose[tokenAccountsToClose.length - 1];

  console.log(chalk.gray('---------------------------------------------------------------'));
  console.log(`Closing SPL token account: ${tokenToClose.toBase58()}`);

  // Create transaction with instructions
  const transaction = new Transaction();
  transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  transaction.feePayer = ledgerPublicKey;

  transaction.add(createCloseAccountInstruction(
    tokenAccountsToClose[0], // to be closed token account
    ledgerPublicKey, // rent's destination
    ledgerPublicKey, // owner of the token account
  ));

  // Serialize the transaction
  const serializedTransaction = transaction.serializeMessage();

  // Sign the transaction with the Ledger
  const { signature } = await solanaApp.signTransaction(PATH, serializedTransaction);

  // Add the Ledger signature to the transaction
  transaction.addSignature(ledgerPublicKey, Buffer.from(signature)); //signature.signature);

  // Serialize the transaction for sending
  const serializedSignedTransaction = transaction.serialize();

  // Send the transaction to the Solana network
  const txid = await connection.sendRawTransaction(transaction.serialize());

  console.log(`Txn sent: https://solscan.io/tx/${txid}`);
}