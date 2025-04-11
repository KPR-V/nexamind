import { create } from "@web3-storage/w3up-client";
import express from "express";
import dotenv from "dotenv";
import axios from "axios";
import cors from "cors";
import fs from "fs";

const app = express();
app.use(cors())
app.use(express.json())
app.post('/createstorachaspace', async (req, res) => {
    const walletaddress = req.body;
    console.log(req.body)
    console.log(walletaddress.walletaddress)
    const parsedWalletAddress = JSON.stringify(walletaddress);
    console.log(parsedWalletAddress.slice(1, -1))
    if (!walletaddress) {
        return res.status(400).json({ error: "Wallet address is required" });
    }
    const email = "sehajjain02@gmail.com"
    
    const result = await createSpace(walletaddress.walletaddress,email);
    res.json(result);
    console.log(result)
    console.log("successful")
})

async function createSpace(name,email) {
    const client = await create();
    if (email) {
        const account = await client.login(email);
         const space = await client.createSpace(name,{account})
         return space.did()
        
    }
}

async function uploadfile(did){
    const client = await create();
    const space = await client.setCurrentSpace(did);
    const data = fs.readFileSync('chatdata.json', 'utf8');
    const file = new Blob([data], { type: 'application/json' });
    const upload = await client.uploadFile(file);
    return upload
}

async function getDID() {
    const client = await create();
    const did = await client.currentSpace().did();
    return did
}
app.post('/uploadfile', async (req, res) => {
    const chatdata = req.body.chatdata;
    console.log(chatdata)
    fs.writeFileSync('chatdata.json', JSON.stringify(chatdata, null, 2), (err) => {
        if (err) {
            console.error('Error writing file:', err);
            return res.status(500).json({ error: 'Failed to write file' });
        }
    });
    const did = req.body.did;
    const result = await uploadfile(did);
    console.log(result)
    res.json(result);
    console.log("successful")
})

app.get('/getdid', async (req, res) => {
    const result = await getDID();
    console.log(result)
    res.json(result);
})


app.listen(5000, () => {
    console.log('Server is running on port 5000');
})