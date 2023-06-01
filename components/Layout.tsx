import { ConnectButton } from "@rainbow-me/rainbowkit";

import {
  DiscordLogoIcon,
  TwitterLogoIcon,
  ReaderIcon,
} from "@radix-ui/react-icons";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center overflow-hidden bg-extendedBlack selection:bg-accent selection:text-extendedBlack">
      <header className="flex w-full items-center justify-end px-4 py-5 md:px-12">
        <ConnectButton accountStatus="address" chainStatus="icon" />
      </header>
      <main className="flex-grow">{children}</main>
      <footer className="flex w-full grid-cols-2 flex-col-reverse items-center justify-between gap-1 px-4 py-5 sm:grid md:px-20">
        <div className="flex gap-4 text-secondary">
          <a
            href="#"
            target="_blank"
            rel="noreferrer noopener"
            className="transition-colors hover:text-primary"
          >
            docs
          </a>
          <a
            href="https://velocimeter.xyz"
            target="_blank"
            rel="noreferrer noopener"
            className="transition-colors hover:text-primary"
          >
            velocimeter
          </a>
        </div>
        <div className="flex gap-4 justify-self-end">
          <a
            className="block border border-secondary p-1 transition-colors duration-300 hover:bg-primary hover:text-extendedBlack"
            href="https://tuber.build/address/0xef22dd69062bc29113222f855b52a17cf1336d07" // TODO deployment chore
            target="_blank"
            rel="noreferrer noopener"
          >
            <ReaderIcon />
          </a>
          <a
            className="border-secondarys block border p-1 transition-colors duration-300 hover:bg-primary hover:text-extendedBlack"
            href="https://discord.com/invite/TnGnyq5kXw"
            target="_blank"
            rel="noreferrer noopener"
          >
            <DiscordLogoIcon />
          </a>
          <a
            className="block border border-secondary p-1 transition-colors duration-300 hover:bg-primary hover:text-extendedBlack"
            href="https://twitter.com/CadenceProtocol"
            target="_blank"
            rel="noreferrer noopener"
          >
            <TwitterLogoIcon />
          </a>
        </div>
      </footer>
    </div>
  );
}
