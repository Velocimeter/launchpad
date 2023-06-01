import { useState, useEffect } from "react";
import NextHead from "next/head";
import type { AppProps } from "next/app";
import {
  getDefaultWallets,
  RainbowKitProvider,
  darkTheme,
} from "@rainbow-me/rainbowkit";
import { configureChains, createConfig, WagmiConfig } from "wagmi";
import { canto } from "wagmi/chains";
import * as Toast from "@radix-ui/react-toast";

import { alchemyProvider } from "wagmi/providers/alchemy";
import { publicProvider } from "wagmi/providers/public";
import { jsonRpcProvider } from "wagmi/providers/jsonRpc";

import { Layout } from "../components/Layout";

import "../styles/globals.css";
import "@rainbow-me/rainbowkit/styles.css";

const { chains, publicClient } = configureChains(
  [canto],
  [
    alchemyProvider({ apiKey: process.env.NEXT_PUBLIC_ALCHEMY_ID! }),
    jsonRpcProvider({
      rpc: () => ({
        http: process.env.NEXT_PUBLIC_CANTO_HTTP!,
      }),
    }),
    publicProvider(),
  ]
);

const { connectors } = getDefaultWallets({
  appName: "Velocimeter Launchpad",
  projectId: "8bfc3712380cd8d041061d5c90887e83",
  chains,
});

const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
});

function MyApp({ Component, pageProps }: AppProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider
        chains={chains}
        initialChain={canto}
        showRecentTransactions={true}
        theme={darkTheme({
          accentColor: "rgb(0, 243, 203)",
          accentColorForeground: "#222222",
          borderRadius: "small",
          fontStack: "rounded",
          overlayBlur: "small",
        })}
      >
        <NextHead>
          <title>Cadence Launchpad</title>
          <meta property="og:title" content="Cadence Launchpad" />
          <meta
            property="og:description"
            content="Velocimeter MultiChain Launchpad"
          />
          <meta name="description" content="Velocimeter MultiChain Launchpad" />
          <meta
            name="keywords"
            content="dApp, web3, launchpad, velocimeter, canto, wagmi, cadence, defi"
          />
          <link rel="icon" href="/images/cadence_logo.png" />
        </NextHead>
        {mounted && (
          <Toast.Provider swipeDirection="right">
            <Layout>
              <Component {...pageProps} />
            </Layout>
          </Toast.Provider>
        )}
      </RainbowKitProvider>
    </WagmiConfig>
  );
}

export default MyApp;
