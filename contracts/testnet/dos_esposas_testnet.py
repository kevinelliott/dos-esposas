import json
from pathlib import Path

import smartpy as sp
from smartpy.templates import fa2_lib as fa2

main = fa2.main


@sp.module
def dos_esposas_testnet():
    import main

    ingredient_type: type = sp.record(token_id=sp.nat, amount=sp.nat).layout(
        ("token_id", "amount")
    )
    drop_type: type = sp.record(
        token_id=sp.nat,
        amount=sp.nat,
        chance_bps=sp.nat,
    ).layout(("token_id", ("amount", "chance_bps")))
    recipe_type: type = sp.record(
        output_token_id=sp.nat,
        output_amount=sp.nat,
        ingredients=sp.list[ingredient_type],
        burn_inputs=sp.bool,
        drops=sp.list[drop_type],
    ).layout(
        (
            "output_token_id",
            ("output_amount", ("ingredients", ("burn_inputs", "drops"))),
        )
    )
    manager_update_type: type = sp.record(
        manager=sp.address,
        enabled=sp.bool,
    ).layout(("manager", "enabled"))
    image_update_type: type = sp.record(
        token_id=sp.nat,
        image_uri=sp.bytes,
    ).layout(("token_id", "image_uri"))
    description_update_type: type = sp.record(
        token_id=sp.nat,
        description=sp.bytes,
    ).layout(("token_id", "description"))
    recipe_drops_update_type: type = sp.record(
        recipe_id=sp.nat,
        drops=sp.list[drop_type],
    ).layout(("recipe_id", "drops"))
    legacy_asset_type: type = sp.record(
        contract=sp.address,
        token_id=sp.nat,
        unit_scale=sp.nat,
    ).layout(("contract", ("token_id", "unit_scale")))
    legacy_asset_update_type: type = sp.record(
        replacement_token_id=sp.nat,
        contract=sp.address,
        token_id=sp.nat,
        unit_scale=sp.nat,
        enabled=sp.bool,
    ).layout(
        (
            "replacement_token_id",
            ("contract", ("token_id", ("unit_scale", "enabled"))),
        )
    )
    replate_type: type = sp.record(
        replacement_token_id=sp.nat,
        legacy_amount=sp.nat,
    ).layout(("replacement_token_id", "legacy_amount"))
    legacy_tx_type: type = sp.record(
        to_=sp.address,
        token_id=sp.nat,
        amount=sp.nat,
    ).layout(("to_", ("token_id", "amount")))
    legacy_transfer_batch_type: type = sp.record(
        from_=sp.address,
        txs=sp.list[legacy_tx_type],
    ).layout(("from_", "txs"))
    legacy_transfer_type: type = sp.list[legacy_transfer_batch_type]

    class LegacyMock(main.Fungible, main.OnchainviewBalanceOf):
        """Shadownet rehearsal assets with standard FA2 operator support."""

        def __init__(
            self,
            contract_metadata,
            ledger,
            token_metadata,
            unit_scales,
        ):
            main.OnchainviewBalanceOf.__init__(self)
            main.Fungible.__init__(
                self, contract_metadata, ledger, token_metadata
            )
            self.data.unit_scales = sp.cast(
                unit_scales, sp.big_map[sp.nat, sp.nat]
            )
            self.data.claimed = sp.cast(
                sp.big_map(), sp.big_map[sp.address, sp.unit]
            )

        @sp.entrypoint
        def claim_legacy(self):
            """Give a Shadownet address legacy inventory for migration tests."""
            assert sp.amount == sp.tez(0), "NO_TEZ_REQUIRED"
            assert not (sp.sender in self.data.claimed), "ALREADY_CLAIMED"
            self.data.claimed[sp.sender] = ()
            for token_id in range(0, self.data.next_token_id):
                amount = 10 * self.data.unit_scales[token_id]
                owner_key = (sp.sender, token_id)
                self.data.ledger[owner_key] = (
                    self.data.ledger.get(owner_key, default=0) + amount
                )
                self.data.supply[token_id] += amount

    class DosEsposasTestnet(
        main.Admin,
        main.Fungible,
        main.OnchainviewBalanceOf,
        main.WithdrawMutez,
    ):
        """Shadownet-only FA2 with a starter faucet, checkout, and recipe engine."""

        def __init__(
            self,
            admin_address,
            contract_metadata,
            ledger,
            token_metadata,
            unit_scales,
            recipes,
            legacy_assets,
        ):
            main.WithdrawMutez.__init__(self)
            main.OnchainviewBalanceOf.__init__(self)
            main.Fungible.__init__(
                self, contract_metadata, ledger, token_metadata
            )
            main.Admin.__init__(self, admin_address)
            self.data.claimed = sp.cast(
                sp.big_map(), sp.big_map[sp.address, sp.unit]
            )
            self.data.recipes = sp.cast(
                recipes, sp.big_map[sp.nat, recipe_type]
            )
            self.data.unit_scales = sp.cast(
                unit_scales, sp.big_map[sp.nat, sp.nat]
            )
            self.data.legacy_assets = sp.cast(
                legacy_assets, sp.big_map[sp.nat, legacy_asset_type]
            )
            self.data.replated = sp.cast(
                sp.big_map(), sp.big_map[sp.nat, sp.nat]
            )
            self.data.metadata_managers = sp.cast(
                set(), sp.set[sp.address]
            )
            self.data.drop_nonce = 0

        @sp.entrypoint
        def set_metadata_manager(self, params):
            """Grant or revoke asset metadata and recipe-drop management."""
            sp.cast(params, manager_update_type)
            assert self.is_administrator_(), "FA2_NOT_ADMIN"
            if params.enabled:
                self.data.metadata_managers.add(params.manager)
            else:
                self.data.metadata_managers.remove(params.manager)

        @sp.entrypoint
        def update_token_image(self, params):
            """Update the standard TZIP-12 image fields for one token."""
            sp.cast(params, image_update_type)
            assert (
                self.is_administrator_()
                or sp.sender in self.data.metadata_managers
            ), "FA2_NOT_METADATA_MANAGER"
            assert params.token_id in self.data.token_metadata, "FA2_TOKEN_UNDEFINED"
            assert sp.len(params.image_uri) > 0, "EMPTY_IMAGE_URI"
            assert sp.len(params.image_uri) <= 2048, "IMAGE_URI_TOO_LONG"

            metadata = self.data.token_metadata[params.token_id]
            metadata.token_info["artifactUri"] = params.image_uri
            metadata.token_info["displayUri"] = params.image_uri
            metadata.token_info["thumbnailUri"] = params.image_uri
            self.data.token_metadata[params.token_id] = metadata

        @sp.entrypoint
        def update_token_description(self, params):
            """Update one token description as administrator or manager."""
            sp.cast(params, description_update_type)
            assert (
                self.is_administrator_()
                or sp.sender in self.data.metadata_managers
            ), "FA2_NOT_METADATA_MANAGER"
            assert params.token_id in self.data.token_metadata, "FA2_TOKEN_UNDEFINED"
            assert sp.len(params.description) > 0, "EMPTY_DESCRIPTION"
            assert sp.len(params.description) <= 8192, "DESCRIPTION_TOO_LONG"

            metadata = self.data.token_metadata[params.token_id]
            metadata.token_info["description"] = params.description
            self.data.token_metadata[params.token_id] = metadata

        @sp.entrypoint
        def update_recipe_drops(self, params):
            """Replace one recipe's independently rolled reward list."""
            sp.cast(params, recipe_drops_update_type)
            assert (
                self.is_administrator_()
                or sp.sender in self.data.metadata_managers
            ), "FA2_NOT_METADATA_MANAGER"
            assert params.recipe_id in self.data.recipes, "UNKNOWN_RECIPE"
            assert sp.len(params.drops) <= 8, "TOO_MANY_DROPS"

            seen = sp.cast(set(), sp.set[sp.nat])
            for drop in params.drops:
                assert (
                    drop.token_id in self.data.token_metadata
                ), "FA2_TOKEN_UNDEFINED"
                assert not (
                    drop.token_id in seen
                ), "DUPLICATE_DROP_TOKEN"
                assert drop.amount > 0, "ZERO_DROP_AMOUNT"
                assert (
                    drop.chance_bps > 0 and drop.chance_bps <= 10_000
                ), "INVALID_DROP_CHANCE"
                seen.add(drop.token_id)

            recipe = self.data.recipes[params.recipe_id]
            recipe.drops = params.drops
            self.data.recipes[params.recipe_id] = recipe
            sp.emit(
                sp.record(
                    manager=sp.sender,
                    recipe_id=params.recipe_id,
                    drop_count=sp.len(params.drops),
                ),
                tag="recipe_drops_updated",
            )

        @sp.entrypoint
        def set_legacy_asset(self, params):
            """Configure the legacy FA2 accepted for one replacement token."""
            sp.cast(params, legacy_asset_update_type)
            assert self.is_administrator_(), "FA2_NOT_ADMIN"
            assert (
                params.replacement_token_id in self.data.token_metadata
            ), "FA2_TOKEN_UNDEFINED"
            if params.enabled:
                assert params.unit_scale > 0, "INVALID_UNIT_SCALE"
                self.data.legacy_assets[params.replacement_token_id] = sp.record(
                    contract=params.contract,
                    token_id=params.token_id,
                    unit_scale=params.unit_scale,
                )
            else:
                del self.data.legacy_assets[params.replacement_token_id]

        @sp.entrypoint
        def replate(self, params):
            """Capture a mapped legacy token and mint its replacement."""
            sp.cast(params, replate_type)
            assert sp.amount == sp.tez(0), "NO_TEZ_REQUIRED"
            assert params.legacy_amount > 0, "ZERO_QUANTITY"
            assert (
                params.replacement_token_id in self.data.legacy_assets
            ), "LEGACY_ASSET_UNSUPPORTED"

            legacy = self.data.legacy_assets[params.replacement_token_id]
            converted_numerator = (
                params.legacy_amount
                * self.data.unit_scales[params.replacement_token_id]
            )
            assert (
                sp.mod(converted_numerator, legacy.unit_scale) == 0
            ), "INEXACT_CONVERSION"
            replacement_amount = converted_numerator / legacy.unit_scale
            legacy_transfer = sp.contract(
                legacy_transfer_type,
                legacy.contract,
                entrypoint="transfer",
            ).unwrap_some(error="LEGACY_TRANSFER_UNAVAILABLE")
            sp.transfer(
                [
                    sp.record(
                        from_=sp.sender,
                        txs=[
                            sp.record(
                                to_=sp.self_address,
                                token_id=legacy.token_id,
                                amount=params.legacy_amount,
                            )
                        ],
                    )
                ],
                sp.mutez(0),
                legacy_transfer,
            )

            owner_key = (sp.sender, params.replacement_token_id)
            self.data.ledger[owner_key] = (
                self.data.ledger.get(owner_key, default=0)
                + replacement_amount
            )
            self.data.supply[params.replacement_token_id] += replacement_amount
            self.data.replated[params.replacement_token_id] = (
                self.data.replated.get(
                    params.replacement_token_id, default=0
                )
                + replacement_amount
            )

        @sp.entrypoint
        def claim_starter(self):
            """Give each Shadownet address one starter batch."""
            assert sp.amount == sp.tez(0), "NO_TEZ_REQUIRED"
            assert not (sp.sender in self.data.claimed), "ALREADY_CLAIMED"
            self.data.claimed[sp.sender] = ()
            for token_id in range(0, self.data.next_token_id):
                amount = 25 * self.data.unit_scales[token_id]
                owner_key = (sp.sender, token_id)
                self.data.ledger[owner_key] = (
                    self.data.ledger.get(owner_key, default=0) + amount
                )
                self.data.supply[token_id] += amount

        @sp.entrypoint
        def buy(self, params):
            """Mint test inventory after a wallet-signed Shadownet payment."""
            sp.cast(
                params,
                sp.record(token_id=sp.nat, quantity=sp.nat).layout(
                    ("token_id", "quantity")
                ),
            )
            assert params.token_id in self.data.token_metadata, "FA2_TOKEN_UNDEFINED"
            assert params.quantity > 0, "ZERO_QUANTITY"
            assert sp.amount > sp.tez(0), "PAYMENT_REQUIRED"
            amount = params.quantity * self.data.unit_scales[params.token_id]
            owner_key = (sp.sender, params.token_id)
            self.data.ledger[owner_key] = (
                self.data.ledger.get(owner_key, default=0) + amount
            )
            self.data.supply[params.token_id] += amount

        @sp.entrypoint
        def mint_test_asset(self, params):
            """Mint any catalog asset directly to the Shadownet caller."""
            sp.cast(
                params,
                sp.record(token_id=sp.nat, quantity=sp.nat).layout(
                    ("token_id", "quantity")
                ),
            )
            assert sp.amount == sp.tez(0), "NO_TEZ_REQUIRED"
            assert params.token_id in self.data.token_metadata, "FA2_TOKEN_UNDEFINED"
            assert params.quantity > 0, "ZERO_QUANTITY"
            assert params.quantity <= 100, "QUANTITY_TOO_LARGE"
            amount = params.quantity * self.data.unit_scales[params.token_id]
            owner_key = (sp.sender, params.token_id)
            self.data.ledger[owner_key] = (
                self.data.ledger.get(owner_key, default=0) + amount
            )
            self.data.supply[params.token_id] += amount

        @sp.entrypoint
        def mint_test_collection(self, quantity):
            """Mint a small batch of every defined asset to the caller."""
            sp.cast(quantity, sp.nat)
            assert sp.amount == sp.tez(0), "NO_TEZ_REQUIRED"
            assert quantity > 0, "ZERO_QUANTITY"
            assert quantity <= 10, "QUANTITY_TOO_LARGE"
            for token_id in range(0, self.data.next_token_id):
                amount = quantity * self.data.unit_scales[token_id]
                owner_key = (sp.sender, token_id)
                self.data.ledger[owner_key] = (
                    self.data.ledger.get(owner_key, default=0) + amount
                )
                self.data.supply[token_id] += amount

        @sp.entrypoint
        def craft(self, params):
            """Consume inputs, mint an output, and resolve reward rolls."""
            sp.cast(
                params,
                sp.record(recipe_id=sp.nat, quantity=sp.nat).layout(
                    ("recipe_id", "quantity")
                ),
            )
            assert sp.amount == sp.tez(0), "NO_TEZ_REQUIRED"
            assert params.quantity > 0, "ZERO_QUANTITY"
            assert params.quantity <= 9, "QUANTITY_TOO_LARGE"
            assert params.recipe_id in self.data.recipes, "UNKNOWN_RECIPE"
            recipe = self.data.recipes[params.recipe_id]

            for ingredient in recipe.ingredients:
                amount = (
                    ingredient.amount
                    * params.quantity
                    * self.data.unit_scales[ingredient.token_id]
                )
                owner_key = (sp.sender, ingredient.token_id)
                self.data.ledger[owner_key] = sp.as_nat(
                    self.data.ledger.get(owner_key, default=0) - amount,
                    error="INSUFFICIENT_INGREDIENTS",
                )
                if recipe.burn_inputs:
                    self.data.supply[ingredient.token_id] = sp.as_nat(
                        self.data.supply[ingredient.token_id] - amount
                    )
                else:
                    reserve_key = (
                        self.data.administrator,
                        ingredient.token_id,
                    )
                    self.data.ledger[reserve_key] = (
                        self.data.ledger.get(reserve_key, default=0) + amount
                    )

            output_amount = (
                recipe.output_amount
                * params.quantity
                * self.data.unit_scales[recipe.output_token_id]
            )
            output_key = (sp.sender, recipe.output_token_id)
            self.data.ledger[output_key] = (
                self.data.ledger.get(output_key, default=0) + output_amount
            )
            self.data.supply[recipe.output_token_id] += output_amount

            drop_index = 0
            for drop in recipe.drops:
                roll = sp.mod(
                    sp.level * 7_919
                    + self.data.drop_nonce * 104_729
                    + params.recipe_id * 37
                    + params.quantity * 101
                    + sp.mod(
                        self.data.supply[recipe.output_token_id], 9_973
                    )
                    + drop_index * 1_009
                    + drop.token_id * 53,
                    10_000,
                )
                drop_awarded = roll < drop.chance_bps
                if drop_awarded:
                    drop_amount = (
                        drop.amount
                        * self.data.unit_scales[drop.token_id]
                    )
                    drop_key = (sp.sender, drop.token_id)
                    self.data.ledger[drop_key] = (
                        self.data.ledger.get(drop_key, default=0)
                        + drop_amount
                    )
                    self.data.supply[drop.token_id] += drop_amount

                sp.emit(
                    sp.record(
                        chef=sp.sender,
                        recipe_id=params.recipe_id,
                        drop_index=drop_index,
                        drop_token_id=drop.token_id,
                        drop_amount=drop.amount,
                        drop_chance_bps=drop.chance_bps,
                        roll=roll,
                        awarded=drop_awarded,
                    ),
                    tag="kitchen_drop",
                )
                drop_index += 1

            self.data.drop_nonce += 1

            sp.emit(
                sp.record(
                    chef=sp.sender,
                    recipe_id=params.recipe_id,
                    quantity=params.quantity,
                    burned_inputs=recipe.burn_inputs,
                    drop_count=sp.len(recipe.drops),
                ),
                tag="kitchen_result",
            )


