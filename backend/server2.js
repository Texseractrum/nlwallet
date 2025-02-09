"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const index_1 = require("./index");
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Error handler middleware
const errorHandler = (fn) => async (req, res) => {
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
    errorHandler(async (req) => {
        const { tokenAddress, recipientAddress, amount } = req.body;
        return await (0, index_1.transferTokens)(
            tokenAddress,
            recipientAddress,
            amount
        );
    })
);
app.post(
    "/wrap-bnb",
    errorHandler(async (req) => {
        const { amount } = req.body;
        return await (0, index_1.wrapBNB)(amount);
    })
);
app.post(
    "/swap",
    errorHandler(async (req) => {
        const { tokenInAddress, tokenOutAddress, amountIn, slippageTolerance } =
            req.body;
        return await (0, index_1.swapTokens)(
            tokenInAddress,
            tokenOutAddress,
            amountIn,
            slippageTolerance
        );
    })
);
app.get(
    "/balance/:tokenAddress",
    errorHandler(async (req) => {
        return await (0, index_1.checkBalance)(req.params.tokenAddress);
    })
);
app.post(
    "/add-liquidity",
    errorHandler(async (req) => {
        const {
            tokenAAddress,
            tokenBAddress,
            amountA,
            amountB,
            slippageTolerance,
        } = req.body;
        return await (0, index_1.addLiquidity)(
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
    errorHandler(async (req) => {
        const { amount } = req.body;
        return await (0, index_1.stakeLista)(amount);
    })
);
app.post(
    "/stake-cake",
    errorHandler(async (req) => {
        const { amount } = req.body;
        return await (0, index_1.stakeCake)(amount);
    })
);
app.post(
    "/stake-xvs",
    errorHandler(async (req) => {
        const { amount } = req.body;
        return await (0, index_1.stakeXVS)(amount);
    })
);
// Start server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
