const MENU = 'menu';
// const INGREDIENTS = 'ingredients';
// const ENTREES = 'entrees';
// const DRINKS = 'drinks';
// const DESERTS = 'deserts';

/**
 * Load all Menu items from local storage
 */
function getStore () {
  let store = localStorage.getItem(MENU);
  if (store == null) {
    return {};
  } else {
    return JSON.parse(store);
  }
}

/**
 * Get a section item from local storage
 * @param {String} section : Name of section from menu
 * @returns {Object} Object instance of section store
 * @see deployed
 */
function getStoreItem (section) {
  if (typeof section !== 'string') {
    return false;
  }
  let store = getStore();
  if (store[section]) {
    return store[section];
  } else {
    return {};
  }
}

/**
 * Update local storage with new menu item
 * @param {Object} item : Menu item
 * @param {String} section : Name of section
 * @param {Number} contract : The contract of the item
 */
function updateStore (contract, item) {
  console.log('Update Store =>', contract, item);
  if (typeof item !== 'object') {
    return false;
  } else if (typeof contract !== 'string') {
    return false;
  }
  let store = getStore();
  store[contract] = item;
  let update = JSON.stringify(store);
  localStorage.setItem(MENU, update);
  return true;
}

/**
 * Returns Menu item if exists or false if not found
 * @param {String} contract : Contract of item
 * @returns {Mixed: Object|Boolean}
 */
function itemExists(contract) {
  console.log('contract', contract);
  if (typeof contract !== 'string') {
    return false;
  }

  let store = getStore();
  let item = store[contract];

  if (item !== undefined) {
    return item;
  } else {
    return false;
  }
}

const store = {
  get: getStore,
  getItem: getStoreItem,
  existsItem: itemExists,
  update: updateStore
};

export default { store };