MAINNET_ASSET_SNAPSHOT = (
    Path(__file__).resolve().parents[2] / "data" / "mainnet-assets.json"
)
NEW_ASSET_SNAPSHOT = (
    Path(__file__).resolve().parents[2] / "data" / "new-assets.json"
)
KITCHEN_MECHANICS_SNAPSHOT = (
    Path(__file__).resolve().parents[2] / "data" / "kitchen-mechanics.json"
)
ORIGINAL_TOKEN_DETAILS = json.loads(
    MAINNET_ASSET_SNAPSHOT.read_text(encoding="utf-8")
)
NEW_TOKEN_DETAILS = json.loads(
    NEW_ASSET_SNAPSHOT.read_text(encoding="utf-8")
)
assert [
    token["shadownetTokenId"] for token in ORIGINAL_TOKEN_DETAILS
] == list(range(39))
assert [
    token["replacementTokenId"] for token in NEW_TOKEN_DETAILS
] == list(range(39, 57))

TOKEN_DETAILS = ORIGINAL_TOKEN_DETAILS + NEW_TOKEN_DETAILS
KITCHEN_MECHANICS = json.loads(
    KITCHEN_MECHANICS_SNAPSHOT.read_text(encoding="utf-8")
)
KITCHEN_MECHANICS_BY_ACTION = {
    mechanic["action"]: mechanic for mechanic in KITCHEN_MECHANICS
}
assert set(KITCHEN_MECHANICS_BY_ACTION) == {
    "Blend",
    "Cook",
    "Combine",
    "Merge",
    "Grill",
    "Bake",
    "Shake",
    "Simmer",
}
TOKEN_ID_BY_SLUG = {
    token["slug"]: token_id for token_id, token in enumerate(TOKEN_DETAILS)
}
for mechanic in KITCHEN_MECHANICS:
    assert mechanic["burnsInputs"] == (
        mechanic["inputDisposition"] == "burn"
    )
    assert len(mechanic["drops"]) <= 8
    assert len({drop["slug"] for drop in mechanic["drops"]}) == len(
        mechanic["drops"]
    )
    for drop in mechanic["drops"]:
        assert drop["slug"] in TOKEN_ID_BY_SLUG
        assert drop["amount"] > 0
        assert 0 < drop["chanceBps"] <= 10_000


