import { create } from "@web3-storage/w3up-client";

export async function handleStorachaSpaceForWallet(walletAddress, userEmail) {
  try {
    const client = await create();
    
    let account;
    try {
      account = await client.login(userEmail);
      
      await account.plan.wait({ timeout: 5 * 60 * 1000 }); 
    } catch (error) {
      console.error("Error during Storacha login:", error);
      return { success: false, error: "Failed to login to Storacha" };
    }
    
    const spaces = await client.spaces();
    let existingSpace;
    
    for (const space of spaces) {
      const spaceInfo = await client.spaceInfo(space);
      if (spaceInfo.name === walletAddress) {
        existingSpace = space;
        break;
      }
    }
    
    if (existingSpace) {
      await client.setCurrentSpace(existingSpace);
      return { success: true, client, space: existingSpace, isNewSpace: false };
    }
    
    const space = await client.createSpace(walletAddress, { account });
    await client.setCurrentSpace(space.did());
    
    return { success: true, client, space, isNewSpace: true };
  } catch (error) {
    console.error("Error handling Storacha space:", error);
    return { success: false, error: error.message };
  }
}