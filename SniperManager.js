const { Connection, PublicKey } = require('@solana/web3.js');
const Sniper = require('./Sniper');
require('dotenv').config();

class SniperManager {
    static activeSnipers = new Map();
    static connection = new Connection(process.env.SOLANA_RPC_URL, 'confirmed');

    static async addSniper(lpData) {
        try {
            // Validate LP data structure for V2 requirements
            if (!lpData?.ammId || !lpData?.baseMint || !lpData?.marketId) {
                throw new Error("Invalid LP data - missing required V2 fields");
            }

            const config = {
                tokenId: lpData._id,
                ammId: lpData.ammId,
                baseMint: lpData.baseMint,
                quoteMint: lpData.quoteMint,
                baseDecimals: lpData.baseDecimals || 9,
                quoteDecimals: lpData.quoteDecimals || 9,
                buyAmount: lpData.buyAmount || parseFloat(process.env.BUY_AMOUNT) || 0.02,
                poolState: {
                    id: lpData.ammId,
                    baseVault: lpData.baseVault,
                    quoteVault: lpData.quoteVault,
                    marketId: lpData.marketId,
                    marketProgramId: lpData.marketProgramId
                }
            };

            if (this.activeSnipers.has(config.ammId)) {
                console.log(`[Sniper] Already tracking AMM: ${config.ammId}`);
                return;
            }

            console.log(`[Sniper] Initializing for AMM: ${config.ammId}`);
            const sniper = new Sniper(config);

            // Immediate buy execution
            await sniper.executeBuy();

            // Start price monitoring
            const monitorInterval = setInterval(async () => {
                try {
                    const currentPrice = await sniper.getCurrentPrice();
                    if (currentPrice >= config.sellTargetPrice) {
                        await sniper.executeSell();
                        clearInterval(monitorInterval);
                        this.activeSnipers.delete(config.ammId);
                    }
                } catch (error) {
                    console.error(`[Monitor] Error:`, error.message);
                }
            }, 3000);

            this.activeSnipers.set(config.ammId, {
                config,
                interval: monitorInterval
            });

        } catch (error) {
            console.error(`[SniperManager] Error:`, error.message);
        }
    }

    static stopAll() {
        this.activeSnipers.forEach(sniper => clearInterval(sniper.interval));
        this.activeSnipers.clear();
    }
}

module.exports = SniperManager;