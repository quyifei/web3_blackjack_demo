# Web3 Blackjack Game

This is a Web3-based Blackjack game built with Next.js, Wagmi, and Ethereum smart contracts. It allows users to play the classic Blackjack game using their Ethereum wallets, with features like authentication, score tracking, and NFT creation.

## Features
- **Web3 Authentication**: Users can connect their wallets and sign messages to authenticate.
- **Blackjack Gameplay**: Play the classic Blackjack game with a player and a dealer.
- **Score Tracking**: Player scores are stored in an AWS DynamoDB database.
- **NFT Creation**: Players can create NFTs based on their game scores using a Chainlink Functions-enabled smart contract.

## Project Structure
```plaintext
/src
├── app
│   ├── api
│   │   ├── route.ts       # API endpoints for game logic
│   │   └── test           # (Failed to read, possibly non-existent)
│   ├── utils
│   │   └── dynamodb-blackjack.ts # DynamoDB operations for score tracking
│   ├── globals.css        # Global styles using Tailwind CSS
│   ├── layout.tsx         # Root layout for the application
│   ├── page.tsx           # Main game page
│   └── providers.tsx      # Providers for Wagmi and React Query
├── contracts
│   └── FunctionConsumerBlackjack.sol # Smart contract for NFT creation
└── wagmi.ts               # Wagmi configuration
```

## Technologies Used
- **Next.js**: A React framework for building server-side rendered applications.
- **Wagmi**: A React Hooks library for Ethereum.
- **RainbowKit**: A wallet connection library for Ethereum.
- **Viem**: A TypeScript library for Ethereum.
- **AWS DynamoDB**: A NoSQL database for storing player scores.
- **Chainlink Functions**: A decentralized oracle network for smart contract integration.
- **OpenZeppelin**: A library for secure smart contract development.

## Setup and Installation
1. Clone the repository:
```bash
https://github.com/your-repo/web3-blackjack.git
cd web3-blackjack
```
2. Install dependencies:
```bash
npm install
```
3. Set up environment variables:
Create a `.env` file in the root directory and add the following variables:
```plaintext
JWT_SECRET=your_jwt_secret
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
NEXT_PUBLIC_ABI_CODE=your_contract_abi
NEXT_PUBLIC_CONTRACT_ADDRESS=your_contract_address
```
4. Start the development server:
```bash
npm run dev
```

## Usage
1. Connect your Ethereum wallet using the "Connect Wallet" button.
2. Sign a message to authenticate and start the game.
3. Play the Blackjack game by clicking "Hit" or "Stand".
4. Create an NFT by clicking the "Create NFT" button if your score meets the criteria.

## Smart Contract Deployment
The smart contract `FunctionConsumerBlackjack.sol` is deployed on the Ethereum network. You can interact with it using the provided API endpoints and the frontend application.

## Contributing
If you'd like to contribute to this project, please fork the repository and submit a pull request.

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.