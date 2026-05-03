const DB_NAME = 'PathAI_DB';
const DB_VERSION = 1;

class Database {
    constructor() {
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                if (!db.objectStoreNames.contains('users')) {
                    const userStore = db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
                    userStore.createIndex('username', 'username', { unique: true });
                }

                if (!db.objectStoreNames.contains('goals')) {
                    const goalStore = db.createObjectStore('goals', { keyPath: 'id', autoIncrement: true });
                    goalStore.createIndex('userId', 'userId');
                }

                if (!db.objectStoreNames.contains('quests')) {
                    const questStore = db.createObjectStore('quests', { keyPath: 'id', autoIncrement: true });
                    questStore.createIndex('goalId', 'goalId');
                }
            };
        });
    }

    async addUser(user) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(['users'], 'readwrite');
            const store = tx.objectStore('users');
            const request = store.add(user);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getUserByUsername(username) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(['users'], 'readonly');
            const store = tx.objectStore('users');
            const index = store.index('username');
            const request = index.get(username);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getUser(id) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(['users'], 'readonly');
            const store = tx.objectStore('users');
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async updateUser(user) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(['users'], 'readwrite');
            const store = tx.objectStore('users');
            const request = store.put(user);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async addGoal(goal) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(['goals'], 'readwrite');
            const store = tx.objectStore('goals');
            const request = store.add(goal);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getGoals(userId) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(['goals'], 'readonly');
            const store = tx.objectStore('goals');
            const index = store.index('userId');
            const request = index.getAll(userId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getGoal(id) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(['goals'], 'readonly');
            const store = tx.objectStore('goals');
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async updateGoal(goal) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(['goals'], 'readwrite');
            const store = tx.objectStore('goals');
            const request = store.put(goal);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteGoal(id) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(['goals', 'quests'], 'readwrite');
            const goalStore = tx.objectStore('goals');
            const questStore = tx.objectStore('quests');

            const questIndex = questStore.index('goalId');
            const questRequest = questIndex.getAllKeys(id);

            questRequest.onsuccess = () => {
                questRequest.result.forEach(key => questStore.delete(key));
            };

            goalStore.delete(id);

            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async addQuests(quests) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(['quests'], 'readwrite');
            const store = tx.objectStore('quests');
            const ids = [];
            
            quests.forEach(quest => {
                const request = store.add(quest);
                request.onsuccess = () => ids.push(request.result);
            });
            
            tx.oncomplete = () => resolve(ids);
            tx.onerror = () => reject(tx.error);
        });
    }

    async getQuests(goalId) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(['quests'], 'readonly');
            const store = tx.objectStore('quests');
            const index = store.index('goalId');
            const request = index.getAll(goalId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async updateQuest(quest) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(['quests'], 'readwrite');
            const store = tx.objectStore('quests');
            const request = store.put(quest);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteQuests(goalId) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(['quests'], 'readwrite');
            const store = tx.objectStore('quests');
            const index = store.index('goalId');
            const request = index.getAllKeys(goalId);
            request.onsuccess = () => {
                request.result.forEach(key => store.delete(key));
            };
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }
}

const db = new Database();
db.init().then(() => console.log('Database initialized')).catch(err => console.error(err));