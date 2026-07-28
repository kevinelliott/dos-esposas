import { chromium } from "@playwright/test";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const browser = await chromium.launch({ headless: true });
const errors = [];

async function settle(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1800);
}

async function checkPage(page, name) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  if (overflow > 1) {
    throw new Error(`${name} has ${overflow}px of horizontal overflow`);
  }

  const brokenImages = await page.locator("img").evaluateAll((images) =>
    images
      .filter((image) => image.complete && image.naturalWidth === 0)
      .map((image) => image.getAttribute("src")),
  );
  if (brokenImages.length > 0) {
    throw new Error(`${name} has broken images: ${brokenImages.join(", ")}`);
  }
}

async function checkKitchenAction(page, recipeName, action) {
  await page
    .getByRole("button", { name: new RegExp(recipeName, "i") })
    .click();
  const workbench = page.locator(
    `.recipe-workbench[data-kitchen-action="${action.toLowerCase()}"]`,
  );
  await workbench.waitFor();
  const actionScene = workbench.locator(
    `.kitchen-action-scene[data-action-scene="${action.toLowerCase()}"]`,
  );
  await actionScene.locator(".pixel-chef").waitFor();
  await actionScene
    .locator(`.action-device--${action.toLowerCase()}`)
    .waitFor();
  await page
    .getByRole("button", { name: "Recheck ingredients" })
    .click();
  await page
    .locator(
      `.recipe-workbench[data-kitchen-action="${action.toLowerCase()}"][data-kitchen-phase="preview"]`,
    )
    .waitFor();
  const runningAnimations = await actionScene.evaluate((scene) =>
    scene
      .getAnimations({ subtree: true })
      .filter((animation) => animation.playState === "running").length,
  );
  if (runningAnimations < 3) {
    throw new Error(
      `${action} action scene started only ${runningAnimations} animations`,
    );
  }
  await page.waitForFunction(
    () =>
      document
        .querySelector(".recipe-workbench")
        ?.getAttribute("data-kitchen-phase") === "idle",
    undefined,
    { timeout: 4_000 },
  );
}

function observe(page) {
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      !message.text().startsWith("Failed to load resource:")
    ) {
      errors.push(message.text());
    }
  });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (
      response.url().startsWith(baseUrl) &&
      response.status() >= 400
    ) {
      errors.push(
        `Local request failed (${response.status()}): ${response.url()}`,
      );
    }
  });
}

