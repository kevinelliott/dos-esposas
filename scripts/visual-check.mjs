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

async function checkKitchenOrderRail(page) {
  const rail = page.locator(".kitchen-order-rail");
  const readiness = rail.getByText("Readiness");
  const custody = rail.getByText("Custody");
  const primaryAction = rail.locator(".button--primary");
  await rail.waitFor();
  await readiness.waitFor();
  await custody.waitFor();

  const actionBox = await primaryAction.boundingBox();
  if (
    !actionBox ||
    actionBox.y < 0 ||
    actionBox.y + actionBox.height > (page.viewportSize()?.height ?? 0)
  ) {
    throw new Error("desktop kitchen primary action is outside the first viewport");
  }
}

async function checkActivityKeyboard(page) {
  const trigger = page.getByRole("button", { name: /Operation activity/ });
  await trigger.click();
  const close = page.getByRole("button", {
    name: "Close operation activity",
  });
  await close.waitFor();
  if (!(await close.evaluate((element) => element === document.activeElement))) {
    throw new Error("activity panel did not move focus to its close control");
  }
  await page.keyboard.press("Escape");
  if (!(await trigger.evaluate((element) => element === document.activeElement))) {
    throw new Error("activity panel did not restore trigger focus after Escape");
  }
}

async function checkMinimumTargets(page, selector, name) {
  const undersized = await page.locator(selector).evaluateAll((elements) =>
    elements
      .filter((element) => {
        const style = window.getComputedStyle(element);
        const box = element.getBoundingClientRect();
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          (box.width < 44 || box.height < 44)
        );
      })
      .map((element) => {
        const box = element.getBoundingClientRect();
        return `${element.tagName.toLowerCase()} ${element.textContent?.trim() ?? ""} (${Math.round(box.width)}x${Math.round(box.height)})`;
      }),
  );
  if (undersized.length > 0) {
    throw new Error(`${name} has undersized targets: ${undersized.join(", ")}`);
  }
}

async function checkAssetMetricCard(page, network, name) {
  const strip = page.locator(".inventory-card__stock-strip").first();
  await strip.waitFor();
  if ((await strip.locator(":scope > span").count()) !== 3) {
    throw new Error(`${name} does not expose three supply cells`);
  }
  const minimumFont = await strip.locator("small, b").evaluateAll((elements) =>
    Math.min(...elements.map((element) => Number.parseFloat(getComputedStyle(element).fontSize))),
  );
  if (minimumFont < 11) {
    throw new Error(`${name} supply text falls below 11px`);
  }
  if (network === "mainnet" && (await strip.innerText()).includes("—")) {
    throw new Error(`${name} did not load sourced mainnet supply values`);
  }
}

async function checkAssetLedger(page, network, name) {
  const ledger = page.locator(".asset-ledger");
  await ledger.waitFor();
  const expectedCells = network === "mainnet" ? 4 : 3;
  if ((await ledger.locator(".asset-ledger__rail > div").count()) !== expectedCells) {
    throw new Error(`${name} does not expose ${expectedCells} primary ledger cells`);
  }
  const actions = page.locator(".detail-actions");
  const [actionBox, ledgerBox] = await Promise.all([
    actions.boundingBox(),
    ledger.boundingBox(),
  ]);
  if (!actionBox || !ledgerBox || actionBox.y >= ledgerBox.y) {
    throw new Error(`${name} puts analytics before the primary action`);
  }
  if (network === "mainnet") {
    await ledger.getByText("Best-effort current").waitFor();
    await ledger.getByText("1,664.696297 AVO").waitFor();
  } else {
    await ledger.getByText("Not reported").first().waitFor();
  }
}

