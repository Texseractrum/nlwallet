// server.js
import express from "express";
import bodyParser from "body-parser";

// Import your local functions
import { swapAnyTokens } from "./swapls.js";
import { addLiquidityUSDCUSDT } from "./liq.js";

const app = express();
const port = 3005;

// Middlewares
app.use(bodyParser.json());

// Endpoint 1: Swap
app.post("/swap", async (req, res) => {
    try {
        const { symbolIn, symbolOut, amountIn } = req.body;

        if (!symbolIn || !symbolOut || !amountIn) {
            return res
                .status(400)
                .json({ error: "Please provide symbolIn, symbolOut, and amountIn" });
        }

        const txHash = await swapAnyTokens(symbolIn, symbolOut, amountIn);
        return res.json({ message: "Swap completed", txHash });
    } catch (err) {
        console.error("Swap error:", err);
        return res.status(500).json({ error: err.message });
    }
});

// Endpoint 2: Add Liquidity
app.post("/add-liquidity", async (req, res) => {
    try {
        const { binStep } = 1

        if (!binStep) {
            return res
                .status(400)
                .json({ error: "Please provide binStep in the request body" });
        }

        const txHash = await addLiquidityUSDCUSDT(binStep);
        return res.json({ message: "Liquidity added", txHash });
    } catch (err) {
        console.error("Liquidity error:", err);
        return res.status(500).json({ error: err.message });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Local API listening at http://localhost:${port}`);
});