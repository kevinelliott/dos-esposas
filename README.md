# Dos Esposas

A pixel-inspired Next.js interface for the Dos Esposas FA2 catalog on Tezos.
Ordinary development targets a local Tezos sandbox; Shadownet is reserved for
explicit final testing, and the product can still be built for live mainnet
through its separate release workflow.

## Features

- Live wallet inventory matched against verified Dos Esposas contracts
- Detail routes for every crop, ingredient, appetizer, main, drink, dessert,
  and utility token
- Live `dos-esposas.tez` system-wallet stock through TzKT
- Wallet-aware blend, cook, combine, merge, grill, bake, shake, and simmer
  recipe validation with real token art, a pixel chef, and operation-specific
  appliances animated between ingredients and the plated result
- Action-specific source burns or kitchen-reserve transfers, plus independently
  rolled multi-asset bonus drops with manager-controlled recipe configuration
- Searchable conversion metrics for every asset and recipe, including
  recursively expanded base-ingredient costs
- **Replate** conversion for exchanging original issues for matching new assets
- Local trade proposals with real wallet-signed FA2 delivery
- Contract-gated marketplace checkout and kitchen crafting
- Shadownet starter claims, per-asset and full-catalog minting, test
  purchases, recipes, and FA2 trades

The project intentionally does not accept purchase funds or burn recipe inputs
on mainnet unless the relevant contract address is configured. The original
mainnet Dos Esposas asset contracts are standard FA2 tokens; they do not provide
marketplace checkout, atomic trades, or recipe execution.

## Local-first lifecycle

The canonical chain runbook is
`REPOS/project-crypt-tezos-localnet/README.md` in the shared Buzz workspace.
This section records the complete Dos Esposas path from workstation setup
through local development, Shadownet promotion, and return to local work.

### 1. One-time setup

```bash
npm install
npm --prefix ../project-crypt-tezos-localnet run localnet:up
npm --prefix ../project-crypt-tezos-localnet run localnet:verify
npm test
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The chain must be healthy before Next.js launches. Ordinary `dev`, `test`,
`build`, and `start` use the committed `.env.localnet` identity and never fall
back to Shadownet or Mainnet. The app reports `localnet`; the RPC remains bound
to `127.0.0.1:8732`.

### 2. Daily local development

```bash
npm --prefix ../project-crypt-tezos-localnet run localnet:up
npm --prefix ../project-crypt-tezos-localnet run localnet:verify
npm run dev
```

Run the complete local gate before handing off a candidate:

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

`npm run build` creates `.next-localnet`; `npm start` serves that localnet build
and repeats the chain-ID preflight. Tests load `.env.localnet` directly and
include negative coverage for missing/unknown network selection, public localnet
RPC or indexer values, every TzKT-backed route, and the ordinary-versus-explicit
command boundary.

The base local profile intentionally has no Dos Esposas contract deployment or
local indexer. Contract-dependent and TzKT-backed features remain visibly and
explicitly unavailable instead of reading Shadownet. Pure application tests,
builds, wallet-boundary tests, contract compilation, and direct local RPC work
remain available. Do not treat a green build as proof of local contract
origination.

### 3. Preserve or reset local chain state

Preserve local contracts and operations between sessions:

```bash
../project-crypt-tezos-localnet/scripts/localnet stop
../project-crypt-tezos-localnet/scripts/localnet up
../project-crypt-tezos-localnet/scripts/localnet verify
```

Discard all local contracts, operations, and balance changes only when a clean
fixture is intentional:

```bash
../project-crypt-tezos-localnet/scripts/localnet reset --yes
../project-crypt-tezos-localnet/scripts/localnet up
../project-crypt-tezos-localnet/scripts/localnet verify-genesis
```

Reset removes only the shared localnet's named Compose volume. It restores the
same local chain ID and 50,000 XTZ bootstrap balances, but any prior local
contract addresses and operation hashes are obsolete and must not be carried
forward.

### 4. Promote an exact candidate to Shadownet

Shadownet is a final-test environment, not the ordinary development fallback.
Record a clean commit and pass the complete local gate first. Then verify the
public chain identity without mutating it:

```bash
npm --prefix ../project-crypt-tezos-localnet run shadownet:verify
npm run build:shadownet
```

Only after those checks should a test-only operator explicitly deploy or run
the Shadownet rehearsal described below. Keep the deployer key in the command's
process environment or a secure ignored source; the deployer writes only public
addresses and digests to `.env.shadownet.local`.

```bash
read -s SHADOWNET_PRIVATE_KEY
export SHADOWNET_PRIVATE_KEY
npm run shadownet:deploy
unset SHADOWNET_PRIVATE_KEY
npm run dev:shadownet
```

Before signing, confirm the wallet displays Shadownet. Preserve the exact
commit, chain ID, contract addresses, operation hashes, TzKT reconstruction,
deployment-manifest digest, and observed journey results. Submitted operations
are not confirmed results, and a Shadownet pass is not Mainnet readiness.

### 5. Return to local development

Stop the Shadownet process, remove any exported test key, and start the ordinary
command again:

```bash
unset SHADOWNET_PRIVATE_KEY
npm --prefix ../project-crypt-tezos-localnet run localnet:up
npm run dev
```

Do not copy Shadownet contract addresses, RPC URLs, TzKT URLs, or credentials
into `.env.localnet`. The app must again render `localnet`, and indexer-backed
features must return the controlled local unavailable state.

### 6. Build an explicit Mainnet release candidate

Mainnet has no development command. After separate production review, build the
read-only Mainnet profile with `npm run build:mainnet` and serve that exact
artifact with `npm run start:mainnet`. Both commands pin and verify Mainnet chain
identity; ordinary `dev`, `build`, and `start` remain Localnet. Supplying any
Mainnet mutation contract remains a separate audited release decision.

## Configuration

```bash
NEXT_PUBLIC_TEZOS_DAPP_NAME="Dos Esposas Local Lab"
NEXT_PUBLIC_TEZOS_NETWORK="localnet"
NEXT_PUBLIC_TEZOS_RPC_URL="http://127.0.0.1:8732"
NEXT_PUBLIC_TEZOS_CHAIN_ID="NetXtJqPyJGB6Pc"
NEXT_PUBLIC_TEZOS_INDEXER_URL=""
NEXT_PUBLIC_MARKETPLACE_CONTRACT=""
NEXT_PUBLIC_KITCHEN_CONTRACT=""
NEXT_PUBLIC_MIGRATION_CONTRACT=""
```

`npm run dev`, `npm run build`, and `npm start` verify the local RPC chain ID
before launching. Missing, misspelled, or inconsistent network values stop the
app. Localnet has no TzKT service, so inventory, operation confirmation, supply
metrics, recipe policy, and deployment attestation return controlled unavailable
responses instead of querying Shadownet or Mainnet.

The marketplace adapter expects a `buy` entrypoint. The kitchen adapter expects
a `craft` entrypoint accepting `recipe_id` and `quantity`. Leave these values
empty until compatible contracts are deployed. The Replate adapter expects the
new FA2 contract to expose `replate` and uses the original FA2 contracts'
standard `update_operators` entrypoint.

Mainnet Replate stays visibly locked until `NEXT_PUBLIC_MIGRATION_CONTRACT`
points to the audited replacement asset contract. Do not deploy the Shadownet
test artifact on mainnet: it intentionally contains public test faucets.

## Shadownet test lab

Ghostnet has been retired. This project targets Shadownet, the long-lived Tezos
dApp testnet, at `https://rpc.shadownet.teztnets.com`.

