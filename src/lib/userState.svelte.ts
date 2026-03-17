import { browser } from '$app/environment';

type User = {
    name: string;
    role: string;
    dbRole?: string | null;
    isAllowed?: boolean;
} | null;

class UserState {
    value = $state<User>(null);

    set(user: User) {
        this.value = user;
    }

    logout() {
        this.value = null;
        // Note: HttpOnly cookie can only be cleared by server
        // The /logout endpoint handles this
    }
}

export const userState = new UserState();