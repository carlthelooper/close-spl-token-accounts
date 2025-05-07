import { 
  Connection, 
  Keypair, 
  PublicKey, 
  Transaction,
} from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID, 
  AccountLayout,
  createCloseAccountInstruction,
  AccountState,
} from '@solana/spl-token';
import bs58 from 'bs58';
import chalk from 'chalk';

const RPC_ENDPOINT = process.env["RPC"] || "https://api.mainnet-beta.solana.com";

// Setup connection to Solana
const connection = new Connection(RPC_ENDPOINT, {
  commitment: "confirmed",
  confirmTransactionInitialTimeout: 60000, // Ensure ample time for confirmations
});

export async function runOption2() {
  // Check if PRIVATE_KEY is set in environment variables
  if (!process.env["PRIVATE_KEY"]) {
    console.error("Please set the PRIVATE_KEY environment variable.");
    return;
  }

  // Get wallet from private key
  const accountKeypair = Keypair.fromSecretKey(
    bs58.decode(process.env["PRIVATE_KEY"]!)
  );
  console.log(`Checking wallet: ${accountKeypair.publicKey.toBase58()}`);

  // Fetch token accounts for the wallet
  const tokenAccounts = await connection.getTokenAccountsByOwner(accountKeypair.publicKey, {
    programId: TOKEN_PROGRAM_ID,
  });

  console.log(`SPL token accounts found: ${tokenAccounts.value.length}`);
  console.log(`Attempting to close all SPL token accounts with 0 balance...`);
  
  // const instructions: TransactionInstruction[] = [];
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
  // Also multiple instructions per transaction are not working
  const tokenToClose = tokenAccountsToClose[0];

  console.log(chalk.gray('---------------------------------------------------------------'));
  console.log(`Closing SPL token account: ${tokenToClose.toBase58()}`);

  // Create transaction with instructions
  const transaction = new Transaction();
  transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  transaction.feePayer = accountKeypair.publicKey;

  transaction.add(createCloseAccountInstruction(
    tokenAccountsToClose[0], // to be closed token account
    accountKeypair.publicKey, // rent's destination
    accountKeypair.publicKey, // owner of the token account
  ));

  // Sign the transaction
  transaction.sign(accountKeypair);

  // Serialize the transaction for sending
  const serializedSignedTransaction = transaction.serialize();

  // Send the transaction to the Solana network
  const txid = await connection.sendRawTransaction(serializedSignedTransaction);

  console.log(`Txn sent: https://solscan.io/tx/${txid}`);
}