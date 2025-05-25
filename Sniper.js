const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const { swapTokens } = require('./swapCreator');
const { Liquidity } = require('@raydium-io/raydium-sdk-v2');
const bs58 = require('bs58');
require('dotenv').config();

class Sniper {
    constructor(config) {
        // Core V2 Pool Data
        this.ammId = config.ammId;
        this.baseMint = config.baseMint;
        this.quoteMint = config.quoteMint;
        this.baseDecimals = config.baseDecimals;
        this.quoteDecimals = config.quoteDecimals;

        // Swap Parameters
        this.buyAmount = config.buyAmount;
        this.sellTargetPrice = config.sellTargetPrice || 2;

        // Wallet Setup
        this.owner = Keypair.fromSecretKey(
            bs58.default.decode(process.env.WALLET_PRIVATE_KEY)
        );

        // Connection
        this.connection = new Connection(process.env.SOLANA_RPC_URL, 'confirmed');
    }

    async executeBuy() {
        try {
            console.log(`[Buy] Initiating swap for ${this.buyAmount} SOL`);
            return await swapTokens({
                tokenId: this.config.tokenId,
                amountSpecified: this.convertToLamports(this.buyAmount, this.quoteDecimals),
                swapBaseIn: false
            });
        } catch (error) {
            console.error(`[Buy] Failed:`, error.message);
            throw error;
        }
    }

    async executeSell() {
        try {
            console.log(`[Sell] Triggering at target price`);
            return await swapTokens({
                tokenId: this.config.tokenId,
                amountSpecified: this.convertToLamports(this.buyAmount, this.baseDecimals),
                swapBaseIn: true
            });
        } catch (error) {
            console.error(`[Sell] Failed:`, error.message);
            throw error;
        }
    }

    async getCurrentPrice() {
        const poolKeys = this.getPoolKeys();
        const poolState = await Liquidity.fetchState({
            connection: this.connection,
            poolKeys
        });
        return poolState.quoteReserve.toNumber() / poolState.baseReserve.toNumber();
    }

    getPoolKeys() {
        return {
            id: new PublicKey(this.ammId),
            baseMint: new PublicKey(this.baseMint),
            quoteMint: new PublicKey(this.quoteMint),
            baseDecimals: this.baseDecimals,
            quoteDecimals: this.quoteDecimals,
            poolState: this.config.poolState
        };
    }

    convertToLamports(amount, decimals) {
        return Math.floor(amount * 10 ** decimals);
    }
}

module.exports = Sniper;