The included FA2 test contract provides all 57 Dos Esposas item types plus:

- Atomic Replate capture and replacement minting for the 39 original assets
- A one-time starter pantry claim of 25 units per item
- Repeatable per-asset minting and full-catalog batch minting
- Purchases using valueless test tez
- Twenty-two recipes spanning eight distinct kitchen operations
- Supply-reducing burns for hot kitchen actions, reserve transfers for cold
  actions, and one independent roll per configured bonus type
- Distinct forge, checkout, trade, Replate, and kitchen transaction phases
- Standard FA2 transfers for user-to-user trade delivery
- Revocable asset managers for token images and descriptions
- Mainnet-matched metadata, decimal scales, and initial supplies for the 39
  original assets
- Peer-matched initial allocations for the 18 new crops, ingredients, dishes,
  drinks, and desserts
- A separate 39-token legacy rehearsal contract with a one-time claim

### 1. Prepare a test-only wallet

Create a separate Tezos account and fund it with at least 20 test tez from the
[Shadownet faucet](https://faucet.shadownet.teztnets.com). Never use a mainnet
private key for test deployment.

### 2. Deploy the test contracts

The compiled Michelson artifacts are included, so this step only needs the
funded secret key in the current shell:

```bash
SHADOWNET_PRIVATE_KEY="edsk..." npm run shadownet:deploy
```

The deployer verifies Shadownet's chain ID, reveals a new account in a separate
operation when necessary, and simulates the origination with bounded gas and
storage limits before injecting them. It originates the legacy rehearsal FA2
first, inserts that address into the replacement asset storage, and then
originates the replacement FA2. Confirmation uses direct chain-state polling so
deployment can recover from public RPC lag. Before writing app configuration,
the deployer reads the TzKT-indexed origination snapshot and creates
`contracts/testnet/build/deployment-manifest.json`. This v2 attestation binds the
chain ID, origination operation and address, administrator, complete initial
ledger and supply, token metadata, and the immutable economic policy. Deployment
stops if any token supply differs from the sum of its initial ledger balances or
if the indexed snapshot differs from the compiled storage. It then writes only
public contract and account addresses and the reviewed digests to the
git-ignored `.env.shadownet.local`; it does not save the private key. After
origination, it applies all 57 replacement descriptions in eight smaller
operations so the deployment remains below Tezos' operation-size limit.

### 3. Run and test

```bash
npm run dev:shadownet
```

Open [http://localhost:3000](http://localhost:3000), switch the wallet extension
to Shadownet, connect, and use **Claim starter pantry** or open **Asset Forge**
to mint any of the 57 asset types. Purchases and crafting then submit real
Shadownet operations, while trade delivery uses the contract's FA2 `transfer`
entrypoint.

Open **Replate**, claim the legacy rehearsal set, choose one of the 39 original
items, confirm permanent capture, and ring the Replate bell. The wallet signs
one manager operation group containing:

1. Temporary operator approval on the legacy FA2
2. Legacy transfer into the replacement contract and replacement mint
3. Operator removal

Tezos applies that group atomically. If capture or minting fails, the approval
and every other state change roll back. Captured assets remain in the
replacement contract and have no withdrawal entrypoint.

To recompile after editing the SmartPy source:

```bash
python3 -m pip install smartpy-tezos
npm run testnet:compile
```

The compile command refreshes the checked-in artifacts in
`contracts/testnet/build/` automatically. It produces `contract.json` and
`storage.json` for the replacement FA2, plus `legacy-contract.json` and
`legacy-storage.json` for the rehearsal collection. It also writes
`policy-manifest.json`, whose build-pinned digest covers every token unit scale,
recipe effect, and legacy mapping. Recompiling invalidates any existing
deployment manifest because that deployment-specific attestation must be
regenerated from a new indexed origination. The deployment command waits for
TzKT and writes the indexed code hash, portable policy hash, and
deployment-specific manifest hash to `.env.shadownet.local`.

The exact burn, reserve, and random-drop policy is documented in
[`docs/kitchen-economics.md`](docs/kitchen-economics.md). The drop calculation
is deliberately testnet-grade and must not be treated as secure mainnet
randomness.

### Refresh mainnet asset details

The dated source snapshot is in `data/mainnet-assets.json`, with a readable
report in `docs/mainnet-asset-details.md`. Refresh both from the 39 original
mainnet contracts with:

```bash
npm run mainnet:sync
```

Names, symbols, decimals, descriptions, and indexed supply details come from
TzKT. Image fields are deliberately excluded. To reapply the saved descriptions
to an already deployed compatible Shadownet contract:

```bash
read -s SHADOWNET_PRIVATE_KEY
export SHADOWNET_PRIVATE_KEY
printf '\n'
npm run shadownet:metadata -- descriptions sync
unset SHADOWNET_PRIVATE_KEY
```

### Refresh replacement asset details

The complete replacement collection is documented in
`docs/replacement-asset-details.md`. The first 39 tokens preserve the legacy
raw allocations; the 18 additions use the displayed supply of an explicit
same-category legacy peer recorded in `data/new-assets.json`.

Regenerate and validate the 57-token report after changing metadata or
allocations:

```bash
npm run replacement:sync
```

Allocation changes affect newly compiled storage only. An already originated
contract must be replaced to receive different initial balances.

### Manage asset metadata

The deployment account is the contract administrator. It can update token
metadata directly and grant or revoke asset managers without giving those
accounts minting, treasury, transfer, economic-policy, or administrator access.
Recipe ingredients, burn rules, and drops are immutable in the reviewed
Shadownet artifact.

Because Tezos contract code is immutable, contracts deployed before these
entrypoints were added must be originated again. After deploying the updated
contract, use a test-only administrator key to manage accounts:

```bash
read -s SHADOWNET_PRIVATE_KEY
export SHADOWNET_PRIVATE_KEY
printf '\n'
npm run shadownet:metadata -- manager add tz1...
npm run shadownet:metadata -- manager remove tz1...
unset SHADOWNET_PRIVATE_KEY
```

The administrator or an active asset manager can set all three standard TZIP-12
image fields (`artifactUri`, `displayUri`, and `thumbnailUri`) for a token in
one operation:

```bash
read -s SHADOWNET_PRIVATE_KEY
export SHADOWNET_PRIVATE_KEY
printf '\n'
npm run shadownet:metadata -- image 16 ipfs://bafy...
unset SHADOWNET_PRIVATE_KEY
```

Use immutable IPFS content identifiers for production-like testing. HTTPS
image URLs are accepted when the host is expected to remain stable.

The same managers can update descriptions:

```bash
npm run shadownet:metadata -- description 16 "Updated description"
```

See [`docs/kitchen-economics.md`](docs/kitchen-economics.md) for event
payloads, default rewards, and testnet randomness limitations.

## Checks

```bash
npm run lint
npm run typecheck
npm run build
npm run build:shadownet
npm run build:mainnet
npm run verify:ui
```
