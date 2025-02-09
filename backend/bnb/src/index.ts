import { ethers } from "ethers";
import * as dotenv from "dotenv";
dotenv.config();

const RPC_URL = "https://bsc-dataseed1.binance.org/";

const vaultABI = [
    "function deposit(address _rewardToken, uint256 _pid, uint256 _amount) external",
    "function requestWithdrawal(address _rewardToken, uint256 _pid, uint256 _amount) external",
    "function executeWithdrawal(address _rewardToken, uint256 _pid) external",
    "function poolLength(address _rewardToken) external view returns (uint256)",
];

// Router ABI - we only need the functions we'll use
const ROUTER_ABI = [
    "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
    "function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)",
];

// Add these to your existing ABIs
const ROUTER_ABI_EXTENDED = [
    ...ROUTER_ABI,
    "function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB, uint liquidity)",
    "function addLiquidityETH(address token, uint amountTokenDesired, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external payable returns (uint amountToken, uint amountETH, uint liquidity)",
    "function removeLiquidity(address tokenA, address tokenB, uint liquidity, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB)",
];

// ERC20 ABI - we need approve and balance checking
const ERC20_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function balanceOf(address account) external view returns (uint256)",
    "function decimals() external view returns (uint8)",
    "function allowance(address owner, address spender) external view returns (uint256)",
];

const XVS_TOKEN_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function balanceOf(address account) external view returns (uint)",
    // "function decimals() external view returns (uint8)",
];

// Add ListaDAO staking contract address and ABI
const LISTA_STAKING_ADDRESS = "0x8b1c8c1b3b6c6e78c5c3c3e2a5666f08993e7607"; // BSC Testnet

const LISTA_STAKING_ABI = ["function deposit() external payable"];

// Add new contract addresses
const CONTRACTS = {
    UNIVERSAL_ROUTER: "0x1A0A18AC4BECDDbd6389559687d1A73d8927E416",
    SLISBNB: "0x1adB950d8bB3dA4bE104211D5AB038628e477fE6",
    CAKE: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82",
    CAKE_POOL: "0x5692DB8177a81A6c6afc8084C2976C9933EC1bAB",
    XVS: "0xcF6BB5389c92Bdda8a3747Ddb454cB7a64626C63",
    XVS_POOL: "0x051100480289e704d20e9DB4804837068f3f9204",
    PANCAKESWAP_ROUTER: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
    WBNB: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", // Mainnet WBNB
    BUSD: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
};

const CAKE_POOL_ABI = [
    "function createLock(uint256 _amount, uint256 _unlockTime) external",
    "function balanceOf(address account) external view returns (uint256)",
    "function increaseLockAmount(uint256 _amount) external",
    "function userInfo(address) external view returns (address cakePoolProxy, uint128 cakeAmount, uint48 lockEndTime, uint48 migrationTime, uint16 cakePoolType, uint16 withdrawFlag)",
    "function locks(address) external view returns (int128 amount, uint256 end)",
];

const XVS_POOL_ABI = ["function deposit(uint256 amount) external"];

// Update the CAKE token ABI to match its actual functions
const CAKE_TOKEN_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function balanceOf(address account) external view returns (uint256)",
    "function decimals() external view returns (uint8)",
];

// Add deposit function to WBNB ABI
const WBNB_ABI = [
    "function deposit() external payable",
    "function withdraw(uint256 amount) external",
    ...ERC20_ABI, // Include standard ERC20 functions
];

async function transferTokens(
    tokenAddress: string,
    recipientAddress: string,
    amount: string
) {
    try {
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
        const token = new ethers.Contract(
            tokenAddress,
            [
                "function transfer(address to, uint256 amount) external returns (bool)",
                "function decimals() external view returns (uint8)",
                "function balanceOf(address account) external view returns (uint256)",
            ],
            wallet
        );
        const decimals = await token.decimals();
        const amountInWei = ethers.parseUnits(amount, decimals);

        // Check balance
        const balance = await token.balanceOf(wallet.address);
        if (balance < amountInWei) {
            throw new Error("Insufficient balance");
        }
        console.log(`Transferring ${amount} tokens to ${recipientAddress}...`);
        const tx = await token.transfer(recipientAddress, amountInWei);
        const receipt = await tx.wait();
        console.log("Transfer successful!");
        console.log("Transaction hash:", receipt.hash);

        return receipt;
    } catch (error) {
        console.error("Error during transfer:", error);
        throw error;
    }
}

async function wrapBNB(amount: string) {
    try {
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

        // Get BNB balance
        const bnbBalance = await provider.getBalance(wallet.address);
        const amountWei = ethers.parseEther(amount);

        if (bnbBalance < amountWei) {
            throw new Error(
                `Insufficient BNB balance. Have ${ethers.formatEther(
                    bnbBalance
                )} BNB, need ${amount} BNB`
            );
        }

        // Initialize WBNB contract
        const wbnb = new ethers.Contract(CONTRACTS.WBNB, WBNB_ABI, wallet);

        console.log(`Wrapping ${amount} BNB to WBNB...`);
        const tx = await wbnb.deposit({
            value: amountWei,
        });

        const receipt = await tx.wait();
        console.log("Successfully wrapped BNB to WBNB!");
        console.log("Transaction hash:", receipt.hash);

        // Check new WBNB balance
        const wbnbBalance = await wbnb.balanceOf(wallet.address);
        console.log(
            `New WBNB balance: ${ethers.formatEther(wbnbBalance)} WBNB`
        );

        return receipt;
    } catch (error) {
        console.error("Error wrapping BNB:", error);
        throw error;
    }
}

