// Use dynamic import for ES module compatibility
let ipfs;
let ipfsInitialized = false;

const initializeIPFS = async () => {
  if (ipfsInitialized) return ipfs;
  
  const { create } = await import('ipfs-http-client');
  ipfs = create({
    url: process.env.IPFS_URL || 'http://localhost:5001',
  });
  ipfsInitialized = true;
  return ipfs;
};

/**
 * Upload file to IPFS
 */
const uploadToIPFS = async (fileBuffer, fileName) => {
  try {
    const ipfsClient = await initializeIPFS();
    const result = await ipfsClient.add({
      path: fileName,
      content: fileBuffer,
    });
    
    return {
      hash: result.cid.toString(),
      url: `https://ipfs.io/ipfs/${result.cid.toString()}`,
    };
  } catch (error) {
    console.error('IPFS upload error:', error);
    throw new Error('Failed to upload to IPFS');
  }
};

/**
 * Upload JSON metadata to IPFS
 */
const uploadMetadata = async (metadata) => {
  try {
    const ipfsClient = await initializeIPFS();
    const metadataJson = JSON.stringify(metadata);
    const result = await ipfsClient.add(metadataJson);
    
    return {
      hash: result.cid.toString(),
      url: `https://ipfs.io/ipfs/${result.cid.toString()}`,
    };
  } catch (error) {
    console.error('IPFS metadata upload error:', error);
    throw new Error('Failed to upload metadata to IPFS');
  }
};

/**
 * Get file from IPFS
 */
const getFromIPFS = async (hash) => {
  try {
    const ipfsClient = await initializeIPFS();
    const chunks = [];
    for await (const chunk of ipfsClient.cat(hash)) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  } catch (error) {
    console.error('IPFS get error:', error);
    throw new Error('Failed to retrieve from IPFS');
  }
};

module.exports = {
  uploadToIPFS,
  uploadMetadata,
  getFromIPFS,
};

