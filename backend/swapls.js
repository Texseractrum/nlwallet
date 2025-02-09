// swapAnyTokens.js
import { config } from "dotenv";
config();

import sdkV2 from "@traderjoe-xyz/sdk-v2";
const { PairV2, RouteV2, TradeV2, LB_ROUTER_V22_ADDRESS, jsonAbis } = sdkV2;

import {
    ChainId,
    WNATIVE,
    Token,
    TokenAmount,
    Percent,
} from "@traderjoe-xyz/sdk-core";

import {
    createPublicClient,
    createWalletClient,
    parseUnits,
    http,
} from "viem";
import { avalanche } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

// Minimal ERC-20 ABI
const minimalERC20Abi = [
    {
        "type": "function",
        "stateMutability": "view",
        "outputs": [
            { "type": "uint256" }
        ],
        "name": "allowance",
        "inputs": [
            { "type": "address", "name": "owner" },
            { "type": "address", "name": "spender" }
        ]
    },
    {
        "type": "function",
        "stateMutability": "nonpayable",
        "outputs": [],
        "name": "approve",
        "inputs": [
            { "type": "address", "name": "spender" },
            { "type": "uint256", "name": "amount" }
        ]
    }
];

// You can place approveTokenIfNeeded here or import it from another file:
async function approveTokenIfNeeded(
    publicClient,
    walletClient,
    tokenAddress,
    spender,
    amount,
    account
) {
    // 1) Check current allowance
    const allowanceResult = await publicClient.readContract({
        address: tokenAddress,
        abi: minimalERC20Abi,
        functionName: "allowance",
        args: [account.address, spender],
    });

    const currentAllowance = BigInt(allowanceResult?.toString() || "0");
    console.log(`Current Allowance for ${tokenAddress}: ${currentAllowance.toString()}`);

    // 2) If not enough allowance, approve
    if (currentAllowance < amount) {
        console.log(
            `Allowance for token ${tokenAddress} is too low (${currentAllowance}). Approving...`
        );

        const { request } = await publicClient.simulateContract({
            address: tokenAddress,
            abi: minimalERC20Abi,
            functionName: "approve",
            args: [spender, amount],
            // This is key: specifying the account for simulation ensures
            // the "from" address isn't zero during simulation
            account,
        });

        const txHash = await walletClient.writeContract(request);
        console.log(`Approve TX: ${txHash}`);

        // Wait for confirm
        await publicClient.waitForTransactionReceipt({ hash: txHash });
        console.log("Approval confirmed.");
    } else {
        console.log(`Sufficient allowance for token ${tokenAddress}. No approval needed.`);
    }
}

/**
 * swapAnyTokens swaps an exact amount of tokenIn (given by symbolIn) for tokenOut (symbolOut)
 * using Trader Joe's LB Router v2.2.
 *
 * @param {string} symbolIn  e.g. "USDC", "USDT", "AAVE", or "AVAX"
 * @param {string} symbolOut e.g. "USDC", "USDT", "AAVE", or "AVAX"
 * @param {string} amountIn  The amount (as a decimal string, e.g. "5")
 * @returns {Promise<string>} the swap transaction hash.
 */
export async function swapAnyTokens(symbolIn, symbolOut, amountIn) {
    try {
        // 1. Setup: load private key and create clients.
        const privateKey = process.env.PRIVATE_KEY;
        if (!privateKey) throw new Error("PRIVATE_KEY not set.");

        const account = privateKeyToAccount(
            privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`
        );

        const routerAddress = LB_ROUTER_V22_ADDRESS[ChainId.AVALANCHE];
        const publicClient = createPublicClient({
            chain: avalanche,
            transport: http(),
        });
        const walletClient = createWalletClient({
            account,
            chain: avalanche,
            transport: http(),
        });

        // 2. Define known tokens
        const TOKENS = {
            USDC: new Token(
                ChainId.AVALANCHE,
                "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
                6,
                "USDC",
                "USD Coin"
            ),
            USDT: new Token(
                ChainId.AVALANCHE,
                "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
                6,
                "USDT",
                "TetherToken"
            ),
            AAVE: new Token(
                ChainId.AVALANCHE,
                "0x8cE2Dee54bB9921a2AE0A63dBb2DF8eD88B91dD9",
                18,
                "AAVE",
                "AAVE"
            ),
            AVAX: WNATIVE[ChainId.AVALANCHE],
        };

        let isNativeIn = false,
            isNativeOut = false;
        let tokenIn, tokenOut;

        if (symbolIn === "AVAX") {
            isNativeIn = true;
            tokenIn = TOKENS.AVAX;
        } else {
            tokenIn = TOKENS[symbolIn];
            if (!tokenIn) throw new Error(`Unknown token: ${symbolIn}`);
        }

        if (symbolOut === "AVAX") {
            isNativeOut = true;
            tokenOut = TOKENS.AVAX;
        } else {
            tokenOut = TOKENS[symbolOut];
            if (!tokenOut) throw new Error(`Unknown token: ${symbolOut}`);
        }

        if (symbolIn === symbolOut) {
            throw new Error("Input and output tokens must differ.");
        }

        // 3. Parse amountIn
        const typedValueInParsed = parseUnits(amountIn, tokenIn.decimals);
        const amountInToken = new TokenAmount(tokenIn, typedValueInParsed);

        // 4. Approve if needed (only if tokenIn is not AVAX)
        if (!isNativeIn) {
            await approveTokenIfNeeded(
                publicClient,
                walletClient,
                tokenIn.address,   // tokenAddress
                routerAddress,     // spender
                typedValueInParsed,
                account
            );
        }

        // 5. Build routes
        const BASES = [TOKENS.AVAX, TOKENS.USDC, TOKENS.USDT];
        const allTokenPairs = PairV2.createAllTokenPairs(tokenIn, tokenOut, BASES);
        const allPairs = PairV2.initPairs(allTokenPairs);
        const allRoutes = RouteV2.createAllRoutes(allPairs, tokenIn, tokenOut);

        // 6. Create trades
        const trades = await TradeV2.getTradesExactIn(
            allRoutes,
            amountInToken,
            tokenOut,
            isNativeIn,
            isNativeOut,
            publicClient,
            ChainId.AVALANCHE
        );
        const bestTrade = TradeV2.chooseBestTrade(trades, true);
        console.log("Best trade log:", bestTrade.toLog());

        // 7. Slippage tolerance, swap call parameters
        const userSlippageTolerance = new Percent("50", "10000"); // 0.5%
        const swapOptions = {
            allowedSlippage: userSlippageTolerance,
            ttl: 3600,
            recipient: account.address,
            feeOnTransfer: false,
        };
        const { methodName, args, value } = bestTrade.swapCallParameters(swapOptions);

        // 8. Simulate the swap call (now with account specified!)
        const { request: swapRequest } = await publicClient.simulateContract({
            address: routerAddress,
            abi: jsonAbis.LBRouterV22ABI,
            functionName: methodName,
            args,
            value: BigInt(value),
            account, // Important so the "from" is set for simulation
        });

        // 9. Sign and send the swap
        const txHash = await walletClient.writeContract(swapRequest);
        console.log("Swap TX sent:", txHash);
        const swapReceipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
        console.log("Swap confirmed in block:", swapReceipt.blockNumber);

        return txHash;
    } catch (err) {
        console.error("Error swapping tokens:", err);
        throw err;
    }
}