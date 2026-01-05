import { browser } from '$app/environment'; // <--- Import this

type User = {
    name: string;
    role: string;
} | null;

class UserState {
    value = $state<User>(null);

    constructor() {
        // Only run this if we are in the browser!
        if (browser) {
            const saved = localStorage.getItem("user");
            if (saved) {
                try {
                    this.value = JSON.parse(saved);
                } catch { }
            }
        }
    }

    set(user: User) {
        this.value = user;
        // Only save if in browser
        if (browser && user) {
            localStorage.setItem("user", JSON.stringify(user));
        }
    }

    logout() {
        this.value = null;
        // Only clear if in browser
        if (browser) {
            localStorage.removeItem("user");
            localStorage.removeItem("authToken");
        }
    }
}

export const userState = new UserState();