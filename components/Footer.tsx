export function Footer() {
  return (
    <footer className="mt-12 border-t border-line">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-2 px-4 py-6 text-[12px] text-muted md:flex-row md:items-center md:justify-between md:px-6">
        <p>CTO trades on Solana with its own wallet. A meme, not an investment. Crypto is risky. Only use what you can afford to lose.</p>
        <p className="font-mono">built on solana · <a className="link" href="/how">how it works</a></p>
      </div>
    </footer>
  );
}
