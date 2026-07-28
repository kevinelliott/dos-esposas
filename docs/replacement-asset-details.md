# New Dos Esposas Replacement Asset Details

Allocation source snapshot: 2026-07-25T17:47:28Z (mainnet level 14,217,061)

This document records the complete 57-token Dos Esposas replacement collection. Token IDs `0` through `38` replace the original mainnet assets and retain their exact raw supply and decimal scale. Token IDs `39` through `56` are new restaurant assets whose displayed initial allocations match a comparable original asset in the same category. Images and image URIs are intentionally excluded.

The deployment account receives the full initial allocation of each token. These are origination values, not caps: claims, purchases, test mints, crafting, Replate conversions, transfers, and burns will cause current on-chain balances and supply to diverge. Updating these values changes future compiled storage and requires a new contract origination; it does not rewrite an existing deployment.

Legacy metadata and supplies come from `data/mainnet-assets.json`. New metadata and peer allocations come from `data/new-assets.json`. Regenerate this report with `npm run replacement:sync`.

## Allocation summary

| Replacement ID | Asset | Symbol | Category | Decimals | Initial allocation | Raw allocation | Allocation basis |
| ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| 0 | Maize | `CORN` | Crops | 6 | 500,000,000,000 | `500000000000000000` | Exact legacy supply from [Maize](https://api.tzkt.io/v1/tokens?contract=KT1VSfiXojPodWiZtSfaTooiKKsPAafJdJGa&tokenId=0) |
| 1 | Wheat | `WHEAT` | Crops | 6 | 500,000,000,000 | `500000000000000000` | Exact legacy supply from [Wheat](https://api.tzkt.io/v1/tokens?contract=KT1DgP4K39T1Wqqax9YZuwnkstnY1gNtqcri&tokenId=0) |
| 2 | Avocado | `AVO` | Crops | 6 | 10,000,000,000 | `10000000000000000` | Exact legacy supply from [Avocado](https://api.tzkt.io/v1/tokens?contract=KT18k2r2n87iRLC38k8ogoZL2uLx2WrvGA1v&tokenId=0) |
| 3 | Tomatoes | `TOMATO` | Crops | 6 | 6,000,000,000 | `6000000000000000` | Exact legacy supply from [Tomatoes](https://api.tzkt.io/v1/tokens?contract=KT1BdZj4B2XGMbpZJQzPo76YcpSiswsQpRpt&tokenId=0) |
| 4 | Bell Peppers | `BELL` | Crops | 6 | 75,000,000,000 | `75000000000000000` | Exact legacy supply from [Bell Peppers](https://api.tzkt.io/v1/tokens?contract=KT1SiFqDqeFcUi5vQVSvuxB2g4xz7WLBrDek&tokenId=0) |
| 5 | Jalepeños | `PENO` | Crops | 6 | 6,000,000,000 | `6000000000000000` | Exact legacy supply from [Jalepeños](https://api.tzkt.io/v1/tokens?contract=KT1M9eZ5hzQb93bo3x6csbnxKc6EkpEwZbkQ&tokenId=0) |
| 6 | Lime | `LIME` | Crops | 6 | 80,000,000 | `80000000000000` | Exact legacy supply from [Lime](https://api.tzkt.io/v1/tokens?contract=KT19oLbcu7TMGA6s3QuGpeu4cCZknhVhuATY&tokenId=0) |
| 7 | Cebolla | `BOLLA` | Crops | 6 | 500,000,000,000 | `500000000000000000` | Exact legacy supply from [Cebolla](https://api.tzkt.io/v1/tokens?contract=KT196ZiPqPTZDsWpWvuhgZUrYK5x8WxYz3wb&tokenId=0) |
| 8 | Beef | `BEEF` | Ingredients | 6 | 100,000,000,000 | `100000000000000000` | Exact legacy supply from [Beef](https://api.tzkt.io/v1/tokens?contract=KT1M2Ws52krJrwJi1ZFsmVfazBiafWYKZTvd&tokenId=0) |
| 9 | Refried Beans | `RFBN` | Ingredients | 6 | 1,000,000,000,000 | `1000000000000000000` | Exact legacy supply from [Refried Beans](https://api.tzkt.io/v1/tokens?contract=KT1F5M35m8Tn2nbJGn7DwheRXxhyvm5KUho2&tokenId=0) |
| 10 | Rice | `RICE` | Ingredients | 2 | 5,000,000,000,000 | `500000000000000` | Exact legacy supply from [Rice](https://api.tzkt.io/v1/tokens?contract=KT1Wa2ncR8GbeQrW6Dbtpc8uTrK7q5CH4F2Q&tokenId=0) |
| 11 | Tortillas | `TILLA` | Ingredients | 6 | 120,000,000,000 | `120000000000000000` | Exact legacy supply from [Tortillas](https://api.tzkt.io/v1/tokens?contract=KT1K7vvj7bQAY7YqCRnvrddoSaLp9tbJLn8Y&tokenId=0) |
| 12 | Mexican Cheese | `MCHZ` | Ingredients | 6 | 3,000,000,000 | `3000000000000000` | Exact legacy supply from [Mexican Cheese](https://api.tzkt.io/v1/tokens?contract=KT1B6p7LCM4bSFg5ahRQPzp6nHh6raKMsubk&tokenId=0) |
| 13 | Cheese | `CHEESE` | Ingredients | 8 | 6,000,000,000 | `600000000000000000` | Exact legacy supply from [Cheese](https://api.tzkt.io/v1/tokens?contract=KT1URY2DcLd3v6XRjXKYvQmZMBncWYMuphNg&tokenId=0) |
| 14 | Sour Cream | `SCRM` | Ingredients | 6 | 1,500,000,000 | `1500000000000000` | Exact legacy supply from [Sour Cream](https://api.tzkt.io/v1/tokens?contract=KT1FPA3aJ8dTh3ANsaRfVcXSLeWG9mi4LUkv&tokenId=0) |
| 15 | Milk | `MILK` | Ingredients | 8 | 60,000,000,000 | `6000000000000000000` | Exact legacy supply from [Milk](https://api.tzkt.io/v1/tokens?contract=KT1EBpRMdK98rPpaXqJeW4822WAdwXYNL64d&tokenId=0) |
| 16 | Guacamole | `GUAC` | Appetizers | 6 | 90,000,000 | `90000000000000` | Exact legacy supply from [Guacamole](https://api.tzkt.io/v1/tokens?contract=KT19g5KrxZdcyYmFAmWijywENFdjcFAi74eM&tokenId=0) |
| 17 | Tortilla Chips | `CHIPS` | Appetizers | 8 | 750,000,000 | `75000000000000000` | Exact legacy supply from [Tortilla Chips](https://api.tzkt.io/v1/tokens?contract=KT19uWeDEun67XcoPHPs59FFHsS24Jh12osw&tokenId=0) |
| 18 | Tortilla Chips | `CHIPS` | Appetizers | 8 | 15,000,000 | `1500000000000000` | Exact legacy supply from [Tortilla Chips](https://api.tzkt.io/v1/tokens?contract=KT1DFerueCFPPta4mpiYjy81YwiHbBjjPyUH&tokenId=0) |
| 19 | Mexican Cheese Dip | `QUESO` | Appetizers | 8 | 750,000,000 | `75000000000000000` | Exact legacy supply from [Mexican Cheese Dip](https://api.tzkt.io/v1/tokens?contract=KT1RhZgN7bpsqdmuveMCWN2vdaUGPHsxu767&tokenId=0) |
| 20 | Mexican Cheese Dip | `QUESO` | Appetizers | 8 | 15,000,000 | `1500000000000000` | Exact legacy supply from [Mexican Cheese Dip](https://api.tzkt.io/v1/tokens?contract=KT1Ee5AkfQUZBA5TGbY87nU6ETiDzwAiLki1&tokenId=0) |
| 21 | Ghost Pepper Sauce | `GHOST` | Appetizers | 6 | 1,000,000 | `1000000000000` | Exact legacy supply from [Ghost Pepper Sauce](https://api.tzkt.io/v1/tokens?contract=KT1GgGFpsdq7rz5wopLm4z9ySQeqagBwLYgR&tokenId=0) |
| 22 | Burrito | `BURRITO` | Mains | 6 | 50,000,000 | `50000000000000` | Exact legacy supply from [Burrito](https://api.tzkt.io/v1/tokens?contract=KT1NrsxNC6xoj9oKrtDSJAvptYe6VvmCTueP&tokenId=0) |
| 23 | Enchiladas | `LADA` | Mains | 6 | 50,000,000 | `50000000000000` | Exact legacy supply from [Enchiladas](https://api.tzkt.io/v1/tokens?contract=KT1GWHp5PSYLpXuiKAcdtWFuUX84cu1uY9Nk&tokenId=0) |
| 24 | Carne Asada | `ASADA` | Mains | 6 | 50,000,000,000 | `50000000000000000` | Exact legacy supply from [Carne Asada](https://api.tzkt.io/v1/tokens?contract=KT1TCPf4DjgsseHj8ixRnCBgToqZbdFHQtPA&tokenId=0) |
| 25 | Filet Mignon | `FILET` | Mains | 6 | 100,000 | `100000000000` | Exact legacy supply from [Filet Mignon](https://api.tzkt.io/v1/tokens?contract=KT1BtNcwbq3d35n25FykvEGyyqoCivcNCa3e&tokenId=0) |
| 26 | Light Beer | `CERVEZA` | Drinks | 6 | 10,000,000 | `10000000000000` | Exact legacy supply from [Light Beer](https://api.tzkt.io/v1/tokens?contract=KT1AJkR5vBbEHUbSEEGHaFMQm1puTBm5an5T&tokenId=0) |
| 27 | Michelada | `MICHE` | Drinks | 8 | 1,000,000 | `100000000000000` | Exact legacy supply from [Michelada](https://api.tzkt.io/v1/tokens?contract=KT1FnG8rT4GSgXqwNpnXR9nVjEmjBCyEnGdn&tokenId=0) |
| 28 | Margarita | `RITA` | Drinks | 6 | 1,000,000 | `1000000000000` | Exact legacy supply from [Margarita](https://api.tzkt.io/v1/tokens?contract=KT1Soa1U1fYRQEgg9No3Xvqxuv46kUZFFdJ6&tokenId=0) |
| 29 | Premium Margarita | `PRITA` | Drinks | 6 | 100,000 | `100000000000` | Exact legacy supply from [Premium Margarita](https://api.tzkt.io/v1/tokens?contract=KT1Wxi4QfsaLqa82wprsWrqALHLQtPTpaabv&tokenId=0) |
| 30 | Tezos Silver Tequila | `STQLA` | Drinks | 6 | 100,000 | `100000000000` | Exact legacy supply from [Tezos Silver Tequila](https://api.tzkt.io/v1/tokens?contract=KT1GjDJH1CASA8zRGgj81sTfEU9K2T494MMK&tokenId=0) |
| 31 | Tezos Reposado Tequila | `RTQLA` | Drinks | 6 | 10,000 | `10000000000` | Exact legacy supply from [Tezos Reposado Tequila](https://api.tzkt.io/v1/tokens?contract=KT1QHcRL3FZRpQruFkb1GBYwfqoPXTFGipRH&tokenId=0) |
| 32 | Tezos Anejo Tequila | `ATQLA` | Drinks | 6 | 1,000 | `1000000000` | Exact legacy supply from [Tezos Anejo Tequila](https://api.tzkt.io/v1/tokens?contract=KT1RdLrFcXrwbTX9vaYcbUohTTXpe1Eco2sq&tokenId=0) |
| 33 | Anejo Tequila | `ANEJO` | Drinks | 8 | 1,000 | `100000000000` | Exact legacy supply from [Anejo Tequila](https://api.tzkt.io/v1/tokens?contract=KT1CEzXaiwMVXR2Rk5Jyejh88sENZd7QUySp&tokenId=0) |
| 34 | Tezos Platinum Tequila | `PLAT` | Drinks | 6 | 100 | `100000000` | Exact legacy supply from [Tezos Platinum Tequila](https://api.tzkt.io/v1/tokens?contract=KT1SybeY3QZ3kX4PS5ZXhxyv2dZWghTFuCdu&tokenId=0) |
| 35 | Flan | `FLAN` | Desserts | 6 | 1,000,000 | `1000000000000` | Exact legacy supply from [Flan](https://api.tzkt.io/v1/tokens?contract=KT1NxnATgx7386au1KfxU9LcRYJbWup1cEqn&tokenId=0) |
| 36 | Churros | `CHURRO` | Desserts | 6 | 100,000 | `100000000000` | Exact legacy supply from [Churros](https://api.tzkt.io/v1/tokens?contract=KT1MdWp5To6hUuUbkamfKn1RowR6QcvqTd6u&tokenId=0) |
| 37 | Tres Leches Cake | `TLC` | Desserts | 6 | 10,000 | `10000000000` | Exact legacy supply from [Tres Leches Cake](https://api.tzkt.io/v1/tokens?contract=KT1KDAsA4TmxLBaczVXmjjoqZXM2UDBo2xja&tokenId=0) |
| 38 | Dos Esposas Restaurante Credits | `DER` | Utility | 6 | 75,000,000,000 | `75000000000000000` | Exact legacy supply from [Dos Esposas Restaurante Credits](https://api.tzkt.io/v1/tokens?contract=KT1Kp2ZhSvNzzwYpF6pYvdjfd17hYRXjqe9Y&tokenId=0) |
| 39 | Tomatillos | `TOMATL` | Crops | 6 | 6,000,000,000 | `6000000000000000` | Displayed supply of [Tomatoes](https://api.tzkt.io/v1/tokens?contract=KT1BdZj4B2XGMbpZJQzPo76YcpSiswsQpRpt&tokenId=0) |
| 40 | Hibiscus | `HIBISC` | Crops | 6 | 80,000,000 | `80000000000000` | Displayed supply of [Lime](https://api.tzkt.io/v1/tokens?contract=KT19oLbcu7TMGA6s3QuGpeu4cCZknhVhuATY&tokenId=0) |
| 41 | Grapefruit | `POMELO` | Crops | 6 | 80,000,000 | `80000000000000` | Displayed supply of [Lime](https://api.tzkt.io/v1/tokens?contract=KT19oLbcu7TMGA6s3QuGpeu4cCZknhVhuATY&tokenId=0) |
| 42 | Black Beans | `BLKBN` | Ingredients | 6 | 1,000,000,000,000 | `1000000000000000000` | Displayed supply of [Refried Beans](https://api.tzkt.io/v1/tokens?contract=KT1F5M35m8Tn2nbJGn7DwheRXxhyvm5KUho2&tokenId=0) |
| 43 | Oaxaca Cheese | `OAXCHZ` | Ingredients | 6 | 3,000,000,000 | `3000000000000000` | Displayed supply of [Mexican Cheese](https://api.tzkt.io/v1/tokens?contract=KT1B6p7LCM4bSFg5ahRQPzp6nHh6raKMsubk&tokenId=0) |
| 44 | Cinnamon | `CINNAM` | Ingredients | 6 | 1,500,000,000 | `1500000000000000` | Displayed supply of [Sour Cream](https://api.tzkt.io/v1/tokens?contract=KT1FPA3aJ8dTh3ANsaRfVcXSLeWG9mi4LUkv&tokenId=0) |
| 45 | Salsa Verde | `SALSV` | Appetizers | 6 | 90,000,000 | `90000000000000` | Displayed supply of [Guacamole](https://api.tzkt.io/v1/tokens?contract=KT19g5KrxZdcyYmFAmWijywENFdjcFAi74eM&tokenId=0) |
| 46 | Black Bean Tostada | `TOSTAD` | Appetizers | 6 | 90,000,000 | `90000000000000` | Displayed supply of [Guacamole](https://api.tzkt.io/v1/tokens?contract=KT19g5KrxZdcyYmFAmWijywENFdjcFAi74eM&tokenId=0) |
| 47 | Esquites | `ESQUIT` | Appetizers | 6 | 15,000,000 | `15000000000000` | Displayed supply of [Tortilla Chips](https://api.tzkt.io/v1/tokens?contract=KT1DFerueCFPPta4mpiYjy81YwiHbBjjPyUH&tokenId=0) |
| 48 | Chiles Rellenos | `RELLEN` | Mains | 6 | 50,000,000,000 | `50000000000000000` | Displayed supply of [Carne Asada](https://api.tzkt.io/v1/tokens?contract=KT1TCPf4DjgsseHj8ixRnCBgToqZbdFHQtPA&tokenId=0) |
| 49 | Pozole Rojo | `POZOLE` | Mains | 6 | 50,000,000,000 | `50000000000000000` | Displayed supply of [Carne Asada](https://api.tzkt.io/v1/tokens?contract=KT1TCPf4DjgsseHj8ixRnCBgToqZbdFHQtPA&tokenId=0) |
| 50 | Tacos de Canasta | `CANAST` | Mains | 6 | 50,000,000 | `50000000000000` | Displayed supply of [Burrito](https://api.tzkt.io/v1/tokens?contract=KT1NrsxNC6xoj9oKrtDSJAvptYe6VvmCTueP&tokenId=0) |
| 51 | Horchata | `HORCHA` | Drinks | 6 | 1,000,000 | `1000000000000` | Displayed supply of [Margarita](https://api.tzkt.io/v1/tokens?contract=KT1Soa1U1fYRQEgg9No3Xvqxuv46kUZFFdJ6&tokenId=0) |
| 52 | Agua de Jamaica | `JAMAIC` | Drinks | 6 | 1,000,000 | `1000000000000` | Displayed supply of [Margarita](https://api.tzkt.io/v1/tokens?contract=KT1Soa1U1fYRQEgg9No3Xvqxuv46kUZFFdJ6&tokenId=0) |
| 53 | Paloma | `PALOMA` | Drinks | 6 | 1,000,000 | `1000000000000` | Displayed supply of [Michelada](https://api.tzkt.io/v1/tokens?contract=KT1FnG8rT4GSgXqwNpnXR9nVjEmjBCyEnGdn&tokenId=0) |
| 54 | Arroz con Leche | `ARROZL` | Desserts | 6 | 1,000,000 | `1000000000000` | Displayed supply of [Flan](https://api.tzkt.io/v1/tokens?contract=KT1NxnATgx7386au1KfxU9LcRYJbWup1cEqn&tokenId=0) |
| 55 | Sopapillas | `SOPAPI` | Desserts | 6 | 1,000,000 | `1000000000000` | Displayed supply of [Flan](https://api.tzkt.io/v1/tokens?contract=KT1NxnATgx7386au1KfxU9LcRYJbWup1cEqn&tokenId=0) |
| 56 | Buñuelos | `BUNUEL` | Desserts | 6 | 100,000 | `100000000000` | Displayed supply of [Churros](https://api.tzkt.io/v1/tokens?contract=KT1MdWp5To6hUuUbkamfKn1RowR6QcvqTd6u&tokenId=0) |

## Asset details

## 0. Maize (`CORN`)

- Asset class: Legacy replacement
- Category: Crops
- Replacement token ID: `0`
- Decimals: `6`
- Initial deployment allocation: 500,000,000,000 (`500000000000000000` raw units)
- Allocation basis: Exact raw supply of original token ID `0` at [`KT1VSfiXojPodWiZtSfaTooiKKsPAafJdJGa`](https://api.tzkt.io/v1/tokens?contract=KT1VSfiXojPodWiZtSfaTooiKKsPAafJdJGa&tokenId=0)

### Original description

> Absolutely nothing better than corn on the cob. You know damn well it can be delicious, nutritious, and when you're done you can even made a cob-pipe out of it to smoke the tobaccy like a drunken sailor or a sophisticated guy in a den with a monocle.
>
> This is the number one crop in the world folks. Undisputed winner of the farming world. The only continent that it isn't grown on is Antarctica. Betcha didn't know that. Corn is called "maize" in most countries in the world.
>
> It makes all sorts of delicious food all throughout the world, and can even make poison that can kill humans and animals (some people call it corn syrup for some reason). A bushel of this stuff can sweeten about 400 cans of cola.

## 1. Wheat (`WHEAT`)

- Asset class: Legacy replacement
- Category: Crops
- Replacement token ID: `1`
- Decimals: `6`
- Initial deployment allocation: 500,000,000,000 (`500000000000000000` raw units)
- Allocation basis: Exact raw supply of original token ID `0` at [`KT1DgP4K39T1Wqqax9YZuwnkstnY1gNtqcri`](https://api.tzkt.io/v1/tokens?contract=KT1DgP4K39T1Wqqax9YZuwnkstnY1gNtqcri&tokenId=0)

### Original description

> A very widely grown and used grain crop.
>
> While some of you break out in hives due to the gluten, wheat is the second most grown crop in the world, only behind corn. It is one of the world's most efficient grains, and provides the needed carbohydrates and nutrients to billions of people (and animals too).
>
> The flour made from wheat goes into making breads, pastries, cereals, donuts, and pizza (only 6 billion of those made a year, no big deal). Mmmm... donuts... now I want to eat.
>
> I know, wheat is boring, right? That's what I thought.
>
> Until I learned that wheat is also used in wood for kitchen cabinets, is put in hair conditioners, used in making paper, creating adhesives on postage stamps, and used in medical swabs and charcoal. Huh, charcoal?

## 2. Avocado (`AVO`)

- Asset class: Legacy replacement
- Category: Crops
- Replacement token ID: `2`
- Decimals: `6`
- Initial deployment allocation: 10,000,000,000 (`10000000000000000` raw units)
- Allocation basis: Exact raw supply of original token ID `0` at [`KT18k2r2n87iRLC38k8ogoZL2uLx2WrvGA1v`](https://api.tzkt.io/v1/tokens?contract=KT18k2r2n87iRLC38k8ogoZL2uLx2WrvGA1v&tokenId=0)

### Original description

> The undisputed king of the not-so-sweet fruits. Yeah bro, you didn't know that avocados were a fruit? They are "the sweet and fleshy product of a tree or other plant that contains seed and can be eaten as food" as the Oxford likes to spit.
>
> I know a guy who is severely allergic to avocados. What a horrible allergy to have! He's terrified because he's tempted to dip into the guac every time it's out.
>
> These things are so good that you can slice them open, plop out the seed, sprinkle some seasoning on and eat with a spoon. Of course, they're also often used in guacamole and avocado toast.
>
> Avocado toast is this weird thing that millennial healthnuts be doin' thinking they are being healthy but not realizing they're consuming all those carbs). In 2017, more than 3,000,000 photos of avocado toast were uploaded to Instagram... every day.
>
> Did you know that avocados and cinnamon are related? Blew my freakin' mind.

## 3. Tomatoes (`TOMATO`)

- Asset class: Legacy replacement
- Category: Crops
- Replacement token ID: `3`
- Decimals: `6`
- Initial deployment allocation: 6,000,000,000 (`6000000000000000` raw units)
- Allocation basis: Exact raw supply of original token ID `0` at [`KT1BdZj4B2XGMbpZJQzPo76YcpSiswsQpRpt`](https://api.tzkt.io/v1/tokens?contract=KT1BdZj4B2XGMbpZJQzPo76YcpSiswsQpRpt&tokenId=0)

### Original description

> There ain't no running with the bulls here, these are for tacos. Throw them at your risk.

## 4. Bell Peppers (`BELL`)

- Asset class: Legacy replacement
- Category: Crops
- Replacement token ID: `4`
- Decimals: `6`
- Initial deployment allocation: 75,000,000,000 (`75000000000000000` raw units)
- Allocation basis: Exact raw supply of original token ID `0` at [`KT1SiFqDqeFcUi5vQVSvuxB2g4xz7WLBrDek`](https://api.tzkt.io/v1/tokens?contract=KT1SiFqDqeFcUi5vQVSvuxB2g4xz7WLBrDek&tokenId=0)

### Original description

> OK, so these aren't going to blow your socks off with fire and heat. Scoville negative 400. You can hand these to your 5 year old daughter and she won't scream (we've got others in stock if that's your game).
>
> Boring, right? We like the heat.
>
> When you think of dank Mexican food, you rarely think of bell peppers. That's because traditional Mexican food doesn't call for them. Believe it or not, bell peppers are widely available in Mexico even though won't find them used in most restaurants.
>
> But there's one dish you know you can't have without them... Fajitas! You know it, I know it, we all know it.
>
> Bell Pepper Cheat Sheet
>
> GREEN = more bitter
> ORANGE/YELLOW = more sweet
> RED = sweetest
>
> Next time you make stuffed bell peppers, try it with spicy taco-seasoned ground beef instead.

## 5. Jalepeños (`PENO`)

- Asset class: Legacy replacement
- Category: Crops
- Replacement token ID: `5`
- Decimals: `6`
- Initial deployment allocation: 6,000,000,000 (`6000000000000000` raw units)
- Allocation basis: Exact raw supply of original token ID `0` at [`KT1M9eZ5hzQb93bo3x6csbnxKc6EkpEwZbkQ`](https://api.tzkt.io/v1/tokens?contract=KT1M9eZ5hzQb93bo3x6csbnxKc6EkpEwZbkQ&tokenId=0)

### Original description

> Set the world on fiiiiiyah, it's everything i desire. Burn dat mouf baby. Load up your tacos, burritos, nachos, enchiladas, and quesadillas wif da green spicey.

## 6. Lime (`LIME`)

- Asset class: Legacy replacement
- Category: Crops
- Replacement token ID: `6`
- Decimals: `6`
- Initial deployment allocation: 80,000,000 (`80000000000000` raw units)
- Allocation basis: Exact raw supply of original token ID `0` at [`KT19oLbcu7TMGA6s3QuGpeu4cCZknhVhuATY`](https://api.tzkt.io/v1/tokens?contract=KT19oLbcu7TMGA6s3QuGpeu4cCZknhVhuATY&tokenId=0)

### Original description

> Yew need da lime for the cervezas and tacos. It boosts them so good mang.

## 7. Cebolla (`BOLLA`)

- Asset class: Legacy replacement
- Category: Crops
- Replacement token ID: `7`
- Decimals: `6`
- Initial deployment allocation: 500,000,000,000 (`500000000000000000` raw units)
- Allocation basis: Exact raw supply of original token ID `0` at [`KT196ZiPqPTZDsWpWvuhgZUrYK5x8WxYz3wb`](https://api.tzkt.io/v1/tokens?contract=KT196ZiPqPTZDsWpWvuhgZUrYK5x8WxYz3wb&tokenId=0)

### Original description

> No taco or burrito is complete without some chopped up onions. For you gringos that is what cebolla is. Chop chop homey.

## 8. Beef (`BEEF`)

- Asset class: Legacy replacement
- Category: Ingredients
- Replacement token ID: `8`
- Decimals: `6`
- Initial deployment allocation: 100,000,000,000 (`100000000000000000` raw units)
- Allocation basis: Exact raw supply of original token ID `0` at [`KT1M2Ws52krJrwJi1ZFsmVfazBiafWYKZTvd`](https://api.tzkt.io/v1/tokens?contract=KT1M2Ws52krJrwJi1ZFsmVfazBiafWYKZTvd&tokenId=0)

### Original description

> These cows be making me hungry, dog. Cat-chya later when we make some of dem tacos.

## 9. Refried Beans (`RFBN`)

- Asset class: Legacy replacement
- Category: Ingredients
- Replacement token ID: `9`
- Decimals: `6`
- Initial deployment allocation: 1,000,000,000,000 (`1000000000000000000` raw units)
- Allocation basis: Exact raw supply of original token ID `0` at [`KT1F5M35m8Tn2nbJGn7DwheRXxhyvm5KUho2`](https://api.tzkt.io/v1/tokens?contract=KT1F5M35m8Tn2nbJGn7DwheRXxhyvm5KUho2&tokenId=0)

### Original description

> Frijoles. Bro, you know you need this shit. Don't pretend you don't. Life without these carbos is life without your vibes. Frijoles is life, and life is nothing but beans.

## 10. Rice (`RICE`)

- Asset class: Legacy replacement
- Category: Ingredients
- Replacement token ID: `10`
- Decimals: `2`
- Initial deployment allocation: 5,000,000,000,000 (`500000000000000` raw units)
- Allocation basis: Exact raw supply of original token ID `0` at [`KT1Wa2ncR8GbeQrW6Dbtpc8uTrK7q5CH4F2Q`](https://api.tzkt.io/v1/tokens?contract=KT1Wa2ncR8GbeQrW6Dbtpc8uTrK7q5CH4F2Q&tokenId=0)

### Original description

> Enchi-way... you can't just eat one, you need to put down two. You are my kind of peep.

## 11. Tortillas (`TILLA`)

- Asset class: Legacy replacement
- Category: Ingredients
- Replacement token ID: `11`
- Decimals: `6`
- Initial deployment allocation: 120,000,000,000 (`120000000000000000` raw units)
- Allocation basis: Exact raw supply of original token ID `0` at [`KT1K7vvj7bQAY7YqCRnvrddoSaLp9tbJLn8Y`](https://api.tzkt.io/v1/tokens?contract=KT1K7vvj7bQAY7YqCRnvrddoSaLp9tbJLn8Y&tokenId=0)

### Original description

> Bro, you can't have no taco or no burrito without a tortilla. Stock up.

## 12. Mexican Cheese (`MCHZ`)

- Asset class: Legacy replacement
- Category: Ingredients
- Replacement token ID: `12`
- Decimals: `6`
- Initial deployment allocation: 3,000,000,000 (`3000000000000000` raw units)
- Allocation basis: Exact raw supply of original token ID `0` at [`KT1B6p7LCM4bSFg5ahRQPzp6nHh6raKMsubk`](https://api.tzkt.io/v1/tokens?contract=KT1B6p7LCM4bSFg5ahRQPzp6nHh6raKMsubk&tokenId=0)

### Original description

> Put dat Mexicano tres queso en tus tacos, burritos, nachos, y taco salad.

## 13. Cheese (`CHEESE`)

- Asset class: Legacy replacement
- Category: Ingredients
- Replacement token ID: `13`
- Decimals: `8`
- Initial deployment allocation: 6,000,000,000 (`600000000000000000` raw units)
- Allocation basis: Exact raw supply of original token ID `0` at [`KT1URY2DcLd3v6XRjXKYvQmZMBncWYMuphNg`](https://api.tzkt.io/v1/tokens?contract=KT1URY2DcLd3v6XRjXKYvQmZMBncWYMuphNg&tokenId=0)

### Original description

> Everyone loves cheese. It can be eaten by itself, sliced and put into sandwiches, grated and put into tacos, and melted into nacho cheese sauce.
>
> You can also let it sit around unrefrigerated and let it smell stinky. Yikes, don't do that.

## 14. Sour Cream (`SCRM`)

- Asset class: Legacy replacement
- Category: Ingredients
- Replacement token ID: `14`
- Decimals: `6`
- Initial deployment allocation: 1,500,000,000 (`1500000000000000` raw units)
- Allocation basis: Exact raw supply of original token ID `0` at [`KT1FPA3aJ8dTh3ANsaRfVcXSLeWG9mi4LUkv`](https://api.tzkt.io/v1/tokens?contract=KT1FPA3aJ8dTh3ANsaRfVcXSLeWG9mi4LUkv&tokenId=0)

### Original description

> Put dat cream in da burrito. Unf.

## 15. Milk (`MILK`)

- Asset class: Legacy replacement
- Category: Ingredients
- Replacement token ID: `15`
- Decimals: `8`
- Initial deployment allocation: 60,000,000,000 (`6000000000000000000` raw units)
- Allocation basis: Exact raw supply of original token ID `0` at [`KT1EBpRMdK98rPpaXqJeW4822WAdwXYNL64d`](https://api.tzkt.io/v1/tokens?contract=KT1EBpRMdK98rPpaXqJeW4822WAdwXYNL64d&tokenId=0)

### Original description

> Nothing beats a tall, cold glass of milk... that white fluid that your mom made you chug down every morning while also eating a bowl of Cherrios filled with, yep, milk. It's the only food you could survive entirely off of because it provides every nutrient we need as humans.
>
> Did you know that it's the fat and proteins in milk that make it white?
>
> Omukama is the name for king in Uganda. It means "superior milkman" ... we all want to be the best milkman we can be. Maybe one day we can aspire to be the Omukama.
>
> The world's most rare cheese is made from donkey milk. Ha ha ha.

## 16. Guacamole (`GUAC`)

- Asset class: Legacy replacement
- Category: Appetizers
- Replacement token ID: `16`
- Decimals: `6`
- Initial deployment allocation: 90,000,000 (`90000000000000` raw units)
- Allocation basis: Exact raw supply of original token ID `0` at [`KT19g5KrxZdcyYmFAmWijywENFdjcFAi74eM`](https://api.tzkt.io/v1/tokens?contract=KT19g5KrxZdcyYmFAmWijywENFdjcFAi74eM&tokenId=0)

### Original description

> Put dat guac in da taco, burrito, or nacho.

## 17. Tortilla Chips (`CHIPS`)

- Asset class: Legacy replacement
- Category: Appetizers
- Replacement token ID: `17`
- Decimals: `8`
- Initial deployment allocation: 750,000,000 (`75000000000000000` raw units)
- Allocation basis: Exact raw supply of original token ID `0` at [`KT19uWeDEun67XcoPHPs59FFHsS24Jh12osw`](https://api.tzkt.io/v1/tokens?contract=KT19uWeDEun67XcoPHPs59FFHsS24Jh12osw&tokenId=0)

### Original description

> Fact time... did you know that tortilla chips were a popularization by Rebecca Webb Carranza in the 1940s as a way to make use of rejected tortillas at her tortilla factory? Who doesn't love a nice crunchy snack?
>
> The true inventor of tortilla chips is accredited to Jose Bartolome Martinez, owner of the Tamalina Milling Company of San Antonio, Texas who invented the mass produced masa.
>
> Who knows, everyone loves to fight over those two. I don't know. You can't possibly know. Let's just pretend some Mesoamerican dude from 5,000 years ago invented it from inside of his spaceship that was docked onto one of the pyramids to refuel.
>
> Tortilla chips are naturally gluten free (hehe). Nobody likes gluten.
>
> Tortilla chips are Jennifer Aniston's favorite snack. She was pretty cool on Friends.
>
> OK amigos, sit down and let me bring you some chips to snack on while you wait.

## 18. Tortilla Chips (`CHIPS`)

- Asset class: Legacy replacement
- Category: Appetizers
- Replacement token ID: `18`
- Decimals: `8`
- Initial deployment allocation: 15,000,000 (`1500000000000000` raw units)
- Allocation basis: Exact raw supply of original token ID `0` at [`KT1DFerueCFPPta4mpiYjy81YwiHbBjjPyUH`](https://api.tzkt.io/v1/tokens?contract=KT1DFerueCFPPta4mpiYjy81YwiHbBjjPyUH&tokenId=0)

### Original description

> Fact time... did you know that tortilla chips were a popularization by Rebecca Webb Carranza in the 1940s as a way to make use of rejected tortillas at her tortilla factory? Who doesn't love a nice crunchy snack?
>
> The true inventor of tortilla chips is accredited to Jose Bartolome Martinez, owner of the Tamalina Milling Company of San Antonio, Texas who invented the mass produced masa.
>
> Who knows, everyone loves to fight over those two. I don't know. You can't possibly know. Let's just pretend some Mesoamerican dude from 5,000 years ago invented it from inside of his spaceship that was docked onto one of the pyramids to refuel.
>
> Tortilla chips are naturally gluten free (hehe). Nobody likes gluten.
>
> Tortilla chips are Jennifer Aniston's favorite snack. She was pretty cool on Friends.
>
> OK amigos, sit down and let me bring you some chips to snack on while you wait.

## 19. Mexican Cheese Dip (`QUESO`)

- Asset class: Legacy replacement
- Category: Appetizers
- Replacement token ID: `19`
- Decimals: `8`
- Initial deployment allocation: 750,000,000 (`75000000000000000` raw units)
- Allocation basis: Exact raw supply of original token ID `0` at [`KT1RhZgN7bpsqdmuveMCWN2vdaUGPHsxu767`](https://api.tzkt.io/v1/tokens?contract=KT1RhZgN7bpsqdmuveMCWN2vdaUGPHsxu767&tokenId=0)

### Original description

> Queso means cheese in Spanish, but it's actually used to refer to the cheese dip or sauce used with chips.
>
> Real Mexican queso is usually white and tangy, but when it became Americanized it inherited its yellow color from the use of cheddar cheese. They are both delicious, but quite different.
>
> Americanized queso, popularized in Tex-Mex cuisine, is mildly yellow and often found on nachos or in enchiladas. Mexican queso is white, slightly chunky, and often has some kinds of spices, perfect for dipping.
>
> Queso is the perfect food for socialists... because everybody chips in!

## 20. Mexican Cheese Dip (`QUESO`)

- Asset class: Legacy replacement
- Category: Appetizers
- Replacement token ID: `20`
- Decimals: `8`
- Initial deployment allocation: 15,000,000 (`1500000000000000` raw units)
- Allocation basis: Exact raw supply of original token ID `0` at [`KT1Ee5AkfQUZBA5TGbY87nU6ETiDzwAiLki1`](https://api.tzkt.io/v1/tokens?contract=KT1Ee5AkfQUZBA5TGbY87nU6ETiDzwAiLki1&tokenId=0)

### Original description

> Queso means cheese in Spanish, but it's actually used to refer to the cheese dip or sauce used with chips.
>
> Real Mexican queso is usually white and tangy, but when it became Americanized it inherited its yellow color from the use of cheddar cheese. They are both delicious, but quite different.
>
> Americanized queso, popularized in Tex-Mex cuisine, is mildly yellow and often found on nachos or in enchiladas. Mexican queso is white, slightly chunky, and often has some kinds of spices, perfect for dipping.
>
> Queso is the perfect food for socialists... because everybody chips in!

## 21. Ghost Pepper Sauce (`GHOST`)

- Asset class: Legacy replacement
- Category: Appetizers
- Replacement token ID: `21`
- Decimals: `6`
- Initial deployment allocation: 1,000,000 (`1000000000000` raw units)
- Allocation basis: Exact raw supply of original token ID `0` at [`KT1GgGFpsdq7rz5wopLm4z9ySQeqagBwLYgR`](https://api.tzkt.io/v1/tokens?contract=KT1GgGFpsdq7rz5wopLm4z9ySQeqagBwLYgR&tokenId=0)

### Original description

> Only the really brave mofos will dare attempt to put the ghost pepper (Jolokia) sauce on their taco, burrito, or nachos. You da man bro. Our sombreros are off for you in admiration.

## 22. Burrito (`BURRITO`)

- Asset class: Legacy replacement
- Category: Mains
- Replacement token ID: `22`
- Decimals: `6`
- Initial deployment allocation: 50,000,000 (`50000000000000` raw units)
- Allocation basis: Exact raw supply of original token ID `0` at [`KT1NrsxNC6xoj9oKrtDSJAvptYe6VvmCTueP`](https://api.tzkt.io/v1/tokens?contract=KT1NrsxNC6xoj9oKrtDSJAvptYe6VvmCTueP&tokenId=0)

### Original description

> Dawg, you know you Chipotle and get these thicc beefy carb loaded gut bombs. It took all those deelish ingredients to make this shiz.

## 23. Enchiladas (`LADA`)

- Asset class: Legacy replacement
- Category: Mains
- Replacement token ID: `23`
- Decimals: `6`
- Initial deployment allocation: 50,000,000 (`50000000000000` raw units)
- Allocation basis: Exact raw supply of original token ID `0` at [`KT1GWHp5PSYLpXuiKAcdtWFuUX84cu1uY9Nk`](https://api.tzkt.io/v1/tokens?contract=KT1GWHp5PSYLpXuiKAcdtWFuUX84cu1uY9Nk&tokenId=0)

### Original description

> Enchi-way... you can't just eat one, you need to put down two. You are my kind of peep.

## 24. Carne Asada (`ASADA`)

- Asset class: Legacy replacement
- Category: Mains
- Replacement token ID: `24`
- Decimals: `6`
- Initial deployment allocation: 50,000,000,000 (`50000000000000000` raw units)
- Allocation basis: Exact raw supply of original token ID `0` at [`KT1TCPf4DjgsseHj8ixRnCBgToqZbdFHQtPA`](https://api.tzkt.io/v1/tokens?contract=KT1TCPf4DjgsseHj8ixRnCBgToqZbdFHQtPA&tokenId=0)

### Original description

> When great-great-great-great-great-great grandma Rosa started the first Dos Esposas Restaurante (originally called "Las Esposas del Yum Kaax Restaurante") over 130 years ago, she wanted to make the best food anyone had ever tasted.
>
> Her first famous recipe was a carne asada that made your mouth drool just from the aromas.
>
> Great-great-great-great-great-great Grandma Rosa's Carne Asada Recipe:
>
>   - 1 1/2 pounds of flank steak
>   - 1/3 cup olive oil
>   - 1/4 cup soy sauce
>   - 1/2 cup of fresh chopped cilantro leaves
>   - juice of 1 lime
>   - juice of 1 orange
>   - 4 cloves garlic, minced
>   - 1 jalapeno, seeded and diced
>   - 1 teaspoon ground cumin
>   - salt & freshly ground black pepper
>
> Don't take our word for it. It's a specialty that people come all over the world to taste, hoard, and savor.
>
> ¡Delicioso!

## 25. Filet Mignon (`FILET`)

- Asset class: Legacy replacement
- Category: Mains
- Replacement token ID: `25`
- Decimals: `6`
- Initial deployment allocation: 100,000 (`100000000000` raw units)
- Allocation basis: Exact raw supply of original token ID `0` at [`KT1BtNcwbq3d35n25FykvEGyyqoCivcNCa3e`](https://api.tzkt.io/v1/tokens?contract=KT1BtNcwbq3d35n25FykvEGyyqoCivcNCa3e&tokenId=0)

### Original description

> There are a lot of delicious cuts and preparations of $BEEF, but, put simply, this is the most rare cut of the animal, reserved for those with a pallet that is exquisitely discerning.
>
> Filet mignon comes from the tenderloin, which is arguably the most tender cut you can find. The reason filet mignon can be even more expensive than the tenderloin per pound is that the average animal only holds about 500 grams, or just over a pound, of the filet portion.
>
> Filet mignon is part of a beef tenderloin, but a beef tenderloin is not a filet mignon. Instead, it houses the filet mignon, which comes from the end portion of the tenderloin. The rest of the tenderloin can create other steak cuts or a delicious tenderloin roast to feed the family, but we ain't tawkin' 'bout that right now, are we, Willis?
>
> I know, a bunch of you ultimate steak lovers can't wait to dig into a Rib Eye, but the Tenderloin is where the sophisticated man loves to hang out.
>
> A simplified rule to remember is: the ribeye is perfect for those who prefer flavor, and the filet mignon is the better choice for those who prefer texture. Ribeye has long been known to steak lovers as the epitome of steak flavor. This cut of meat comes from the ribs of the animal, between the loin and shoulder.
>
> You see? You Texan Caterpillar drivin' Rib Eye addicts don't need to wail on them New Yorker Filet chompers... because they're right, and you're right. Give dem suit wearin' office boys a chance, aiiight?
>
> You know how this shiz works, now for some fun facts about filet mignon:
>
> * The name is French for "cute filet" with "filet" meaning thick, boneless slice and mignon meaning "dainty."
> * O. Henry (pen name of William Sydney Porter) was the first to use the term "filet mignon" in his book 'The Four Million' in 1906.
> * In France, it's called a Tournedo. Or Filet De Boeuf officially. Asking for a Filet Mignon in France is likely to get you a cut of pork.
> * Ounce for ounce, movie theater popcorn is more expensive than Filet Mignon. Truth. Don't believe me? Calculate it.
>
> If you ever order this well done, you better dig your own grave and film yourself falling in, because we (the World) don't want to know you and you deserve to die.
>
> Cheers! Savor it. Tastes great, and impresses all Trophy Wives.

## 26. Light Beer (`CERVEZA`)

- Asset class: Legacy replacement
- Category: Drinks
- Replacement token ID: `26`
- Decimals: `6`
- Initial deployment allocation: 10,000,000 (`10000000000000` raw units)
- Allocation basis: Exact raw supply of original token ID `0` at [`KT1AJkR5vBbEHUbSEEGHaFMQm1puTBm5an5T`](https://api.tzkt.io/v1/tokens?contract=KT1AJkR5vBbEHUbSEEGHaFMQm1puTBm5an5T&tokenId=0)

### Original description

> You're outside all day long mowing the lawn, chopping up firewood, doing whatever it is you do out in the sun all day... you bet your ass you have a cooler nearby with some ice cold light beer. You can drink it all day long, you might as well call it water.

## 27. Michelada (`MICHE`)

- Asset class: Legacy replacement
- Category: Drinks
- Replacement token ID: `27`
- Decimals: `8`
- Initial deployment allocation: 1,000,000 (`100000000000000` raw units)
- Allocation basis: Exact raw supply of original token ID `0` at [`KT1FnG8rT4GSgXqwNpnXR9nVjEmjBCyEnGdn`](https://api.tzkt.io/v1/tokens?contract=KT1FnG8rT4GSgXqwNpnXR9nVjEmjBCyEnGdn&tokenId=0)

### Original description

> Let's not pretend this is a deep, rich beer made from an abundance of hops and malt. This is some watered down beer (thanks to "cubos de hielo" -- ice cubes for you gringos) that is elevated by lime juice, spices and sometimes tomato juice.
>
> It was likely invented in Mexico during the Mexican Revolution when "El General" Don August Michel would go to a local cantina in San Luis Potosi with his beat up soldiers. He would order his beer with lime and add hot sauce, and eventually it was named after him -- a combination of "Michel" and "chelada" (meaning "cold one").
>
> Let's get real though, no one knows. You don't either. So don't come after me with your expert knowledge.
>
> The reality is that this is such a refreshing and interesting spin on a light beer because it offers spice, acid, and saltiness in a single beverage. Something you can surely suck down after taking a delicious shot of tequila.
>
> Hands down, this is better than a regular cerveza. I challenge you to try it.

## 28. Margarita (`RITA`)

- Asset class: Legacy replacement
- Category: Drinks
- Replacement token ID: `28`
- Decimals: `6`
- Initial deployment allocation: 1,000,000 (`1000000000000` raw units)
- Allocation basis: Exact raw supply of original token ID `0` at [`KT1Soa1U1fYRQEgg9No3Xvqxuv46kUZFFdJ6`](https://api.tzkt.io/v1/tokens?contract=KT1Soa1U1fYRQEgg9No3Xvqxuv46kUZFFdJ6&tokenId=0)

### Original description

> You can't throw down those tacos and burritos without a stiff mar-gar-eee-tah. Deez are made with the worst ingredients, full of carbs, make yew sick all day tomorrow. But hey, you get what you pay for homey.

## 29. Premium Margarita (`PRITA`)

- Asset class: Legacy replacement
- Category: Drinks
- Replacement token ID: `29`
- Decimals: `6`
- Initial deployment allocation: 100,000 (`100000000000` raw units)
- Allocation basis: Exact raw supply of original token ID `0` at [`KT1Wxi4QfsaLqa82wprsWrqALHLQtPTpaabv`](https://api.tzkt.io/v1/tokens?contract=KT1Wxi4QfsaLqa82wprsWrqALHLQtPTpaabv&tokenId=0)

### Original description

> You can't throw down those tacos and burritos without a stiff mar-gar-eee-tah. Deez are made with the best ingredients, only 100% agave tequila and fresh lime juice.

## 30. Tezos Silver Tequila (`STQLA`)

- Asset class: Legacy replacement
- Category: Drinks
- Replacement token ID: `30`
- Decimals: `6`
- Initial deployment allocation: 100,000 (`100000000000` raw units)
- Allocation basis: Exact raw supply of original token ID `0` at [`KT1GjDJH1CASA8zRGgj81sTfEU9K2T494MMK`](https://api.tzkt.io/v1/tokens?contract=KT1GjDJH1CASA8zRGgj81sTfEU9K2T494MMK&tokenId=0)

### Original description

> Don't question the value of the Tezos Silver Tequila. Smooth, clean, simple, easy to shoot. All the ladies are under your power. When eating tacos, burritos, nachos, etc make sure you have a few shots of Tezos Silver Tequila next to you.

## 31. Tezos Reposado Tequila (`RTQLA`)

- Asset class: Legacy replacement
- Category: Drinks
- Replacement token ID: `31`
- Decimals: `6`
- Initial deployment allocation: 10,000 (`10000000000` raw units)
- Allocation basis: Exact raw supply of original token ID `0` at [`KT1QHcRL3FZRpQruFkb1GBYwfqoPXTFGipRH`](https://api.tzkt.io/v1/tokens?contract=KT1QHcRL3FZRpQruFkb1GBYwfqoPXTFGipRH&tokenId=0)

### Original description

> Don't question the value of the Tezos Reposado Tequila. Smooth, clean, simple, easy to shoot. FQ that, it's smooth so you can sip and relax, and the ladies see you relaxing and want you. They want your drank.

## 32. Tezos Anejo Tequila (`ATQLA`)

- Asset class: Legacy replacement
- Category: Drinks
- Replacement token ID: `32`
- Decimals: `6`
- Initial deployment allocation: 1,000 (`1000000000` raw units)
- Allocation basis: Exact raw supply of original token ID `0` at [`KT1RdLrFcXrwbTX9vaYcbUohTTXpe1Eco2sq`](https://api.tzkt.io/v1/tokens?contract=KT1RdLrFcXrwbTX9vaYcbUohTTXpe1Eco2sq&tokenId=0)

### Original description

> Don't question the value of the Tezos Aneja Tequila. Smooth, clean, simple, easy to shoot. Bro, did you see that George Clooney m.f. sell that tequila to Diageo for a whopping $700m? Yeah, it wasn't worth that at all. THIS is worth that. Have you tasted this bliss? It's beautiful, tastes like the perfect job offer. This is the pinnacles of success and happiness. Tequila anejo like you have never tasted. The BEST tequila you have ever set your lips on.

## 33. Anejo Tequila (`ANEJO`)

- Asset class: Legacy replacement
- Category: Drinks
- Replacement token ID: `33`
- Decimals: `8`
- Initial deployment allocation: 1,000 (`100000000000` raw units)
- Allocation basis: Exact raw supply of original token ID `0` at [`KT1CEzXaiwMVXR2Rk5Jyejh88sENZd7QUySp`](https://api.tzkt.io/v1/tokens?contract=KT1CEzXaiwMVXR2Rk5Jyejh88sENZd7QUySp&tokenId=0)

### Original description

> Don't question the value of the Tezos Añejo Tequila. Smooth, clean, simple, easy to shoot. Bro, did you see that George Clooney mofo sell that tequila to Diageo for a whopping $700m? Yeah, it wasn't worth that at all.
>
> THIS is worth that.
>
> Have you tasted this bliss? It's beautiful, tastes like the perfect job offer. This is the pinnacles of success and happiness. Tequila añejo like you have never tasted.
>
> The BEST tequila you have ever set your lips on. Other than PLAT.

## 34. Tezos Platinum Tequila (`PLAT`)

- Asset class: Legacy replacement
- Category: Drinks
- Replacement token ID: `34`
- Decimals: `6`
- Initial deployment allocation: 100 (`100000000` raw units)
- Allocation basis: Exact raw supply of original token ID `0` at [`KT1SybeY3QZ3kX4PS5ZXhxyv2dZWghTFuCdu`](https://api.tzkt.io/v1/tokens?contract=KT1SybeY3QZ3kX4PS5ZXhxyv2dZWghTFuCdu&tokenId=0)

### Original description

> Bro, you have no pallet for this. This for for ballers. It was made for ballers, it epitomizes ballers. If you have this then you are a baller. The drink icon is silly because you are so dope that no one even realizes how awesome YOU are. I personally award you a trillion cool points.

## 35. Flan (`FLAN`)

- Asset class: Legacy replacement
- Category: Desserts
- Replacement token ID: `35`
- Decimals: `6`
- Initial deployment allocation: 1,000,000 (`1000000000000` raw units)
- Allocation basis: Exact raw supply of original token ID `0` at [`KT1NxnATgx7386au1KfxU9LcRYJbWup1cEqn`](https://api.tzkt.io/v1/tokens?contract=KT1NxnATgx7386au1KfxU9LcRYJbWup1cEqn&tokenId=0)

### Original description

> I'm your biggest flan. This sweet Mexican custard delight is flantastic! You know it's really Spanish not Mexican right? Just kidding, it was actually first invented by the Romans. Let's just shut up and get to the devouring. Taste that lightweight caramel sauce... it hits the spot.

## 36. Churros (`CHURRO`)

- Asset class: Legacy replacement
- Category: Desserts
- Replacement token ID: `36`
- Decimals: `6`
- Initial deployment allocation: 100,000 (`100000000000` raw units)
- Allocation basis: Exact raw supply of original token ID `0` at [`KT1MdWp5To6hUuUbkamfKn1RowR6QcvqTd6u`](https://api.tzkt.io/v1/tokens?contract=KT1MdWp5To6hUuUbkamfKn1RowR6QcvqTd6u&tokenId=0)

### Original description

> A little bit of sugar, a pinch of salt, flour, eggs, and butter... thrown in a vat of bubbling hot grease for a few minutes and then dusted with sugar and cinnamon. A treat that makes kids of all ages smile... yes, even that wild and crazy grandma you have that rocks out to AC/DC in the garage at 94. In fact, don't let her have any of these or she'll eat them all. I saw what she did to your flan. Tell her we love her... but paws off my desert!

## 37. Tres Leches Cake (`TLC`)

- Asset class: Legacy replacement
- Category: Desserts
- Replacement token ID: `37`
- Decimals: `6`
- Initial deployment allocation: 10,000 (`10000000000` raw units)
- Allocation basis: Exact raw supply of original token ID `0` at [`KT1KDAsA4TmxLBaczVXmjjoqZXM2UDBo2xja`](https://api.tzkt.io/v1/tokens?contract=KT1KDAsA4TmxLBaczVXmjjoqZXM2UDBo2xja&tokenId=0)

### Original description

> When you want some tender loving care, you reach for some pan tres leches. This thing has all the milks... three of them. These different styles of milk give this cake a unique texture. Man, it's a good thing you don't actually need three different cows! Same cow, different post processing. Oh hey, don't forget, you've never had a tres leches like this one... so good you just have to share.

## 38. Dos Esposas Restaurante Credits (`DER`)

- Asset class: Legacy replacement
- Category: Utility
- Replacement token ID: `38`
- Decimals: `6`
- Initial deployment allocation: 75,000,000,000 (`75000000000000000` raw units)
- Allocation basis: Exact raw supply of original token ID `0` at [`KT1Kp2ZhSvNzzwYpF6pYvdjfd17hYRXjqe9Y`](https://api.tzkt.io/v1/tokens?contract=KT1Kp2ZhSvNzzwYpF6pYvdjfd17hYRXjqe9Y&tokenId=0)

### Original description

> Cuando vistando nosotros restaurante, usa eso DERs para las propinas. Yo, use these DERs as tips when you visit our restaurants to thank our staff. They work hard yo.

## 39. Tomatillos (`TOMATL`)

- Asset class: New addition
- Category: Crops
- Progression tier: Pantry
- Replacement token ID: `39`
- Decimals: `6`
- Initial deployment allocation: 6,000,000,000 (`6000000000000000` raw units)
- Allocation basis: 6,000,000,000 displayed units from legacy replacement ID `3`, [Tomatoes](https://api.tzkt.io/v1/tokens?contract=KT1BdZj4B2XGMbpZJQzPo76YcpSiswsQpRpt&tokenId=0); raw units are recalculated at 6 decimals

### Replacement description

> Tart green fruit wrapped in papery husks for bright sauces.

## 40. Hibiscus (`HIBISC`)

- Asset class: New addition
- Category: Crops
- Progression tier: Pantry
- Replacement token ID: `40`
- Decimals: `6`
- Initial deployment allocation: 80,000,000 (`80000000000000` raw units)
- Allocation basis: 80,000,000 displayed units from legacy replacement ID `6`, [Lime](https://api.tzkt.io/v1/tokens?contract=KT19oLbcu7TMGA6s3QuGpeu4cCZknhVhuATY&tokenId=0); raw units are recalculated at 6 decimals

### Replacement description

> Dried flor de Jamaica with a deep ruby color and tart finish.

## 41. Grapefruit (`POMELO`)

- Asset class: New addition
- Category: Crops
- Progression tier: Pantry
- Replacement token ID: `41`
- Decimals: `6`
- Initial deployment allocation: 80,000,000 (`80000000000000` raw units)
- Allocation basis: 80,000,000 displayed units from legacy replacement ID `6`, [Lime](https://api.tzkt.io/v1/tokens?contract=KT19oLbcu7TMGA6s3QuGpeu4cCZknhVhuATY&tokenId=0); raw units are recalculated at 6 decimals

### Replacement description

> Ruby citrus grown for sparkling, bittersweet drinks.

## 42. Black Beans (`BLKBN`)

- Asset class: New addition
- Category: Ingredients
- Progression tier: Pantry
- Replacement token ID: `42`
- Decimals: `6`
- Initial deployment allocation: 1,000,000,000,000 (`1000000000000000000` raw units)
- Allocation basis: 1,000,000,000,000 displayed units from legacy replacement ID `9`, [Refried Beans](https://api.tzkt.io/v1/tokens?contract=KT1F5M35m8Tn2nbJGn7DwheRXxhyvm5KUho2&tokenId=0); raw units are recalculated at 6 decimals

### Replacement description

> Slow-cooked black beans for tostadas, tacos, and hearty plates.

## 43. Oaxaca Cheese (`OAXCHZ`)

- Asset class: New addition
- Category: Ingredients
- Progression tier: Pantry
- Replacement token ID: `43`
- Decimals: `6`
- Initial deployment allocation: 3,000,000,000 (`3000000000000000` raw units)
- Allocation basis: 3,000,000,000 displayed units from legacy replacement ID `12`, [Mexican Cheese](https://api.tzkt.io/v1/tokens?contract=KT1B6p7LCM4bSFg5ahRQPzp6nHh6raKMsubk&tokenId=0); raw units are recalculated at 6 decimals

### Replacement description

> A mild, stretchy string cheese made for melting.

## 44. Cinnamon (`CINNAM`)

- Asset class: New addition
- Category: Ingredients
- Progression tier: Pantry
- Replacement token ID: `44`
- Decimals: `6`
- Initial deployment allocation: 1,500,000,000 (`1500000000000000` raw units)
- Allocation basis: 1,500,000,000 displayed units from legacy replacement ID `14`, [Sour Cream](https://api.tzkt.io/v1/tokens?contract=KT1FPA3aJ8dTh3ANsaRfVcXSLeWG9mi4LUkv&tokenId=0); raw units are recalculated at 6 decimals

### Replacement description

> Warm aromatic spice for drinks and the dessert station.

## 45. Salsa Verde (`SALSV`)

- Asset class: New addition
- Category: Appetizers
- Progression tier: Prepared
- Replacement token ID: `45`
- Decimals: `6`
- Initial deployment allocation: 90,000,000 (`90000000000000` raw units)
- Allocation basis: 90,000,000 displayed units from legacy replacement ID `16`, [Guacamole](https://api.tzkt.io/v1/tokens?contract=KT19g5KrxZdcyYmFAmWijywENFdjcFAi74eM&tokenId=0); raw units are recalculated at 6 decimals

### Replacement description

> Tomatillos, chile, onion, and lime blended in the molcajete.

## 46. Black Bean Tostada (`TOSTAD`)

- Asset class: New addition
- Category: Appetizers
- Progression tier: Prepared
- Replacement token ID: `46`
- Decimals: `6`
- Initial deployment allocation: 90,000,000 (`90000000000000` raw units)
- Allocation basis: 90,000,000 displayed units from legacy replacement ID `16`, [Guacamole](https://api.tzkt.io/v1/tokens?contract=KT19g5KrxZdcyYmFAmWijywENFdjcFAi74eM&tokenId=0); raw units are recalculated at 6 decimals

### Replacement description

> A crisp tortilla layered with beans, Oaxaca cheese, and salsa.

## 47. Esquites (`ESQUIT`)

- Asset class: New addition
- Category: Appetizers
- Progression tier: Premium
- Replacement token ID: `47`
- Decimals: `6`
- Initial deployment allocation: 15,000,000 (`15000000000000` raw units)
- Allocation basis: 15,000,000 displayed units from legacy replacement ID `18`, [Tortilla Chips](https://api.tzkt.io/v1/tokens?contract=KT1DFerueCFPPta4mpiYjy81YwiHbBjjPyUH&tokenId=0); raw units are recalculated at 6 decimals

### Replacement description

> Street-style corn with cream, cheese, lime, and chile.

## 48. Chiles Rellenos (`RELLEN`)

- Asset class: New addition
- Category: Mains
- Progression tier: Premium
- Replacement token ID: `48`
- Decimals: `6`
- Initial deployment allocation: 50,000,000,000 (`50000000000000000` raw units)
- Allocation basis: 50,000,000,000 displayed units from legacy replacement ID `24`, [Carne Asada](https://api.tzkt.io/v1/tokens?contract=KT1TCPf4DjgsseHj8ixRnCBgToqZbdFHQtPA&tokenId=0); raw units are recalculated at 6 decimals

### Replacement description

> Roasted peppers filled with Oaxaca cheese under tomato sauce.

## 49. Pozole Rojo (`POZOLE`)

- Asset class: New addition
- Category: Mains
- Progression tier: Premium
- Replacement token ID: `49`
- Decimals: `6`
- Initial deployment allocation: 50,000,000,000 (`50000000000000000` raw units)
- Allocation basis: 50,000,000,000 displayed units from legacy replacement ID `24`, [Carne Asada](https://api.tzkt.io/v1/tokens?contract=KT1TCPf4DjgsseHj8ixRnCBgToqZbdFHQtPA&tokenId=0); raw units are recalculated at 6 decimals

### Replacement description

> Red chile broth with hominy, beef, radish, and lime.

## 50. Tacos de Canasta (`CANAST`)

- Asset class: New addition
- Category: Mains
- Progression tier: Prepared
- Replacement token ID: `50`
- Decimals: `6`
- Initial deployment allocation: 50,000,000 (`50000000000000` raw units)
- Allocation basis: 50,000,000 displayed units from legacy replacement ID `22`, [Burrito](https://api.tzkt.io/v1/tokens?contract=KT1NrsxNC6xoj9oKrtDSJAvptYe6VvmCTueP&tokenId=0); raw units are recalculated at 6 decimals

### Replacement description

> Basket-steamed tacos filled with beans, cheese, and green salsa.

## 51. Horchata (`HORCHA`)

- Asset class: New addition
- Category: Drinks
- Progression tier: Prepared
- Replacement token ID: `51`
- Decimals: `6`
- Initial deployment allocation: 1,000,000 (`1000000000000` raw units)
- Allocation basis: 1,000,000 displayed units from legacy replacement ID `28`, [Margarita](https://api.tzkt.io/v1/tokens?contract=KT1Soa1U1fYRQEgg9No3Xvqxuv46kUZFFdJ6&tokenId=0); raw units are recalculated at 6 decimals

### Replacement description

> Chilled rice and milk sweetened with fragrant cinnamon.

## 52. Agua de Jamaica (`JAMAIC`)

- Asset class: New addition
- Category: Drinks
- Progression tier: Prepared
- Replacement token ID: `52`
- Decimals: `6`
- Initial deployment allocation: 1,000,000 (`1000000000000` raw units)
- Allocation basis: 1,000,000 displayed units from legacy replacement ID `28`, [Margarita](https://api.tzkt.io/v1/tokens?contract=KT1Soa1U1fYRQEgg9No3Xvqxuv46kUZFFdJ6&tokenId=0); raw units are recalculated at 6 decimals

### Replacement description

> A jewel-red hibiscus agua fresca sharpened with lime.

## 53. Paloma (`PALOMA`)

- Asset class: New addition
- Category: Drinks
- Progression tier: Premium
- Replacement token ID: `53`
- Decimals: `6`
- Initial deployment allocation: 1,000,000 (`1000000000000` raw units)
- Allocation basis: 1,000,000 displayed units from legacy replacement ID `27`, [Michelada](https://api.tzkt.io/v1/tokens?contract=KT1FnG8rT4GSgXqwNpnXR9nVjEmjBCyEnGdn&tokenId=0); raw units are recalculated at 6 decimals

### Replacement description

> Silver tequila, grapefruit, lime, and sparkling citrus.

## 54. Arroz con Leche (`ARROZL`)

- Asset class: New addition
- Category: Desserts
- Progression tier: Prepared
- Replacement token ID: `54`
- Decimals: `6`
- Initial deployment allocation: 1,000,000 (`1000000000000` raw units)
- Allocation basis: 1,000,000 displayed units from legacy replacement ID `35`, [Flan](https://api.tzkt.io/v1/tokens?contract=KT1NxnATgx7386au1KfxU9LcRYJbWup1cEqn&tokenId=0); raw units are recalculated at 6 decimals

### Replacement description

> Creamy rice pudding finished with a cinnamon spiral.

## 55. Sopapillas (`SOPAPI`)

- Asset class: New addition
- Category: Desserts
- Progression tier: Prepared
- Replacement token ID: `55`
- Decimals: `6`
- Initial deployment allocation: 1,000,000 (`1000000000000` raw units)
- Allocation basis: 1,000,000 displayed units from legacy replacement ID `35`, [Flan](https://api.tzkt.io/v1/tokens?contract=KT1NxnATgx7386au1KfxU9LcRYJbWup1cEqn&tokenId=0); raw units are recalculated at 6 decimals

### Replacement description

> Puffed golden pastries dusted with cinnamon and honey.

## 56. Buñuelos (`BUNUEL`)

- Asset class: New addition
- Category: Desserts
- Progression tier: Premium
- Replacement token ID: `56`
- Decimals: `6`
- Initial deployment allocation: 100,000 (`100000000000` raw units)
- Allocation basis: 100,000 displayed units from legacy replacement ID `36`, [Churros](https://api.tzkt.io/v1/tokens?contract=KT1MdWp5To6hUuUbkamfKn1RowR6QcvqTd6u&tokenId=0); raw units are recalculated at 6 decimals

### Replacement description

> Thin crisp fritters layered with cinnamon sugar.
