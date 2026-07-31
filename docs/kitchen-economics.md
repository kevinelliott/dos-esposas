# Kitchen Economics

This document specifies the source-asset and random-drop behavior implemented
by the Shadownet `DosEsposasTestnet.craft` entrypoint. The canonical policy
values live in [`data/kitchen-mechanics.json`](../data/kitchen-mechanics.json).
The SmartPy compiler and the Next.js interface both read that file.

These mechanics are testnet-only. An existing originated contract is immutable
and must be replaced before it can use this policy.

## Action policy

| Action | Source handling | Source supply | Independently rolled default drops |
| --- | --- | --- | --- |
| Blend | Transfer to administrator kitchen reserve | Unchanged | 12.00%: 1 Lime (`LIME`, token 6); 4.00%: 1 Jalepeños (`PENO`, token 5) |
| Cook | Permanently burn | Decreases | 8.00%: 1 Sour Cream (`SCRM`, token 14); 3.00%: 1 Mexican Cheese (`MCHZ`, token 12) |
| Combine | Transfer to administrator kitchen reserve | Unchanged | None |
| Merge | Permanently burn | Decreases | 5.00%: 25 Restaurante Credits (`DER`, token 38); 1.50%: 1 Añejo Tequila (`ANEJO`, token 33) |
| Grill | Permanently burn | Decreases | 7.00%: 1 Ghost Pepper Sauce (`GHOST`, token 21); 4.00%: 1 Lime (`LIME`, token 6) |
| Bake | Permanently burn | Decreases | 10.00%: 1 Milk (`MILK`, token 15); 3.00%: 1 Churros (`CHURRO`, token 36) |
| Shake | Transfer to administrator kitchen reserve | Unchanged | 9.00%: 1 Lime (`LIME`, token 6); 2.50%: 1 Tezos Silver Tequila (`STQLA`, token 30) |
| Simmer | Permanently burn | Decreases | None |

These are deployment defaults. Each recipe stores its own drop list, initially
copied from its action, and an authorized manager can later replace that list.
Changing one `Cook` recipe does not change any other `Cook` recipe.

## Atomic craft sequence

A valid `craft(recipe_id, quantity)` call performs all changes atomically:

1. Reject tez, an unknown recipe, a zero quantity, or a quantity above 9.
2. Check and remove every required source unit from the caller.
3. Burn the sources or transfer them to the administrator reserve according to
   the recipe action.
4. Mint `recipe.output_amount * quantity` output units to the caller.
5. Resolve one independent roll for every configured drop.
6. Mint each fixed bonus whose roll succeeds.
7. Emit one `kitchen_drop` event per roll and one `kitchen_result` summary.

If any source balance is insufficient, every change fails and rolls back.

### Burn accounting

For each source asset:

```text
raw_consumed = ingredient_amount * quantity * (10 ^ source_decimals)
chef_balance_after = chef_balance_before - raw_consumed
source_supply_after = source_supply_before - raw_consumed
```

`Cook`, `Merge`, `Grill`, `Bake`, and `Simmer` use this path. These actions
permanently remove their input units from the FA2 ledger and reduce the tracked
global supply by exactly the same raw amount.

### Reserve accounting

For each source asset:

```text
raw_consumed = ingredient_amount * quantity * (10 ^ source_decimals)
chef_balance_after = chef_balance_before - raw_consumed
administrator_reserve_after = administrator_reserve_before + raw_consumed
source_supply_after = source_supply_before
```

`Blend`, `Combine`, and `Shake` use this path. The ingredients still leave the
chef's wallet, but they are not destroyed. The administrator owns the reserve
units and can later transfer them using the standard FA2 transfer entrypoint.

### Output and drop accounting

Recipe outputs are minted, so their supply increases by the output amount times
the batch quantity. Every successful bonus is also minted, so each winning
asset's supply increases by its fixed drop amount. Bonus amounts are expressed
in display units and converted using that asset's decimal scale.

Bonus amounts and roll counts do **not** scale with batch quantity. If a recipe
has two configured drops, a quantity-1 craft and a quantity-9 craft each receive
two rolls and the same fixed rewards on success. Both drops can win in one
craft. Splitting a batch into separate transactions produces more roll sets and
incurs more network operations and fees.

