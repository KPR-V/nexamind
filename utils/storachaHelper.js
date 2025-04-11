import { create } from "@web3-storage/w3up-client";

// Handles Storacha space creation and management for a connected wallet
export async function handleStorachaSpaceForWallet(walletAddress, userEmail) {
  try {
    // Create a Storacha client
    const client = await create();
    
    // Check if the user has already logged in and has an account
    let account;
    try {
      // Try to login with provided email
      account = await client.login(userEmail);
      
      // Wait for a payment plan with reasonable timeout
      await account.plan.wait({ timeout: 5 * 60 * 1000 }); // 5 minute timeout
    } catch (error) {
      console.error("Error during Storacha login:", error);
      return { success: false, error: "Failed to login to Storacha" };
    }
    
    // Check if a space already exists for this wallet address
    const spaces = await client.spaces();
    let existingSpace;
    
    for (const space of spaces) {
      // Get space info - assuming name is stored as the wallet address
      const spaceInfo = await client.spaceInfo(space);
      if (spaceInfo.name === walletAddress) {
        existingSpace = space;
        break;
      }
    }
    
    // If space already exists, set it as current
    if (existingSpace) {
      await client.setCurrentSpace(existingSpace);
      return { success: true, client, space: existingSpace, isNewSpace: false };
    }
    
    // Create a new space for this wallet address
    const space = await client.createSpace(walletAddress, { account });
    await client.setCurrentSpace(space.did());
    
    return { success: true, client, space, isNewSpace: true };
  } catch (error) {
    console.error("Error handling Storacha space:", error);
    return { success: false, error: error.message };
  }
}