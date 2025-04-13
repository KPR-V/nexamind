import withLlamaIndex from "llamaindex/next";
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["llamaindex"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "anura-testnet.lilypad.tech",
      },
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
};

export default withLlamaIndex(nextConfig);
