import { browser } from '$app/environment'; // <--- Import this
import { decodeJwt, isExpired } from '$lib/jwt'

type User = {
    name: string;
    role: string;
} | null;

class UserState {
    value = $state<User>(null);

    constructor() {
        // Only run this if we are in the browser!
        if (browser) {
            const savedUser = localStorage.getItem("user");
            const savedToken = localStorage.getItem('authToken')
            if (!savedToken || isExpired(savedToken)) {
                this.logout()
                return
            }
            if (savedUser) {
                try {
                    this.value = JSON.parse(savedUser);
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