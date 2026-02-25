import { browser } from '$app/environment';

type User = {
    name: string;
    role: string;
    isAllowed?: boolean;
} | null;

class UserState {
    value = $state<User>(null);

    set(user: User) {
        this.value = user;
        // Store user info (not token) in localStorage for persistence
        if (browser && user) {
            localStorage.setItem("user", JSON.stringify(user));
        }
    }

    loadFromStorage() {
        // Load cached user info from localStorage
        // This is just for display - actual auth is via HttpOnly cookie
        if (browser) {
            const savedUser = localStorage.getItem("user");
            if (savedUser) {
                try {
                    this.value = JSON.parse(savedUser);
                } catch { }
            }
        }
    }

    logout() {
        this.value = null;
        if (browser) {
            localStorage.removeItem("user");
            // Note: HttpOnly cookie can only be cleared by server
            // The /logout endpoint handles this
        }
    }
}

export const userState = new UserState();