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
    await client.setCurrentSpace(did);
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

// List all uploads from Storacha
async function listUploads(did) {
    try {
        const client = await create();
        await client.setCurrentSpace(did);
        
        // Get all uploads (paginated)
        const uploads = [];
        let cursor = "";
        let hasMore = true;
        
        while (hasMore) {
            const result = await client.capability.upload.list({ 
                cursor: cursor, 
                size: 100 
            });
            
            if (result.results && result.results.length > 0) {
                // Extract CID strings and create simplified upload objects
                const processedUploads = result.results.map(upload => {
                    return {
                        root: upload.root.toString(), // Convert CID to string
                        uploaded: upload.uploaded,
                        size: upload.size
                    };
                });
                
                uploads.push(...processedUploads);
            }
            
            if (result.cursor && result.cursor !== cursor) {
                cursor = result.cursor;
            } else {
                hasMore = false;
            }
        }
        
        return uploads;
    } catch (error) {
        console.error("Error listing uploads:", error);
        throw error;
    }
}

async function getUpload(cidString, did) {
    try {
        const client = await create();
        await client.setCurrentSpace(did);
        
        try {
            const response = await fetch(`https://${cidString}.ipfs.w3s.link`);
            if (!response.ok) {
                throw new Error(`Failed to fetch content: ${response.statusText}`);
            }
            
            const content = await response.json();
            return content;
        } catch (fetchError) {
            console.error(`Error fetching content from IPFS gateway:`, fetchError);
            
            try {
                const upload = await client.capability.upload.get(cidString);
                if (upload && upload.shards) {
                    const shard = upload.shards[0];
                    const shardResponse = await fetch(`https://${shard}.ipfs.w3s.link`);
                    if (shardResponse.ok) {
                        return await shardResponse.json();
                    }
                }
                throw new Error("Could not retrieve content from shards");
            } catch (shardError) {
                console.error("Error with fallback content retrieval:", shardError);
                throw shardError;
            }
        }
    } catch (error) {
        console.error(`Error getting upload ${cidString}:`, error);
        throw error;
    }
}

app.post('/uploadFile', async (req, res) => {
    try {
        const chatdata = req.body.chatdata;
        if (!chatdata) {
            return res.status(400).json({ error: "Chat data is required" });
        }
        
        console.log("Received chat data for upload");
        fs.writeFileSync('chatdata.json', JSON.stringify(chatdata, null, 2));
        
        const did = req.body.did;
        if (!did) {
            return res.status(400).json({ error: "DID is required" });
        }
        
        const result = await uploadfile(did);
        const cidString = result.toString();
        
        console.log("Upload successful, CID:", cidString);
        res.json({ 
            success: true, 
            cid: cidString 
        });
    } catch (error) {
        console.error("Error in uploadFile:", error);
        res.status(500).json({ error: "Failed to upload file", details: error.message });
    }
})

app.get('/getDID', async (req, res) => {
    try {
        const result = await getDID();
        console.log("Current DID:", result);
        res.json(result);
    } catch (error) {
        console.error("Error in getDID:", error);
        res.status(500).json({ error: "Failed to get DID", details: error.message });
    }
})

app.get('/listUploads', async (req, res) => {
    try {
        const did = req.query.did;
        if (!did) {
            return res.status(400).json({ error: "DID is required" });
        }
        
        const uploads = await listUploads(did);
        console.log(`Found ${uploads.length} uploads for DID ${did}`);
        res.json({ uploads });
    } catch (error) {
        console.error("Error in listUploads endpoint:", error);
        res.status(500).json({ error: "Failed to list uploads", details: error.message });
    }
})

app.get('/getUpload', async (req, res) => {
    try {
        const { cid, did } = req.query;
        if (!cid || !did) {
            return res.status(400).json({ error: "CID and DID are required" });
        }
        
        console.log(`Fetching content for CID: ${cid}`);
        const content = await getUpload(cid, did);
        res.json(content);
    } catch (error) {
        console.error("Error in getUpload endpoint:", error);
        res.status(500).json({ error: "Failed to get upload content", details: error.message });
    }
})

app.listen(5000, () => {
    console.log('Server is running on port 5000');
})