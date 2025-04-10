"use client";
import React from "react";
import dotenv from "dotenv";
dotenv.config();
import {
  RainbowKitProvider,
  getDefaultConfig,
  darkTheme,
} from "@rainbow-me/rainbowkit";
import {
  mainnet,
  polygon,
  sepolia,
  optimism,
  arbitrum,
  filecoin,
  avalanche,
  linea,
  bsc,
} from "wagmi/chains";
import { WagmiProvider } from "wagmi";
import { http } from "viem";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { UserDataProvider } from "../contexts/UserDataContext";
import "@rainbow-me/rainbowkit/styles.css";

const projectId =
  `${process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID}` || "YOUR_PROJECT_ID";
const chains = [
  mainnet,
  polygon,
  optimism,
  arbitrum,
  filecoin,
  avalanche,
  linea,
  sepolia,
  bsc,
];

const queryClient = new QueryClient();

const config = getDefaultConfig({
  appName: "NexaMind",
  projectId: projectId,
  chains,
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [optimism.id]: http(),
    [arbitrum.id]: http(),
    [filecoin.id]: http(),
    [avalanche.id]: http(),
    [linea.id]: http(),
    [sepolia.id]: http(),
    [bsc.id]: http(),
  },
});

export function Providers({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        <RainbowKitProvider
          chains={chains}
          modalSize="lg"
          theme={darkTheme({
            accentColor: "#d9dbd9",
            accentColorForeground: "black",
            borderRadius: "medium",
            fontStack: "system",
          })}
        >
          <UserDataProvider>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
              {children}
            </ThemeProvider>
          </UserDataProvider>
        </RainbowKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
