const DB_NAME = 'st07415';
const DB_VERSION = 1;

const CATEGORIES = [
  { id: 'stir-fry',    name: '小炒',  icon: '🍳' },
  { id: 'milk-tea',    name: '奶茶',  icon: '🧋' },
  { id: 'dessert',     name: '甜品',  icon: '🍰' },
  { id: 'fruit',       name: '水果',  icon: '🍓' },
  { id: 'noodles',     name: '面食',  icon: '🍜' },
  { id: 'snack',       name: '小吃',  icon: '🥟' },
  { id: 'meat',        name: '荤菜',  icon: '🍗' },
  { id: 'veggie',      name: '素菜',  icon: '🥬' },
  { id: 'restaurant',  name: '下馆子', icon: '🍽️' }
];

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('dishes')) {
        const store = db.createObjectStore('dishes', { keyPath: 'id' });
        store.createIndex('category', 'category', { unique: false });
      }
      if (!db.objectStoreNames.contains('orders')) {
        db.createObjectStore('orders', { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(storeName, mode = 'readonly') {
  return openDB().then(db => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    return { store, transaction, db };
  });
}

function promisify(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

const DB = {
  async getAllDishes(categoryId) {
    const { store } = await tx('dishes');
    if (categoryId) {
      const index = store.index('category');
      return promisify(index.getAll(categoryId));
    }
    return promisify(store.getAll());
  },

  async getDish(id) {
    const { store } = await tx('dishes');
    return promisify(store.get(id));
  },

  async addDish(dish) {
    const { store } = await tx('dishes', 'readwrite');
    dish.id = dish.id || Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    dish.createdAt = dish.createdAt || Date.now();
    return promisify(store.put(dish));
  },

  async updateDish(dish) {
    const { store } = await tx('dishes', 'readwrite');
    return promisify(store.put(dish));
  },

  async deleteDish(id) {
    const { store } = await tx('dishes', 'readwrite');
    return promisify(store.delete(id));
  },

  async addOrder(order) {
    const { store } = await tx('orders', 'readwrite');
    order.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    order.createdAt = Date.now();
    return promisify(store.put(order));
  },

  async getAllOrders() {
    const { store } = await tx('orders');
    return promisify(store.getAll());
  },

  async deleteOrder(id) {
    const { store } = await tx('orders', 'readwrite');
    return promisify(store.delete(id));
  },

  categories: CATEGORIES
};
