import {
    ChainId,
    Token,
    TokenAmount
} from '@traderjoe-xyz/sdk-core'
import {
    PairV2,
    LB_ROUTER_V22_ADDRESS,
    jsonAbis,
    LiquidityDistribution,
    getLiquidityConfig,
    getUniformDistributionFromBinRange
} from '@traderjoe-xyz/sdk-v2'
import {
    createPublicClient,
    createWalletClient,
    http,
    parseUnits,
    BaseError,
    ContractFunctionRevertedError
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { avalanche } from 'viem/chains'
import JSBI from 'jsbi'
import { config } from 'dotenv';

config();  // so we can load PRIVATE_KEY etc. from .env

const { LBRouterV22ABI, ERC20ABI } = jsonAbis; // includes standard ERC20 ABI
const CHAIN_ID = ChainId.AVALANCHE;

// This is the Trader Joe LB V22 router on Avalanche:
const routerAddress = LB_ROUTER_V22_ADDRESS[CHAIN_ID];

const privateKey = process.env.PRIVATE_KEY;
const account = privateKeyToAccount(privateKey);

// Create Viem clients (public and wallet)
const publicClient = createPublicClient({
    chain: avalanche,
    transport: http()
});

const walletClient = createWalletClient({
    account,
    chain: avalanche,
    transport: http()
});

/**
 * Adds liquidity to a USDC-USDT LBPair using the Trader Joe LBRouter V22.
 *
 * Note: The LBRouter enforces that tokens are passed in ascending order.
 * Since:
 *   USDT = 0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7  (lower address)
 *   USDC = 0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E  (higher address)
 * we assign tokenX = USDT and tokenY = USDC.
 *
 * @async
 * @function addLiquidityUSDCUSDT
 * @param {string} binStep - The bin step for the LB pair (e.g. "1", "5", "10", etc.).
 * @param {string} usdcAmount - The amount of USDC to add.
 * @param {string} usdtAmount - The amount of USDT to add.
 * @returns {Promise<string>} - The transaction hash
 */
export async function addLiquidityUSDCUSDT(binStep = "1", usdcAmount = "0.01", usdtAmount = "0.01") {
    try {
        // --- 1) Define tokens
        const USDC = new Token(
            CHAIN_ID,
            '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',  // USDC
            6,
            'USDC',
            'USD Coin'
        );

        const USDT = new Token(
            CHAIN_ID,
            '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7',  // USDT
            6,
            'USDT',
            'TetherToken'
        );

        // --- 2) User's typed input for the token amounts (0.1 each)
        const typedValueUSDC = usdcAmount;
        const typedValueUSDT = usdtAmount;

        // Parse each typed value with correct decimals
        const typedValueUSDCParsed = parseUnits(typedValueUSDC, USDC.decimals);
        const typedValueUSDTParsed = parseUnits(typedValueUSDT, USDT.decimals);

        // Wrap amounts into TokenAmount objects
        const tokenAmountUSDC = new TokenAmount(USDC, typedValueUSDCParsed);
        const tokenAmountUSDT = new TokenAmount(USDT, typedValueUSDTParsed);

        // Slippage tolerance in bips (example: 50 => 0.5%)
        const allowedAmountsSlippage = 50;

        // Minimum amounts based on slippage
        const minTokenAmountUSDC = JSBI.divide(
            JSBI.multiply(tokenAmountUSDC.raw, JSBI.BigInt(10000 - allowedAmountsSlippage)),
            JSBI.BigInt(10000)
        );
        const minTokenAmountUSDT = JSBI.divide(
            JSBI.multiply(tokenAmountUSDT.raw, JSBI.BigInt(10000 - allowedAmountsSlippage)),
            JSBI.BigInt(10000)
        );

        // --- 3) Get the LBPair's active bin
        // IMPORTANT: Tokens must be passed in ascending order.
        // USDT (0x9702...) is lower than USDC (0xB97E...), so we order as [USDT, USDC].
        const pair = new PairV2(USDT, USDC);
        const pairVersion = 'v22';

        // Fetch LBPair
        const lbPair = await pair.fetchLBPair(Number(binStep), pairVersion, publicClient, CHAIN_ID);
        if (lbPair.LBPair === '0x0000000000000000000000000000000000000000') {
            console.log("No LB pair found with given parameters");
            return;
        }

        // Retrieve LBPair data
        const lbPairData = await PairV2.getLBPairReservesAndId(lbPair.LBPair, pairVersion, publicClient);
        const activeBinId = lbPairData.activeId;

        // --- 4) Choose your liquidity distribution
        // Option B) Uniform distribution in a given bin range around activeBinId
        const binRange = [activeBinId - 5, activeBinId + 5];
        // Order the token amounts to match the token order: [USDT, USDC]
        const { deltaIds, distributionX, distributionY } = getUniformDistributionFromBinRange(
            activeBinId,
            binRange,
            [tokenAmountUSDT, tokenAmountUSDC]
        );

        // --- 5) Approve the LBRouter to spend tokens (IMPORTANT!)
        // Approve USDC and USDT as needed
        await approveTokenIfNeeded(USDC.address, routerAddress, typedValueUSDCParsed);
        await approveTokenIfNeeded(USDT.address, routerAddress, typedValueUSDTParsed);

        // --- 6) Build the addLiquidity parameters
        // We'll set the deadline to 1 hour from the current time
        const currentTimeInSec = Math.floor(Date.now() / 1000);
        const deadline = currentTimeInSec + 3600;

        // IMPORTANT: tokenX must be the token with the lower address (USDT) and tokenY the higher (USDC)
        const addLiquidityInput = {
            tokenX: USDT.address,
            tokenY: USDC.address,
            binStep: Number(binStep),
            amountX: tokenAmountUSDT.raw.toString(),
            amountY: tokenAmountUSDC.raw.toString(),
            amountXMin: minTokenAmountUSDT.toString(),
            amountYMin: minTokenAmountUSDC.toString(),
            activeIdDesired: activeBinId,
            idSlippage: 5,                   // how many bins away from the active bin you allow
            deltaIds,
            distributionX,
            distributionY,
            to: account.address,             // your wallet
            refundTo: account.address,       // if any leftover tokens from distribution
            deadline
        };

        // --- 7) Simulate and execute the addLiquidity transaction
        const { request } = await publicClient.simulateContract({
            address: routerAddress,
            abi: LBRouterV22ABI,
            functionName: "addLiquidity",
            args: [addLiquidityInput],
            account
        });

        // Sign and broadcast the transaction
        const txHash = await walletClient.writeContract(request);
        console.log(`Transaction sent! Hash: ${txHash}`);

        // Wait for confirmation
        await publicClient.waitForTransactionReceipt({ hash: txHash });
        console.log("Add liquidity confirmed in block");

        return txHash;  // Return the transaction hash
    } catch (err) {
        console.error("Error while adding liquidity:", err);
        throw err;  // Re-throw the error to be handled by the caller
    }
}

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

async function approveTokenIfNeeded(tokenAddress, spender, amount) {
    // 1) Check current allowance
    const allowanceResult = await publicClient.readContract({
        address: tokenAddress,
        abi: minimalERC20Abi,
        functionName: 'allowance',
        args: [account.address, spender],
    });

    // allowanceResult is a single value (likely a bigint).
    const currentAllowance = BigInt(allowanceResult?.toString() || '0');
    console.log('Current Allowance for', tokenAddress, ':', currentAllowance.toString());

    if (currentAllowance < amount) {
        console.log(
            `Allowance for token ${tokenAddress} is too low (${currentAllowance}). Approving...`
        );

        // 2) Approve the token
        const { request } = await publicClient.simulateContract({
            address: tokenAddress,
            abi: minimalERC20Abi,
            functionName: 'approve',
            args: [spender, amount],
            account
        });

        const txHash = await walletClient.writeContract(request);
        console.log(`Approve TX: ${txHash}`);

        // Wait for the transaction to be mined before continuing.
        // This ensures that the nonce updates correctly before sending the next tx.
        await publicClient.waitForTransactionReceipt({ hash: txHash });
    } else {
        console.log(`Sufficient allowance for token ${tokenAddress}. No approval needed.`);
    }
}