async function checkAssetLoadingStability(browser, width, height, network) {
  const page = await browser.newPage({ viewport: { width, height } });
  observe(page);
  await page.route("**/api/asset-metrics", async (route) => {
    const response = await route.fetch();
    await new Promise((resolve) => setTimeout(resolve, 1_800));
    await route.fulfill({ response });
  });
  await page.goto(`${baseUrl}/items/avocado`);
  const ledger = page.locator(".asset-ledger");
  await ledger.waitFor();
  const loadingHeight = (await ledger.boundingBox())?.height ?? 0;
  if ((await ledger.getAttribute("aria-busy")) !== "true") {
    throw new Error(`${width}px ${network} asset ledger skipped its loading state`);
  }
  await page.waitForFunction(
    () => document.querySelector(".asset-ledger")?.getAttribute("aria-busy") === "false",
    undefined,
    { timeout: 10_000 },
  );
  const settledHeight = (await ledger.boundingBox())?.height ?? 0;
  const heightDelta = Math.abs(settledHeight - loadingHeight);
  if (heightDelta > 80) {
    throw new Error(
      `${width}px ${network} asset ledger shifted ${Math.round(heightDelta)}px while loading evidence`,
    );
  }
  await checkPage(page, `${width}px delayed asset ledger`);
  await page.close();
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
  await desktop.getByRole("button", { name: "Drinks" }).click();
  await desktop.getByPlaceholder("Search drinks").fill("margarita");
  await desktop
    .getByRole("heading", { name: "Premium Margarita" })
    .waitFor();
  await settle(desktop);
  await checkAssetMetricCard(desktop, network, "desktop catalog");
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
  await settle(desktop);
  await checkKitchenOrderRail(desktop);
  const currentKitchenLink = desktop.locator(
    '.site-header__nav a[href="/kitchen"][aria-current="page"]',
  );
  if ((await currentKitchenLink.count()) !== 1) {
    throw new Error("desktop kitchen navigation does not expose aria-current");
  }
  await checkActivityKeyboard(desktop);
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

  await desktop.goto(`${baseUrl}/items/avocado`);
  await desktop.getByRole("heading", { name: "Avocado" }).waitFor();
  await desktop.getByText("On-chain identity").waitFor();
  await settle(desktop);
  await checkAssetLedger(desktop, network, "desktop item detail");
  await checkPage(desktop, "desktop item detail");
  await desktop.screenshot({
    path: "/private/tmp/dos-esposas-avocado.png",
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
  if (
    (await mobile.locator('.mobile-game-bar a[aria-current="page"]').count()) !==
    1
  ) {
    throw new Error("mobile game bar does not expose one current page");
  }
  await checkMinimumTargets(
    mobile,
    ".kitchen-order-rail button, .recipe-browser__head button, .recipe-browser__head select, .activity-center__trigger, .mobile-nav a, .mobile-game-bar a, .testnet-journey a, .testnet-journey button",
    "mobile kitchen",
  );
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

  await mobile.goto(`${baseUrl}/menu`);
  await settle(mobile);
  await checkAssetMetricCard(mobile, network, "mobile catalog");
  await checkPage(mobile, "mobile catalog metrics");

  await mobile.goto(`${baseUrl}/items/avocado`);
  await mobile.getByRole("heading", { name: "Avocado" }).waitFor();
  await settle(mobile);
  await checkAssetLedger(mobile, network, "mobile item detail");
  await checkPage(mobile, "mobile item detail metrics");
  await mobile.screenshot({
    path: "/private/tmp/dos-esposas-mobile-asset-ledger.png",
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

  const narrowMobile = await browser.newPage({
    viewport: { width: 320, height: 568 },
  });
  observe(narrowMobile);
  await narrowMobile.goto(`${baseUrl}/kitchen`);
  await narrowMobile
    .getByRole("heading", { name: "Pixel kitchen" })
    .waitFor();
  await narrowMobile.getByRole("button", { name: "Open menu" }).click();
  await narrowMobile
    .getByRole("navigation", { name: "Mobile navigation" })
    .waitFor();
  await checkMinimumTargets(
    narrowMobile,
    ".kitchen-order-rail button, .recipe-browser__head button, .recipe-browser__head select, .activity-center__trigger, .mobile-nav a, .mobile-game-bar a, .testnet-journey a, .testnet-journey button",
    "320px mobile kitchen",
  );
  await checkPage(narrowMobile, "320px mobile kitchen");
  await narrowMobile.goto(`${baseUrl}/menu`);
  await settle(narrowMobile);
  await checkAssetMetricCard(narrowMobile, network, "320px catalog");
  await checkPage(narrowMobile, "320px catalog metrics");
  await narrowMobile.goto(`${baseUrl}/items/avocado`);
  await narrowMobile.getByRole("heading", { name: "Avocado" }).waitFor();
  await settle(narrowMobile);
  await checkAssetLedger(narrowMobile, network, "320px item detail");
  await checkPage(narrowMobile, "320px item detail metrics");
  await narrowMobile.close();

  await checkAssetLoadingStability(browser, 390, 844, network);
  await checkAssetLoadingStability(browser, 320, 700, network);

  const reducedMotion = await browser.newPage({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  observe(reducedMotion);
  await reducedMotion.goto(`${baseUrl}/kitchen`);
  await reducedMotion.getByRole("heading", { name: "Pixel kitchen" }).waitFor();
  await reducedMotion
    .getByRole("button", { name: "Recheck ingredients" })
    .click();
  const reducedStatus = reducedMotion.locator(
    '.kitchen-operation__status[data-phase="preview"]',
  );
  await reducedStatus.waitFor();
  const reducedAnimations = await reducedMotion
    .locator(".kitchen-action-scene")
    .evaluate(
      (scene) =>
        scene
          .getAnimations({ subtree: true })
          .filter((animation) => animation.playState === "running").length,
    );
  if (reducedAnimations !== 0) {
    throw new Error(
      `reduced-motion kitchen still has ${reducedAnimations} running animations`,
    );
  }
  await reducedMotion.close();

  if (errors.length > 0) {
    throw new Error(`Browser console errors:\n${[...new Set(errors)].join("\n")}`);
  }

  console.log(
    `UI smoke check passed on ${network}: pantry, catalog filtering, asset supply metrics, market, asset forge, kitchen recipes, conversion metrics, replate conversion, item details, trades, mobile navigation, images, console, and overflow.`,
  );
} finally {
  await browser.close();
}
