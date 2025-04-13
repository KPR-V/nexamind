import { create } from "@web3-storage/w3up-client";
import express from "express";
import dotenv from "dotenv";
import axios from "axios";
import cors from "cors";
import fs from "fs";
import multer from 'multer';
import path from 'path';



let walletSpaceMap = {};


try {
  if (fs.existsSync('./wallet-space-mappings.json')) {
    walletSpaceMap = JSON.parse(fs.readFileSync('./wallet-space-mappings.json', 'utf8'));
    console.log("Loaded wallet-to-space mappings:", walletSpaceMap);
  }
} catch (error) {
  console.error("Error loading wallet-space mappings:", error);
}


function saveWalletSpaceMap() {
  fs.writeFileSync('./wallet-space-mappings.json', JSON.stringify(walletSpaceMap, null, 2));
}

const app = express();
 app.use(cors())
 app.use(express.json())

app.post('/createstorachaspace', async (req, res) => {
    try {
        const walletaddress = req.body;
        console.log("Request body:", req.body);
        
        if (!walletaddress || !walletaddress.walletaddress) {
            return res.status(400).json({ error: "Wallet address is required" });
        }
        
        if (walletSpaceMap[walletaddress.walletaddress]) {
            return res.json({ 
                did: walletSpaceMap[walletaddress.walletaddress],
                message: "Space already exists for this wallet"
            });
        }
        
        const email = "sehajjain02@gmail.com";
        console.log("Creating space for wallet:", walletaddress.walletaddress);
        
        const result = await createSpace(walletaddress.walletaddress, email);
        if (!result) {
            return res.status(500).json({ error: "Failed to create space (null result)" });
        }
        
        walletSpaceMap[walletaddress.walletaddress] = result;
        saveWalletSpaceMap();
        
        res.json({ did: result });
        console.log("Space created:", result);
    } catch (error) {
        console.error("Error in createstorachaspace:", error);
        res.status(500).json({ error: error.message || "Unknown error creating space" });
    }
});

app.get('/getSpaceForWallet', async (req, res) => {
    const { walletAddress } = req.query;
    
    if (!walletAddress) {
        return res.status(400).json({ error: "Wallet address is required" });
    }
    
    if (walletSpaceMap[walletAddress]) {
        return res.json({ did: walletSpaceMap[walletAddress] });
    }
    
    res.status(404).json({ error: "No space found for this wallet address" });
});

async function createSpace(name, email) {
    try {
        console.log(`Creating space for "${name}" with email "${email}"`);
        const client = await create();
        if (!email) {
            throw new Error("Email is required to create a space");
        }
        
        console.log("Logging in with email...");
        const account = await client.login(email);
        console.log("Account created, creating space...");
        
        const space = await client.createSpace(name, {account});
        const did = space.did();
        console.log("Space created with DID:", did);
        return did;
    } catch (error) {
        console.error("Error in createSpace function:", error);
        throw error; 
    }
}

app.post('/setCurrentSpace', async (req, res) => {
    try {
        const { did } = req.body;
        if (!did) {
            return res.status(400).json({ error: "DID is required" });
        }
        
        const client = await create();
        await client.setCurrentSpace(did);
        
        res.json({ success: true, message: "Current space set successfully" });
    } catch (error) {
        console.error("Error setting current space:", error);
        res.status(500).json({ error: "Failed to set current space", details: error.message });
    }
});

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

async function listUploads(did) {
    try {
        const client = await create();
        await client.setCurrentSpace(did);
        
        const uploads = [];
        let cursor = "";
        let hasMore = true;
        
        while (hasMore) {
            const result = await client.capability.upload.list({ 
                cursor: cursor, 
                size: 100 
            });
            
            if (result.results && result.results.length > 0) {
                const processedUploads = result.results.map(upload => {
                    return {
                        root: upload.root.toString(), 
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
            const metadataResponse = await fetch(`https://${cidString}.ipfs.w3s.link/metadata.json`);
            
            if (metadataResponse.ok) {
                const metadata = await metadataResponse.json();
                return metadata;
            }
            
            const response = await fetch(`https://${cidString}.ipfs.w3s.link`);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch content: ${response.statusText}`);
            }
            
            let content;
            try {
                content = await response.json();
            } catch (jsonError) {
                return {
                    name: `File ${cidString.substring(0, 8)}...`,
                    type: 'file',
                    size: -1,  
                    mimetype: response.headers.get('content-type'),
                    uploadedAt: new Date().toISOString()
                };
            }
            
            return content;
        } catch (fetchError) {
            console.error(`Error fetching content from IPFS gateway:`, fetchError);
            
            try {
                const upload = await client.capability.upload.get(cidString);
                
                return {
                    name: `File ${cidString.substring(0, 8)}...`,
                    type: 'file',
                    size: upload?.size || 0,
                    uploadedAt: upload?.uploaded || new Date().toISOString()
                };
            } catch (shardError) {
                console.error("Error with fallback content retrieval:", shardError);
                
                return {
                    name: `File ${cidString.substring(0, 8)}...`,
                    type: 'file',
                    size: 0,
                    uploadedAt: new Date().toISOString()
                };
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
        
        const dataToStore = {
            messages: chatdata,
            type: "chat",
            timestamp: Date.now()
        };
        
        fs.writeFileSync('chatdata.json', JSON.stringify(dataToStore, null, 2));
        
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

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './uploads'); 
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + '-' + file.originalname);
    }
  });
  
  const upload = multer({ storage: storage });
  
  try {
    if (!fs.existsSync('./uploads')) {
      fs.mkdirSync('./uploads');
    }
  } catch (err) {
    console.error('Error creating uploads directory:', err);
  }
  
  app.post('/uploadFileFromClient', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const did = req.body.did;
      if (!did) {
        return res.status(400).json({ error: 'DID is required' });
      }

      console.log(`Uploading file ${req.file.originalname} to space ${did}`);

      const filePath = req.file.path;
      const client = await create();

      await client.setCurrentSpace(did);

      const metadata = {
        name: req.file.originalname,
        type: req.body.type || 'file', 
        size: req.file.size,
        mimetype: req.file.mimetype,
        uploadedAt: new Date().toISOString(),
        isStoredChat: false 
      };
      
      const metadataPath = `${filePath}.metadata.json`;
      fs.writeFileSync(metadataPath, JSON.stringify(metadata));
      
      const fileData = fs.readFileSync(filePath);
      const metadataData = fs.readFileSync(metadataPath);

      const fileBlob = new Blob([fileData], { type: req.file.mimetype });
      
      const upload = await client.uploadFile(fileBlob);
      const cidString = upload.toString();

      console.log(`File uploaded successfully, CID: ${cidString}`);

      const fileObj = new File([fileData], req.file.originalname, { type: req.file.mimetype });
      const metaFile = new File([metadataData], 'metadata.json', { type: 'application/json' });
      
      try {
        const dirUpload = await client.uploadDirectory([fileObj, metaFile]);
        console.log(`Directory uploaded with CID: ${dirUpload.toString()}`);
      } catch (dirError) {
        console.error("Error uploading directory:", dirError);
      }
      
      fs.unlinkSync(filePath);
      fs.unlinkSync(metadataPath);

      res.json({
        success: true,
        cid: cidString,
        metadata: metadata
      });
    } catch (error) {
      console.error('Error uploading file from client:', error);
      res.status(500).json({ 
        error: 'Failed to upload file',
        details: error.message
      });
    }
  });

  app.listen(5000, () => {
    console.log('Server is running on port 5000');
  })