## Bonus roll

The contract stores a global `drop_nonce`, initially zero. After the recipe
output is minted, it calculates the following for every drop, using its
zero-based position in the recipe list:

```text
roll[drop_index] = (
  block_level * 7,919
  + drop_nonce * 104,729
  + recipe_id * 37
  + quantity * 101
  + (post_mint_output_raw_supply mod 9,973)
  + drop_index * 1,009
  + drop_token_id * 53
) mod 10,000
```

Each drop succeeds independently when:

```text
roll < chance_bps
```

Basis points make configured thresholds exact: 1,200 is 12.00%, 150 is 1.50%,
and so on. The nonce increments once after all configured drops have resolved.
A recipe with an empty drop list performs no drop rolls.

### Randomness limitation

This roll is deterministic and publicly predictable. It is suitable for
Shadownet gameplay rehearsal, not for valuable or adversarial mainnet rewards.
A caller can observe chain state, delay submission, choose a recipe or batch
size, or split batches to influence opportunities. A production deployment
should replace this calculation with an audited randomness design such as a
VRF/oracle or a commit-reveal flow with explicit anti-withholding rules.

## Manager authority

The administrator controls the `metadata_managers` allowlist through
`set_metadata_manager`. An enabled manager can:

- Update all three token image URI fields with `update_token_image`
- Update a token description with `update_token_description`

Managers cannot grant other managers, change the administrator, mint directly,
withdraw tez, change any recipe economics, or change legacy Replate mappings.
Revoking a manager immediately removes both metadata update powers. Recipe
ingredients, outputs, burn behavior, and drop tables are immutable so the
build-pinned policy reviewed before signing cannot drift after origination.

The policy digest is deliberately portable across originations; it is not proof
of who originated a particular contract or what supply was created. A separate
deployment-manifest v2 is generated only after TzKT indexes the replacement
origination. It commits to the Shadownet chain ID, origination operation and
contract address, administrator, every initial ledger and supply row, all token
metadata, and the immutable policy. The deployer checks that each token's
initial supply exactly equals the sum of its ledger balances and refuses to
publish environment configuration when the indexed snapshot differs from the
compiled storage.

### Manager commands

The deployment account grants or revokes a manager:

```bash
npm run testnet:metadata -- manager add tz1...
npm run testnet:metadata -- manager remove tz1...
```

The administrator or an enabled manager can update one description or
synchronize all saved descriptions:

```bash
npm run testnet:metadata -- description 16 "New Guacamole description"
npm run testnet:metadata -- descriptions sync
```

## Event data

Every configured drop emits a `kitchen_drop` event with:

| Field | Meaning |
| --- | --- |
| `chef` | Address that submitted the craft |
| `recipe_id` | Selected on-chain recipe |
| `drop_index` | Zero-based position in the recipe's drop list |
| `drop_token_id` | Reward token ID |
| `drop_amount` | Reward amount in display units |
| `drop_chance_bps` | Winning threshold in basis points |
| `roll` | Result from 0 through 9,999 |
| `awarded` | Whether this reward was minted |

Every successful craft also emits a `kitchen_result` summary with `chef`,
`recipe_id`, `quantity`, `burned_inputs`, and `drop_count`.

Indexers can use this event to show a post-transaction win result. The current
client reads compatible recipe drop lists from TzKT, refreshes wallet balances
after submission, and reports that the result is on-chain. Until the new
contract is deployed and indexed, it labels and displays the compiled defaults.
It does not infer a win before confirmation.

## Deployment and verification

Compile and run the SmartPy scenario:

```bash
PYTHON=/path/to/smartpy-venv/bin/python npm run testnet:compile
```

Then originate the new Shadownet contracts:

```bash
SHADOWNET_PRIVATE_KEY="edsk..." npm run testnet:deploy
```

The scenario verifies manager permissions and revocation, description updates,
the compiled recipe/drop policy, reserve transfers, reduced supply for burn
actions, the global nonce, and the maximum batch size.
The compiled artifact includes these mechanics only after a successful
recompilation.
