# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Dos Esposas collectors use the application with a Tezos wallet to inspect,
trade, purchase, craft, and migrate restaurant-themed fungible assets. They need
to understand exactly which network, contract, token, quantity, and irreversible
action they are approving.

## Product Purpose

Dos Esposas turns a Tezos asset collection into an interactive pixel restaurant.
Success means collectors can use real wallet inventory across the catalog and
complete on-chain actions without losing track of custody, value, or provenance.

## Positioning

The product combines verified legacy collection data with a playable kitchen
system in which ingredients, dishes, trades, and asset migrations remain real
FA2 operations rather than simulated game state.

## Operating Context

Users connect a Beacon-compatible Tezos wallet on mainnet or Shadownet. Mainnet
reads the original one-contract-per-asset collection. Shadownet provides a
complete test laboratory with replacement assets, recipes, purchases, transfers,
and mock legacy assets for migration testing.

## Capabilities and Constraints

- Existing mainnet Dos Esposas assets are the legacy source collection.
- Replacement assets use a new managed contract and retain the mapped asset's
  displayed units.
- Legacy conversion is same-chain and atomic: temporary FA2 operator approval,
  legacy custody transfer, replacement issuance, and approval removal share one
  wallet batch.
- Captured legacy assets are not returned through the conversion contract.
- Mainnet assets cannot be atomically converted into Shadownet assets.
- Images are managed independently from names, descriptions, decimals, supplies,
  and migration mappings.
- "Blend" is reserved for a kitchen recipe operation. The migration action is
  called "Replate."

## Brand Commitments

The product name is Dos Esposas. The established interface is bold, pixelated,
restaurant-specific, playful, and candid about wallet and chain state. Food and
service terminology should clarify mechanics rather than disguise risk.

## Evidence on Hand

- Verified legacy asset snapshot: `data/mainnet-assets.json`
- Human-readable legacy details: `docs/mainnet-asset-details.md`
- New asset metadata and allocation peers: `data/new-assets.json`
- Complete replacement details: `docs/replacement-asset-details.md`
- Replacement/test contract: `contracts/testnet/dos_esposas_testnet.py`
- Existing pixel asset art: `public/assets/items/`
- Existing wallet and inventory integrations: `components/wallet-provider.tsx`
  and `app/api/inventory/route.ts`

No production replacement-contract address or production migration deployment is
currently configured; the interface must not claim that mainnet conversion is
live until those addresses are supplied.

## Product Principles

- Make irreversible custody changes explicit before signature.
- Keep displayed quantities consistent across legacy and replacement assets.
- Use one source mapping for contracts, metadata, UI, and tests.
- Make the real on-chain mechanism playful without turning it into a mystery.
- Provide a complete Shadownet rehearsal before production deployment.

## Accessibility & Inclusion

All core actions require keyboard access, visible focus, reduced-motion support,
non-color state cues, and readable wallet errors. Animation may reinforce state
but cannot be required to understand or complete a conversion.