def metadata_bytes(value):
    return sp.bytes("0x" + value.encode("utf-8").hex())


def make_token_metadata(token):
    values = {
        "decimals": metadata_bytes(str(token["decimals"])),
        "name": metadata_bytes(token["name"]),
        "symbol": metadata_bytes(token["symbol"]),
        "shouldPreferSymbol": metadata_bytes(
            "true" if token["shouldPreferSymbol"] else "false"
        ),
    }
    return sp.map(l=values)


def ingredient(token_id, amount):
    return sp.record(token_id=token_id, amount=amount)


def recipe(output_token_id, ingredients, action):
    mechanic = KITCHEN_MECHANICS_BY_ACTION[action]
    return sp.record(
        output_token_id=output_token_id,
        output_amount=1,
        ingredients=ingredients,
        burn_inputs=mechanic["burnsInputs"],
        drops=[
            sp.record(
                token_id=TOKEN_ID_BY_SLUG[drop["slug"]],
                amount=drop["amount"],
                chance_bps=drop["chanceBps"],
            )
            for drop in mechanic["drops"]
        ],
    )


PLACEHOLDER_ADMIN = sp.address("tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb")
PLACEHOLDER_LEGACY = sp.address("KT1SeR63WtS4m3BPjmsQwNuCNPSi6Pc5aHhm")


