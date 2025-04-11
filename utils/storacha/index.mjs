import { create } from "@web3-storage/w3up-client";
import express from "express";
import dotenv from "dotenv";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors())
app.use(express.json())
app.post('/createstorachaclient', async (req, res) => {
    const walletaddress = req.body;
    console.log(req.body)
    console.log(walletaddress.walletaddress)
    const parsedWalletAddress = JSON.stringify(walletaddress);
    console.log(parsedWalletAddress.slice(1, -1))
    if (!walletaddress) {
        return res.status(400).json({ error: "Wallet address is required" });
    }
    const email = "sehajjain02@gmail.com"
    
    const result = await createClient(walletaddress.walletaddress,email);
    res.json(result);
    console.log(result)
    console.log("successful")

    
})

async function createClient(name,email) {
    const client = await create();
   
    if (email) {
        const account = await client.login(email);
         const space = await client.createSpace(name,{account})
         return space.did()
    }
    
}


app.listen(5000, () => {
    console.log('Server is running on port 5000');
})