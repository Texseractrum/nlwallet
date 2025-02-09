// server.js
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { config } from 'dotenv';

// Import your local functions
import { swapAnyTokens } from "./swapls.js";
import { addLiquidityUSDCUSDT } from "./liq.js";

config();  // Load .env file

const app = express();
const port = 3005;

// Middlewares
app.use(cors());
app.use(bodyParser.json());

// Endpoint 1: Swap
app.post("/swap", async (req, res) => {
    try {
        const { symbolIn, symbolOut, amountIn } = req.body;
        console.log("Received swap request:", { symbolIn, symbolOut, amountIn }); // Debug log

        if (!symbolIn || !symbolOut || !amountIn) {
            console.log("Missing required parameters"); // Debug log
            return res
                .status(400)
                .json({ error: "Please provide symbolIn, symbolOut, and amountIn" });
        }

        console.log("Calling swapAnyTokens with:", { symbolIn, symbolOut, amountIn }); // Debug log
        const txHash = await swapAnyTokens(symbolIn, symbolOut, amountIn);
        console.log("Swap successful, txHash:", txHash); // Debug log
        return res.json({ message: "Swap completed", txHash });
    } catch (err) {
        console.error("Swap error:", err);
        return res.status(500).json({ error: err.message });
    }
});

// Endpoint 2: Add Liquidity
app.post("/add-liquidity", async (req, res) => {
    try {
        const { token1Amount, token2Amount, binStep = "1" } = req.body;  // Default binStep to "1"
        console.log("Received add liquidity request:", { token1Amount, token2Amount, binStep });

        if (!token1Amount || !token2Amount) {
            console.log("Missing required parameters");
            return res
                .status(400)
                .json({ error: "Please provide token1Amount and token2Amount" });
        }

        console.log("Calling addLiquidityUSDCUSDT with:", { token1Amount, token2Amount, binStep });
        const txHash = await addLiquidityUSDCUSDT(binStep || "1", token1Amount, token2Amount);
        console.log("Add liquidity successful, txHash:", txHash);
        return res.json({ message: "Liquidity added", txHash });
    } catch (err) {
        console.error("Add liquidity error:", err);
        return res.status(500).json({ error: err.message });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Local API listening at http://localhost:${port}`);
});