@sp.add_test()
def compile_contract():
    scenario = sp.test_scenario(
        "dos_esposas_testnet", dos_esposas_testnet
    )
    token_metadata = [make_token_metadata(token) for token in TOKEN_DETAILS]
    initial_ledger = {
        (PLACEHOLDER_ADMIN, token_id): int(token["totalSupplyRaw"])
        for token_id, token in enumerate(TOKEN_DETAILS)
    }
    unit_scales = sp.big_map(
        {
            token_id: 10 ** int(token["decimals"])
            for token_id, token in enumerate(TOKEN_DETAILS)
        }
    )
    legacy_assets = sp.big_map(
        {
            token["shadownetTokenId"]: sp.record(
                contract=PLACEHOLDER_LEGACY,
                token_id=token["shadownetTokenId"],
                unit_scale=10 ** int(token["decimals"]),
            )
            for token in ORIGINAL_TOKEN_DETAILS
        }
    )
    recipes = sp.big_map(
        {
            0: recipe(
                16,
                [
                    ingredient(2, 3),
                    ingredient(6, 1),
                    ingredient(3, 1),
                    ingredient(7, 1),
                ],
                "Blend",
            ),
            1: recipe(
                17,
                [ingredient(0, 4), ingredient(11, 2)],
                "Combine",
            ),
            2: recipe(
                19,
                [ingredient(13, 3), ingredient(15, 1), ingredient(5, 1)],
                "Cook",
            ),
            3: recipe(
                22,
                [
                    ingredient(11, 2),
                    ingredient(8, 2),
                    ingredient(9, 1),
                    ingredient(10, 1),
                    ingredient(12, 1),
                ],
                "Cook",
            ),
            4: recipe(
                23,
                [
                    ingredient(11, 3),
                    ingredient(8, 2),
                    ingredient(3, 2),
                    ingredient(12, 1),
                ],
                "Cook",
            ),
            5: recipe(
                24,
                [
                    ingredient(8, 4),
                    ingredient(6, 1),
                    ingredient(4, 1),
                    ingredient(7, 1),
                ],
                "Grill",
            ),
            6: recipe(
                27,
                [
                    ingredient(26, 2),
                    ingredient(6, 1),
                    ingredient(3, 1),
                    ingredient(21, 1),
                ],
                "Shake",
            ),
            7: recipe(
                29,
                [ingredient(28, 2), ingredient(32, 1), ingredient(6, 1)],
                "Merge",
            ),
            8: recipe(
                25,
                [ingredient(8, 12), ingredient(24, 2)],
                "Merge",
            ),
            9: recipe(
                37,
                [ingredient(15, 3), ingredient(1, 2), ingredient(35, 1)],
                "Bake",
            ),
            10: recipe(
                45,
                [
                    ingredient(39, 3),
                    ingredient(5, 1),
                    ingredient(7, 1),
                    ingredient(6, 1),
                ],
                "Blend",
            ),
            11: recipe(
                46,
                [
                    ingredient(11, 2),
                    ingredient(42, 2),
                    ingredient(43, 1),
                    ingredient(45, 1),
                ],
                "Cook",
            ),
            12: recipe(
                47,
                [
                    ingredient(0, 3),
                    ingredient(43, 1),
                    ingredient(14, 1),
                    ingredient(6, 1),
                ],
                "Combine",
            ),
            13: recipe(
                48,
                [
                    ingredient(4, 2),
                    ingredient(43, 2),
                    ingredient(3, 1),
                ],
                "Cook",
            ),
            14: recipe(
                49,
                [
                    ingredient(0, 4),
                    ingredient(8, 2),
                    ingredient(7, 1),
                    ingredient(21, 1),
                ],
                "Simmer",
            ),
            15: recipe(
                50,
                [
                    ingredient(11, 3),
                    ingredient(42, 2),
                    ingredient(43, 1),
                    ingredient(45, 1),
                ],
                "Cook",
            ),
            16: recipe(
                51,
                [
                    ingredient(10, 3),
                    ingredient(15, 2),
                    ingredient(44, 1),
                ],
                "Blend",
            ),
            17: recipe(
                52,
                [ingredient(40, 3), ingredient(6, 1)],
                "Blend",
            ),
            18: recipe(
                53,
                [
                    ingredient(30, 1),
                    ingredient(41, 2),
                    ingredient(6, 1),
                ],
                "Shake",
            ),
            19: recipe(
                54,
                [
                    ingredient(10, 3),
                    ingredient(15, 2),
                    ingredient(44, 1),
                ],
                "Simmer",
            ),
            20: recipe(
                55,
                [
                    ingredient(1, 3),
                    ingredient(15, 1),
                    ingredient(44, 1),
                ],
                "Cook",
            ),
            21: recipe(
                56,
                [
                    ingredient(55, 2),
                    ingredient(44, 1),
                    ingredient(15, 1),
                ],
                "Merge",
            ),
        }
    )
    contract = dos_esposas_testnet.DosEsposasTestnet(
        PLACEHOLDER_ADMIN,
        sp.big_map(),
        initial_ledger,
        token_metadata,
        unit_scales,
        recipes,
        legacy_assets,
    )
    scenario += contract
    legacy = dos_esposas_testnet.LegacyMock(
        sp.big_map(),
        {
            (PLACEHOLDER_ADMIN, token["shadownetTokenId"]): int(
                token["totalSupplyRaw"]
            )
            for token in ORIGINAL_TOKEN_DETAILS
        },
        token_metadata[: len(ORIGINAL_TOKEN_DETAILS)],
        sp.big_map(
            {
                token["shadownetTokenId"]: 10 ** int(token["decimals"])
                for token in ORIGINAL_TOKEN_DETAILS
            }
        ),
    )
    scenario += legacy

    alice = sp.test_account("Alice")
    bob = sp.test_account("Bob")

    scenario.h2("Mainnet metadata and supply initialize without large fields")
    scenario.verify(
        contract.data.token_metadata[5].token_info["name"]
        == metadata_bytes("Jalepeños")
    )
    scenario.verify(
        contract.data.token_metadata[10].token_info["decimals"]
        == metadata_bytes("2")
    )
    scenario.verify(
        contract.data.token_metadata[13].token_info["decimals"]
        == metadata_bytes("8")
    )
    scenario.verify(
        ~contract.data.token_metadata[0].token_info.contains("artifactUri")
    )
    scenario.verify(
        ~contract.data.token_metadata[0].token_info.contains("description")
    )
    scenario.verify(
        contract.data.supply[10]
        == int(TOKEN_DETAILS[10]["totalSupplyRaw"])
    )
    scenario.verify(contract.data.unit_scales[10] == 100)
    scenario.verify(contract.data.unit_scales[13] == 100_000_000)
    scenario.verify(contract.data.unit_scales[39] == 1_000_000)
    scenario.verify(contract.data.supply[39] == 6_000_000_000_000_000)
    scenario.verify(contract.data.supply[42] == 1_000_000_000_000_000_000)
    scenario.verify(contract.data.supply[51] == 1_000_000_000_000)
    scenario.verify(contract.data.supply[56] == 100_000_000_000)
    scenario.verify(contract.data.recipes[0].burn_inputs == False)
    scenario.verify(sp.len(contract.data.recipes[0].drops) == 2)
    scenario.verify(contract.data.recipes[1].burn_inputs == False)
    scenario.verify(sp.len(contract.data.recipes[1].drops) == 0)
    scenario.verify(contract.data.recipes[3].burn_inputs)
    scenario.verify(sp.len(contract.data.recipes[3].drops) == 2)

    scenario.h2("Administrator and managers update token images")
    admin_image_uri = sp.bytes(
        "0x697066733a2f2f6261667962656961646d696e"
    )
    manager_image_uri = sp.bytes(
        "0x697066733a2f2f626166796265696d616e61676572"
    )
    contract.update_token_image(
        token_id=0,
        image_uri=admin_image_uri,
        _sender=PLACEHOLDER_ADMIN,
    )
    scenario.verify(
        contract.data.token_metadata[0].token_info["artifactUri"]
        == admin_image_uri
    )
    scenario.verify(
        contract.data.token_metadata[0].token_info["displayUri"]
        == admin_image_uri
    )
    scenario.verify(
        contract.data.token_metadata[0].token_info["thumbnailUri"]
        == admin_image_uri
    )
    contract.update_token_image(
        token_id=0,
        image_uri=manager_image_uri,
        _sender=alice,
        _valid=False,
        _exception="FA2_NOT_METADATA_MANAGER",
    )
    contract.set_metadata_manager(
        manager=bob.address,
        enabled=True,
        _sender=PLACEHOLDER_ADMIN,
    )
    scenario.verify(contract.data.metadata_managers.contains(bob.address))
    contract.set_metadata_manager(
        manager=alice.address,
        enabled=True,
        _sender=alice,
        _valid=False,
        _exception="FA2_NOT_ADMIN",
    )
    contract.update_token_image(
        token_id=16,
        image_uri=manager_image_uri,
        _sender=bob,
    )
    scenario.verify(
        contract.data.token_metadata[16].token_info["artifactUri"]
        == manager_image_uri
    )
    contract.update_token_image(
        token_id=57,
        image_uri=manager_image_uri,
        _sender=bob,
        _valid=False,
        _exception="FA2_TOKEN_UNDEFINED",
    )
    contract.update_token_image(
        token_id=16,
        image_uri=sp.bytes("0x"),
        _sender=bob,
        _valid=False,
        _exception="EMPTY_IMAGE_URI",
    )
    contract.update_token_image(
        token_id=16,
        image_uri=sp.bytes("0x" + ("61" * 2049)),
        _sender=bob,
        _valid=False,
        _exception="IMAGE_URI_TOO_LONG",
    )
    scenario.h2("Administrator and managers update descriptions")
    maize_description = metadata_bytes(TOKEN_DETAILS[0]["description"])
    manager_description = metadata_bytes(
        "A manager-authored Shadownet description."
    )
    contract.update_token_description(
        token_id=0,
        description=maize_description,
        _sender=PLACEHOLDER_ADMIN,
    )
    scenario.verify(
        contract.data.token_metadata[0].token_info["description"]
        == maize_description
    )
    contract.update_token_description(
        token_id=16,
        description=manager_description,
        _sender=bob,
    )
    scenario.verify(
        contract.data.token_metadata[16].token_info["description"]
        == manager_description
    )
    contract.update_token_description(
        token_id=0,
        description=maize_description,
        _sender=alice,
        _valid=False,
        _exception="FA2_NOT_METADATA_MANAGER",
    )
    contract.update_token_description(
        token_id=57,
        description=maize_description,
        _sender=PLACEHOLDER_ADMIN,
        _valid=False,
        _exception="FA2_TOKEN_UNDEFINED",
    )
    contract.update_token_description(
        token_id=0,
        description=sp.bytes("0x"),
        _sender=PLACEHOLDER_ADMIN,
        _valid=False,
        _exception="EMPTY_DESCRIPTION",
    )

    scenario.h2("Managers configure multiple independent recipe drops")
    guaranteed_drops = [
        sp.record(token_id=38, amount=2, chance_bps=10_000),
        sp.record(token_id=5, amount=1, chance_bps=10_000),
    ]
    contract.update_recipe_drops(
        recipe_id=0,
        drops=guaranteed_drops,
        _sender=bob,
    )
    scenario.verify(sp.len(contract.data.recipes[0].drops) == 2)
    contract.update_recipe_drops(
        recipe_id=0,
        drops=guaranteed_drops,
        _sender=alice,
        _valid=False,
        _exception="FA2_NOT_METADATA_MANAGER",
    )
    contract.update_recipe_drops(
        recipe_id=22,
        drops=[],
        _sender=bob,
        _valid=False,
        _exception="UNKNOWN_RECIPE",
    )
    contract.update_recipe_drops(
        recipe_id=0,
        drops=[
            sp.record(token_id=6, amount=1, chance_bps=500),
            sp.record(token_id=6, amount=2, chance_bps=250),
        ],
        _sender=bob,
        _valid=False,
        _exception="DUPLICATE_DROP_TOKEN",
    )
    contract.update_recipe_drops(
        recipe_id=0,
        drops=[sp.record(token_id=57, amount=1, chance_bps=500)],
        _sender=bob,
        _valid=False,
        _exception="FA2_TOKEN_UNDEFINED",
    )
    contract.update_recipe_drops(
        recipe_id=0,
        drops=[sp.record(token_id=6, amount=0, chance_bps=500)],
        _sender=bob,
        _valid=False,
        _exception="ZERO_DROP_AMOUNT",
    )
    contract.update_recipe_drops(
        recipe_id=0,
        drops=[sp.record(token_id=6, amount=1, chance_bps=10_001)],
        _sender=bob,
        _valid=False,
        _exception="INVALID_DROP_CHANCE",
    )
    contract.update_recipe_drops(
        recipe_id=0,
        drops=[
            sp.record(token_id=token_id, amount=1, chance_bps=100)
            for token_id in range(9)
        ],
        _sender=bob,
        _valid=False,
        _exception="TOO_MANY_DROPS",
    )

    scenario.h2("Administrator revokes all manager update powers")
    contract.set_metadata_manager(
        manager=bob.address,
        enabled=False,
        _sender=PLACEHOLDER_ADMIN,
    )
    scenario.verify(~contract.data.metadata_managers.contains(bob.address))
    contract.update_token_image(
        token_id=16,
        image_uri=admin_image_uri,
        _sender=bob,
        _valid=False,
        _exception="FA2_NOT_METADATA_MANAGER",
    )
    contract.update_token_description(
        token_id=16,
        description=manager_description,
        _sender=bob,
        _valid=False,
        _exception="FA2_NOT_METADATA_MANAGER",
    )
    contract.update_recipe_drops(
        recipe_id=0,
        drops=[],
        _sender=bob,
        _valid=False,
        _exception="FA2_NOT_METADATA_MANAGER",
    )

    scenario.h2("Replate legacy assets into replacements")
    contract.set_legacy_asset(
        replacement_token_id=0,
        contract=legacy.address,
        token_id=0,
        unit_scale=1_000_000,
        enabled=True,
        _sender=PLACEHOLDER_ADMIN,
    )
    contract.set_legacy_asset(
        replacement_token_id=0,
        contract=legacy.address,
        token_id=0,
        unit_scale=1_000_000,
        enabled=True,
        _sender=alice,
        _valid=False,
        _exception="FA2_NOT_ADMIN",
    )
    legacy.claim_legacy(_sender=alice)
    legacy.update_operators(
        [
            sp.variant.add_operator(
                sp.record(
                    owner=alice.address,
                    operator=contract.address,
                    token_id=0,
                )
            )
        ],
        _sender=alice,
    )
    contract.replate(
        replacement_token_id=0,
        legacy_amount=2_000_000,
        _sender=alice,
    )
    scenario.verify(legacy.data.ledger[(alice.address, 0)] == 8_000_000)
    scenario.verify(legacy.data.ledger[(contract.address, 0)] == 2_000_000)
    scenario.verify(contract.data.ledger[(alice.address, 0)] == 2_000_000)
    scenario.verify(contract.data.replated[0] == 2_000_000)
    legacy.update_operators(
        [
            sp.variant.remove_operator(
                sp.record(
                    owner=alice.address,
                    operator=contract.address,
                    token_id=0,
                )
            )
        ],
        _sender=alice,
    )
    contract.replate(
        replacement_token_id=39,
        legacy_amount=1_000_000,
        _sender=alice,
        _valid=False,
        _exception="LEGACY_ASSET_UNSUPPORTED",
    )

    scenario.h2("Claim starter pantry")
    contract.claim_starter(_sender=alice)
    scenario.verify(contract.data.ledger[(alice.address, 2)] == 25_000_000)
    scenario.verify(contract.data.ledger[(alice.address, 16)] == 25_000_000)
    scenario.verify(contract.data.ledger[(alice.address, 10)] == 2_500)
    scenario.verify(
        contract.data.ledger[(alice.address, 13)] == 2_500_000_000
    )
    contract.claim_starter(
        _sender=alice,
        _valid=False,
        _exception="ALREADY_CLAIMED",
    )

    scenario.h2("Buy with test tez")
    contract.buy(
        token_id=35,
        quantity=2,
        _sender=alice,
        _amount=sp.mutez(500_000),
    )
    scenario.verify(contract.data.ledger[(alice.address, 35)] == 27_000_000)

    scenario.h2("Mint any test asset or the complete catalog")
    contract.mint_test_asset(token_id=38, quantity=3, _sender=bob)
    scenario.verify(contract.data.ledger[(bob.address, 38)] == 3_000_000)
    contract.mint_test_asset(
        token_id=38,
        quantity=101,
        _sender=bob,
        _valid=False,
        _exception="QUANTITY_TOO_LARGE",
    )
    contract.mint_test_collection(2, _sender=bob)
    scenario.verify(contract.data.ledger[(bob.address, 0)] == 2_000_000)
    scenario.verify(contract.data.ledger[(bob.address, 38)] == 5_000_000)
    scenario.verify(contract.data.ledger[(bob.address, 56)] == 2_000_000)

    scenario.h2("Craft and transfer an item")
    contract.craft(recipe_id=0, quantity=1, _sender=alice)
    scenario.verify(contract.data.ledger[(alice.address, 2)] == 22_000_000)
    scenario.verify(contract.data.ledger[(alice.address, 16)] == 26_000_000)
    scenario.verify(contract.data.ledger[(alice.address, 38)] == 27_000_000)
    scenario.verify(contract.data.ledger[(alice.address, 5)] == 26_000_000)
    scenario.verify(
        contract.data.ledger[(PLACEHOLDER_ADMIN, 2)]
        == int(TOKEN_DETAILS[2]["totalSupplyRaw"]) + 3_000_000
    )
    scenario.verify(
        contract.data.supply[2]
        == int(TOKEN_DETAILS[2]["totalSupplyRaw"]) + 27_000_000
    )
    contract.transfer(
        [
            sp.record(
                from_=alice.address,
                txs=[
                    sp.record(
                        to_=bob.address,
                        amount=1_000_000,
                        token_id=16,
                    )
                ],
            )
        ],
        _sender=alice,
    )
    scenario.verify(contract.data.ledger[(alice.address, 16)] == 25_000_000)
    scenario.verify(contract.data.ledger[(bob.address, 16)] == 3_000_000)
    contract.craft(recipe_id=16, quantity=1, _sender=alice)
    scenario.verify(contract.data.ledger[(alice.address, 10)] == 2_200)
    scenario.verify(
        contract.data.ledger[(alice.address, 15)] == 2_300_000_000
    )
    scenario.verify(contract.data.ledger[(alice.address, 44)] == 24_000_000)
    scenario.verify(contract.data.ledger[(alice.address, 51)] == 26_000_000)
    scenario.verify(
        contract.data.ledger[(PLACEHOLDER_ADMIN, 10)]
        == int(TOKEN_DETAILS[10]["totalSupplyRaw"]) + 300
    )
    scenario.verify(
        contract.data.supply[10]
        == int(TOKEN_DETAILS[10]["totalSupplyRaw"]) + 2_700
    )

    scenario.h2("Hot kitchen actions burn source supply")
    contract.craft(recipe_id=3, quantity=1, _sender=alice)
    scenario.verify(contract.data.ledger[(alice.address, 8)] == 23_000_000)
    scenario.verify(contract.data.ledger[(alice.address, 10)] == 2_100)
    scenario.verify(contract.data.ledger[(alice.address, 22)] == 26_000_000)
    scenario.verify(
        contract.data.supply[8]
        == int(TOKEN_DETAILS[8]["totalSupplyRaw"]) + 25_000_000
    )
    scenario.verify(
        contract.data.supply[10]
        == int(TOKEN_DETAILS[10]["totalSupplyRaw"]) + 2_600
    )
    scenario.verify(contract.data.drop_nonce == 3)
    contract.craft(
        recipe_id=3,
        quantity=10,
        _sender=alice,
        _valid=False,
        _exception="QUANTITY_TOO_LARGE",
    )
