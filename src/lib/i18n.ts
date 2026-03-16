import { browser } from '$app/environment';
import { addMessages, init } from 'svelte-i18n';

import en from '$lib/locales/en.json';
import th from '$lib/locales/th.json';

addMessages('en', en);
addMessages('th', th);

init({
  fallbackLocale: 'th',
  initialLocale: browser ? (localStorage.getItem('locale') || 'th') : 'th',
});
