# SPL Token Account Closing Tool

Tool that attempts to close all SPL token accounts that have a valid state and a zero balance.

## Setup

If you are planning to access your wallet with a private key or need to setup a custom RPC or derivation path copy `.env.example` to `.env` then set your environment variables (`RPC`, `DERIVATION_PATH`, and `PRIVATE_KEY`) with desired values.

To initially install the required modules
```sh
npm i
```

## Run

```sh
npm start
```