async function swapTokens(
    tokenInAddress: string,
    tokenOutAddress: string,
    amountIn: string,
    slippageTolerance: number = 0.5
) {
    try {
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

        // If tokenIn is WBNB, wrap BNB first
        if (tokenInAddress === CONTRACTS.WBNB) {
            const wbnb = new ethers.Contract(CONTRACTS.WBNB, WBNB_ABI, wallet);
            const wbnbBalance = await wbnb.balanceOf(wallet.address);
            const amountWei = ethers.parseUnits(amountIn, 18);

            if (wbnbBalance < amountWei) {
                console.log("Insufficient WBNB, wrapping BNB first...");
                await wrapBNB(amountIn);
            }
        }

        const router = new ethers.Contract(
            CONTRACTS.PANCAKESWAP_ROUTER,
            ROUTER_ABI,
            wallet
        );
        const tokenIn = new ethers.Contract(tokenInAddress, ERC20_ABI, wallet);
        // Get token decimals
        // const decimals = await tokenIn.decimals();
        const amountInWei = ethers.parseUnits(amountIn, 18);

        // Check balance
        const balance = await tokenIn.balanceOf(wallet.address);
        if (balance < amountInWei) {
            throw new Error("Insufficient balance");
        }

        // Approve router to spend tokens
        console.log("Approving token...");
        const approveTx = await tokenIn.approve(
            CONTRACTS.PANCAKESWAP_ROUTER,
            amountInWei
        );
        await approveTx.wait();
        console.log("Approval confirmed");

        // Get expected output amount
        const amounts = await router.getAmountsOut(amountInWei, [
            tokenInAddress,
            tokenOutAddress,
        ]);
        const amountOutMin =
            amounts[1] -
            (amounts[1] * BigInt(Math.floor(slippageTolerance * 100))) /
                BigInt(10000);

        // Perform swap
        console.log("Swapping tokens...");
        const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes deadline
        const swapTx = await router.swapExactTokensForTokens(
            amountInWei,
            amountOutMin,
            [tokenInAddress, tokenOutAddress],
            wallet.address,
            deadline
        );

        const receipt = await swapTx.wait();
        console.log("Swap successful!");
        console.log("Transaction hash:", receipt.hash);

        return receipt;
    } catch (error) {
        console.error("Error during swap:", error);
        throw error;
    }
}

// Add this function to check balance
async function checkBalance(tokenAddress: string) {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

    const token = new ethers.Contract(
        tokenAddress,
        [
            "function balanceOf(address) view returns (uint256)",
            "function decimals() view returns (uint8)",
        ],
        wallet
    );

    const decimals = await token.decimals();
    const balance = await token.balanceOf(wallet.address);
    console.log(`Balance: ${ethers.formatUnits(balance, decimals)} tokens`);
}

async function addLiquidity(
    tokenAAddress: string,
    tokenBAddress: string,
    amountA: string,
    amountB: string,
    slippageTolerance: number = 0.5
) {
    try {
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

        // Initialize contracts
        const router = new ethers.Contract(
            CONTRACTS.PANCAKESWAP_ROUTER,
            ROUTER_ABI_EXTENDED,
            wallet
        );
        const tokenA = new ethers.Contract(tokenAAddress, ERC20_ABI, wallet);
        const tokenB = new ethers.Contract(tokenBAddress, ERC20_ABI, wallet);

        // Get decimals
        const decimalsA = await tokenA.decimals();
        const decimalsB = await tokenB.decimals();

        // Convert amounts to Wei
        const amountAWei = ethers.parseUnits(amountA, decimalsA);
        const amountBWei = ethers.parseUnits(amountB, decimalsB);

        // Calculate min amounts with slippage
        const amountAMin =
            (amountAWei * BigInt(Math.floor((100 - slippageTolerance) * 100))) /
            BigInt(10000);
        const amountBMin =
            (amountBWei * BigInt(Math.floor((100 - slippageTolerance) * 100))) /
            BigInt(10000);

        // Approve router for both tokens
        console.log("Approving tokens...");
        const approveA = await tokenA.approve(
            CONTRACTS.PANCAKESWAP_ROUTER,
            amountAWei
        );
        await approveA.wait();
        const approveB = await tokenB.approve(
            CONTRACTS.PANCAKESWAP_ROUTER,
            amountBWei
        );
        await approveB.wait();
        console.log("Approvals confirmed");

        // Add liquidity
        console.log("Adding liquidity...");
        const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes
        const tx = await router.addLiquidity(
            tokenAAddress,
            tokenBAddress,
            amountAWei,
            amountBWei,
            amountAMin,
            amountBMin,
            wallet.address,
            deadline
        );

        const receipt = await tx.wait();
        console.log("Liquidity added successfully!");
        console.log("Transaction hash:", receipt.hash);

        return receipt;
    } catch (error) {
        console.error("Error adding liquidity:", error);
        throw error;
    }
}

