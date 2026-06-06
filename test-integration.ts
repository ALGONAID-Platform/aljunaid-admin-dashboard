import { authService } from './src/services/api/auth.api.ts';
import { tokenStorage, userStorage } from './src/lib/api.ts';

const run = async () => {
    try {
        console.log("Attempting login...");
        const session = await authService.login({
            email: 'admin2@junaid.edu',
            password: 'Password123!'
        });
        
        console.log("Login returned session:", session.user.role);
        console.log("Token stored in localStorage:", tokenStorage.get() ? "Yes" : "No");
        console.log("User stored in localStorage:", userStorage.get() ? "Yes" : "No");
        
    } catch (e) {
        console.log("Test Error:", e.message);
    }
};

// Mocking localStorage for Node environment
global.localStorage = {
    store: {},
    getItem(key) { return this.store[key] || null; },
    setItem(key, val) { this.store[key] = val; },
    removeItem(key) { delete this.store[key]; }
};

// Polyfill window for Axios if needed, though mostly not needed
global.window = { location: { pathname: '/', href: '/' } };

run();