try {
  const desktop = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  observe(desktop);

  await desktop.goto(baseUrl);
  const network =
    (await desktop.locator('meta[name="tezos-network"]').getAttribute("content")) ??
    "mainnet";
  await desktop
    .getByRole("heading", { name: "Your wallet is the pantry." })
    .waitFor();
  if (network === "shadownet") {
    await desktop.getByText("Shadownet test lab").waitFor();
  }
  await settle(desktop);
  await checkPage(desktop, "desktop pantry");
  await desktop.screenshot({
    path: "/private/tmp/dos-esposas-pantry.png",
    fullPage: true,
  });

  await desktop.goto(`${baseUrl}/menu`);
  await settle(desktop);
  await desktop.getByRole("tab", { name: "Drinks" }).click();
  await desktop.getByPlaceholder("Search drinks").fill("margarita");
  await desktop
    .getByRole("heading", { name: "Premium Margarita" })
    .waitFor();
  await settle(desktop);
  await checkPage(desktop, "desktop catalog");
  await desktop.screenshot({
    path: "/private/tmp/dos-esposas-catalog.png",
    fullPage: true,
  });

  await desktop.goto(`${baseUrl}/market`);
  await desktop.getByRole("heading", { name: "Night market" }).waitFor();
  if (network === "shadownet") {
    const deploymentConfigured = await desktop
      .getByText(/Checkout contract is not deployed/)
      .isVisible()
      .catch(() => false);
    if (!deploymentConfigured) {
      await desktop
        .getByText(/available/)
        .first()
        .waitFor({ timeout: 15_000 });
    }
  } else {
    await desktop
      .getByText(/available/)
      .first()
      .waitFor({ timeout: 15_000 });
  }
  await settle(desktop);
  await checkPage(desktop, "desktop market");
  await desktop.screenshot({
    path: "/private/tmp/dos-esposas-market.png",
    fullPage: true,
  });

  if (network === "shadownet") {
    await desktop.goto(`${baseUrl}/forge`);
    await desktop.getByRole("heading", { name: "Asset forge" }).waitFor();
    const forgeCards = desktop.locator(".forge-card");
    await forgeCards.first().waitFor();
    const forgeCardCount = await forgeCards.count();
    if (forgeCardCount !== 57) {
      throw new Error(
        `desktop forge rendered ${forgeCardCount} assets instead of 57`,
      );
    }
    await desktop.getByPlaceholder("Search assets").fill("margarita");
    const filteredForgeCardCount = await forgeCards.count();
    if (filteredForgeCardCount !== 2) {
      throw new Error(
        `desktop forge search returned ${filteredForgeCardCount} assets instead of 2`,
      );
    }
    await desktop.getByPlaceholder("Search assets").fill("");
    await settle(desktop);
    await checkPage(desktop, "desktop asset forge");
    await desktop.screenshot({
      path: "/private/tmp/dos-esposas-forge.png",
      fullPage: true,
    });
  }

  await desktop.goto(`${baseUrl}/kitchen`);
  await desktop.getByRole("heading", { name: "Pixel kitchen" }).waitFor();
  await checkKitchenAction(desktop, "Table Guacamole", "Blend");
  await checkKitchenAction(desktop, "Fresh Tortilla Chips", "Combine");
  await checkKitchenAction(desktop, "Loaded Burrito", "Cook");
  await checkKitchenAction(desktop, "Premium Margarita", "Merge");
  await checkKitchenAction(desktop, "Carne Asada", "Grill");
  await checkKitchenAction(desktop, "Tres Leches Cake", "Bake");
  await checkKitchenAction(desktop, "Spicy Michelada", "Shake");
  if (network === "shadownet") {
    await checkKitchenAction(desktop, "Pozole Rojo", "Simmer");
  }
  await desktop.evaluate(() => window.scrollTo(0, 0));
  await settle(desktop);
  await checkPage(desktop, "desktop kitchen");
  await desktop.screenshot({
    path: "/private/tmp/dos-esposas-kitchen.png",
    fullPage: true,
  });

  await desktop.goto(`${baseUrl}/conversions`);
  await desktop
    .getByRole("heading", { name: "Conversion ledger" })
    .waitFor();
  const conversionRows = desktop.locator(
    ".conversion-ledger > .conversion-table-wrap .conversion-table tbody tr",
  );
  const expectedAssetRows = network === "shadownet" ? 57 : 39;
  if ((await conversionRows.count()) !== expectedAssetRows) {
    throw new Error(
      `conversion ledger rendered ${await conversionRows.count()} assets instead of ${expectedAssetRows}`,
    );
  }
  await desktop
    .getByPlaceholder("Search assets or symbols")
    .fill("platinum");
  if ((await conversionRows.count()) !== 1) {
    throw new Error("conversion ledger asset search did not return one row");
  }
  await desktop.getByPlaceholder("Search assets or symbols").fill("");
  await desktop.getByRole("button", { name: "Recipes" }).click();
  const expectedRecipeRows = network === "shadownet" ? 22 : 10;
  if ((await conversionRows.count()) !== expectedRecipeRows) {
    throw new Error(
      `conversion ledger rendered ${await conversionRows.count()} recipes instead of ${expectedRecipeRows}`,
    );
  }
  const mechanicRows = desktop.locator(
    ".conversion-table--mechanics tbody tr",
  );
  if ((await mechanicRows.count()) !== 8) {
    throw new Error(
      `conversion ledger rendered ${await mechanicRows.count()} action mechanics instead of 8`,
    );
  }
  await desktop
    .getByRole("heading", { name: "Action mechanics" })
    .waitFor();
  await settle(desktop);
  await checkPage(desktop, "desktop conversion ledger");
  await desktop.screenshot({
    path: "/private/tmp/dos-esposas-conversions.png",
    fullPage: true,
  });

  await desktop.goto(`${baseUrl}/replate`);
  await desktop.getByRole("heading", { name: "Replate counter" }).waitFor();
  await desktop.getByText("Replate ticket").waitFor();
  await desktop.locator(".replate-service-window").waitFor();
  await settle(desktop);
  await checkPage(desktop, "desktop replate counter");
  await desktop.screenshot({
    path: "/private/tmp/dos-esposas-replate.png",
    fullPage: true,
  });

  await desktop.goto(`${baseUrl}/items/guacamole`);
  await desktop.getByRole("heading", { name: "Guacamole" }).waitFor();
  await desktop.getByText("On-chain identity").waitFor();
  await settle(desktop);
  await checkPage(desktop, "desktop item detail");
  await desktop.screenshot({
    path: "/private/tmp/dos-esposas-guacamole.png",
    fullPage: true,
  });

  await desktop.goto(`${baseUrl}/trades`);
  await desktop.getByRole("heading", { name: "Direct offers" }).waitFor();
  await desktop.getByText("Connect to load offerable items").waitFor();
  await checkPage(desktop, "desktop trades");

  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
  });
  observe(mobile);
  await mobile.goto(`${baseUrl}/kitchen`);
  await mobile.getByRole("heading", { name: "Pixel kitchen" }).waitFor();
  await mobile.getByRole("button", { name: "Open menu" }).click();
  await mobile
    .getByRole("navigation", { name: "Mobile navigation" })
    .waitFor();
  await settle(mobile);
  await checkPage(mobile, "mobile kitchen");
  await mobile.screenshot({
    path: "/private/tmp/dos-esposas-mobile-kitchen.png",
    fullPage: true,
  });

  await mobile.goto(`${baseUrl}/conversions`);
  await mobile
    .getByRole("heading", { name: "Conversion ledger" })
    .waitFor();
  await settle(mobile);
  await checkPage(mobile, "mobile conversion ledger");
  await mobile.screenshot({
    path: "/private/tmp/dos-esposas-mobile-conversions.png",
    fullPage: true,
  });

  await mobile.goto(`${baseUrl}/replate`);
  await mobile.getByRole("heading", { name: "Replate counter" }).waitFor();
  await settle(mobile);
  await checkPage(mobile, "mobile replate counter");
  await mobile.screenshot({
    path: "/private/tmp/dos-esposas-mobile-replate.png",
    fullPage: true,
  });

  if (network === "shadownet") {
    await mobile.goto(`${baseUrl}/forge`);
    await mobile.getByRole("heading", { name: "Asset forge" }).waitFor();
    await settle(mobile);
    await checkPage(mobile, "mobile asset forge");
    await mobile.screenshot({
      path: "/private/tmp/dos-esposas-mobile-forge.png",
      fullPage: true,
    });
  }

  if (errors.length > 0) {
    throw new Error(`Browser console errors:\n${[...new Set(errors)].join("\n")}`);
  }

  console.log(
    `UI smoke check passed on ${network}: pantry, catalog filtering, market, asset forge, kitchen recipes, conversion metrics, replate conversion, item details, trades, mobile navigation, images, console, and overflow.`,
  );
} finally {
  await browser.close();
}
