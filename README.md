# repo-watch

Track GitHub releases, activity and project maintenance right from your terminal.

```bash
npx ghrepo-watch facebook/react              # free snapshot, always free
npx ghrepo-watch changes facebook/react      # what's new since last check
npx ghrepo-watch intel facebook/react        # maintenance & health report
npx ghrepo-watch batch facebook/react,vercel/next.js
npx ghrepo-watch landscape facebook/react,vuejs/core
```

## Free quota (per 30 days, per install)

- 20 `changes` calls
- 20 `intel` calls
- 3 `batch` calls
- 3 `landscape` calls
- `snapshot` is unlimited and always free

When you exceed a quota you'll see the value the tool already delivered and an
upgrade prompt.

## Upgrade — Hobby, $9/month

```bash
ghrepo-watch login
```

Pay the exact USDC amount shown on **Base (ERC-20)** from any exchange or
wallet. The key is issued automatically and saved locally — no card, no AI
wallet required.

Hobby gives unlimited CLI calls and removes the attribution line. The same key
also works across the whole change-intelligence product family.

## For agents (x402)

Paid calls also settle per-request in USDC on Base using
[x402](https://x402.org): an unpaid request returns HTTP 402 with a
`PAYMENT-REQUIRED` header, the agent settles and retries. P2P, 0% commission.

## License

MIT