async function stakeLista(amount: string) {
    try {
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

        // First approve SLISBNB token spending
        const slisToken = new ethers.Contract(
            CONTRACTS.SLISBNB,
            ERC20_ABI,
            wallet
        );
        const amountWei = ethers.parseUnits(amount, 18);
        const stakingContract = new ethers.Contract(
            CONTRACTS.SLISBNB,
            LISTA_STAKING_ABI,
            wallet
        );

        // Try deposit with value
        console.log("Depositing SLISBNB...");
        const tx = await stakingContract.deposit({
            value: amountWei, // Send equivalent BNB with the transaction
        });
        const receipt = await tx.wait();

        console.log("LISTA staking successful!");
        console.log("Transaction hash:", receipt.hash);
    } catch (error) {
        console.error("Error staking LISTA:", error);
        throw error;
    }
}

async function stakeCake(amount: string) {
    try {
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

        // First swap WBNB to CAKE if needed
        const cake = new ethers.Contract(
            CONTRACTS.CAKE,
            CAKE_TOKEN_ABI,
            wallet
        );
        const cakeBalance = await cake.balanceOf(wallet.address);
        const amountWei = ethers.parseUnits(amount, 18);

        if (cakeBalance < amountWei) {
            console.log("Insufficient CAKE, swapping WBNB to CAKE...");
            await swapTokens(CONTRACTS.WBNB, CONTRACTS.CAKE, amount);
        }

        // Approve CAKE_POOL to spend CAKE tokens
        console.log("Approving CAKE_POOL to spend CAKE...");
        const approveTx = await cake.approve(CONTRACTS.CAKE_POOL, amountWei);
        await approveTx.wait();
        console.log("CAKE approval confirmed");

        const UNLOCK_TIME = BigInt(1835689600); // Fixed timestamp
        const cakePool = new ethers.Contract(
            CONTRACTS.CAKE_POOL,
            CAKE_POOL_ABI,
            wallet
        );

        // Check if user has existing lock
        const userLock = await cakePool.locks(wallet.address);
        console.log("Current lock info:", {
            amount: userLock.amount.toString(),
            end: userLock.end.toString(),
        });

        let tx;
        if (userLock.amount === BigInt(0) && userLock.end === BigInt(0)) {
            // Create new lock if user has no existing lock
            console.log(
                `Creating new CAKE lock with amount ${amountWei} until timestamp ${UNLOCK_TIME}...`
            );
            tx = await cakePool.createLock(amountWei, UNLOCK_TIME, {
                gasLimit: 700000,
            });
        } else {
            // Increase lock amount if user has existing lock
            console.log(`Increasing lock amount by ${amountWei.toString()}...`);
            tx = await cakePool.increaseLockAmount(amountWei);
        }

        const receipt = await tx.wait();
        console.log("Transaction successful!");
        console.log("Transaction hash:", receipt.hash);

        // Get updated lock info
        const updatedLock = await cakePool.locks(wallet.address);
        console.log("Updated lock info:", {
            amount: updatedLock.amount.toString(),
            end: updatedLock.end.toString(),
        });

        return receipt;
    } catch (error) {
        console.error("Error staking CAKE:", error);
        throw error;
    }
}

async function stakeXVS(amount: string) {
    try {
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

        // First swap WBNB to XVS if needed
        const xvs = new ethers.Contract(CONTRACTS.XVS, XVS_TOKEN_ABI, wallet);
        const xvsBalance = await xvs.balanceOf(wallet.address);
        const amountWei = ethers.parseUnits(amount, 18);

        if (xvsBalance < amountWei) {
            console.log("Insufficient XVS, swapping WBNB to XVS...");
            await swapTokens(CONTRACTS.WBNB, CONTRACTS.XVS, amount);
        }

        console.log("Approving XVS...");
        await xvs.approve(CONTRACTS.XVS_POOL, ethers.MaxUint256);

        // Deposit XVS
        const xvsPool = new ethers.Contract(
            CONTRACTS.XVS_POOL,
            vaultABI,
            wallet
        );
        console.log("Depositing XVS...");
        const tx = await xvsPool.deposit(CONTRACTS.XVS, 0, amountWei);
        const receipt = await tx.wait();

        console.log("XVS staking successful!");
        console.log("Transaction hash:", receipt.hash);
    } catch (error) {
        console.error("Error staking XVS:", error);
        throw error;
    }
}

export {
    transferTokens,
    wrapBNB,
    swapTokens,
    checkBalance,
    addLiquidity,
    stakeLista,
    stakeCake,
    stakeXVS,
};

// Comment out the main function since we'll be using the API server
// async function main() {
//     try {
//         console.log("Checking WBNB balance...");
//         await checkBalance(CONTRACTS.WBNB);

//         await stakeCake("0.01");
//     } catch (error) {
//         console.error("Main error:", error);
//     }
// }

// main();
