import express from "express";
import cors from "cors";
import {
    transferTokens,
    wrapBNB,
    swapTokens,
    checkBalance,
    addLiquidity,
    stakeLista,
    stakeCake,
    stakeXVS,
} from "./index.js";

const app = express();
const port = 3006;

// Middleware
app.use(cors());
app.use(express.json());

// Error handler middleware
const errorHandler =
    (fn: Function) => async (req: express.Request, res: express.Response) => {
        try {
            const result = await fn(req);
            res.json({ success: true, data: result });
        } catch (error) {
            console.error("API Error:", error);
            res.status(500).json({
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Unknown error occurred",
            });
        }
    };

// Routes
app.post(
    "/transfer",
    errorHandler(async (req: express.Request) => {
        const { tokenAddress, recipientAddress, amount } = req.body;
        return await transferTokens(tokenAddress, recipientAddress, amount);
    })
);

app.post(
    "/wrap-bnb",
    errorHandler(async (req: express.Request) => {
        const { amount } = req.body;
        return await wrapBNB(amount);
    })
);

app.post(
    "/swap",
    errorHandler(async (req: express.Request) => {
        const { tokenInAddress, tokenOutAddress, amountIn, slippageTolerance } =
            req.body;
        return await swapTokens(
            tokenInAddress,
            tokenOutAddress,
            amountIn,
            slippageTolerance
        );
    })
);

app.get(
    "/balance/:tokenAddress",
    errorHandler(async (req: express.Request) => {
        return await checkBalance(req.params.tokenAddress);
    })
);

app.post(
    "/add-liquidity",
    errorHandler(async (req: express.Request) => {
        const {
            tokenAAddress,
            tokenBAddress,
            amountA,
            amountB,
            slippageTolerance,
        } = req.body;
        return await addLiquidity(
            tokenAAddress,
            tokenBAddress,
            amountA,
            amountB,
            slippageTolerance
        );
    })
);

app.post(
    "/stake-lista",
    errorHandler(async (req: express.Request) => {
        const { amount } = req.body;
        return await stakeLista(amount);
    })
);

app.post(
    "/stake-cake",
    errorHandler(async (req: express.Request) => {
        const { amount } = req.body;
        return await stakeCake(amount);
    })
);

app.post(
    "/stake-xvs",
    errorHandler(async (req: express.Request) => {
        const { amount } = req.body;
        return await stakeXVS(amount);
    })
);

// Start server
app.listen(port, () => {
    console.log(`BNB Chain server running on port ${port}`);
});
