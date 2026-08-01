# Replate migration

Replate is the Dos Esposas old-to-new asset exchange. "Blend" remains a kitchen
operation.

## User transaction

The web app submits three contract calls as one Beacon/Taquito wallet batch:

1. Add the replacement contract as an operator for the selected legacy token.
2. Call `replate` with the replacement token ID and exact legacy raw amount.
3. Remove the replacement contract as an operator.

The replacement contract pulls the selected legacy amount into its own address
and mints the display-equivalent replacement amount to the caller. The
conversion uses each legacy and replacement token's stored decimal scale, so
the one-for-one rule is based on human-readable units rather than raw integers.

Manager operation groups are atomic on Tezos. A failed nested legacy transfer,
conversion, mint, or operator cleanup rolls back every call in the group.

## Asset mapping

`data/mainnet-assets.json` is the source of truth for the 39 original contracts,
token IDs, decimals, and replacement token IDs. All 39 original contracts
expose the FA2 `transfer` and `update_operators` entrypoints required by this
flow.

On Shadownet, `npm run shadownet:deploy` originates:

- A 39-token legacy rehearsal FA2 with one claim per wallet
- The 57-token replacement FA2 with the rehearsal address in its migration map

On mainnet, the page reads the real original balances but does not enable the
transaction until `NEXT_PUBLIC_MIGRATION_CONTRACT` is configured.

## Production boundary

The current SmartPy artifact is intentionally Shadownet-only. It includes public
starter and asset-minting entrypoints and must not be deployed to mainnet.
Before the production migration opens, create and audit a production
replacement build without test faucets, initialize replacement supply
appropriately, configure all 39 legacy mappings, and set
`NEXT_PUBLIC_MIGRATION_CONTRACT` to that originated address.

Captured originals have no withdrawal path in the current design. This makes
each replacement irreversible and prevents the same old asset from circulating
for another conversion.
