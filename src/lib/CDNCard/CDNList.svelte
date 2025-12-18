<script lang="ts">
	import { Checkbox }	 from 'flowbite-svelte';
	import { flip } from 'svelte/animate';
	import { send, receive } from './transition.ts';

	let { cdn, parentId } = $props<{ cdn: any[], parentId: string }>();

	function toggleItem(item: any) {
        item.done = !item.done;
    }
</script>

<ul>
	{#each cdn as item (item.id)}
		<li
			class={{ done: item.done }}
            in:receive={{ key: `${parentId}-${item.id}` }}
            out:send={{ key: `${parentId}-${item.id}` }}
            animate:flip={{ duration: 200 }}
		>
			<label class="mb-2">
				<Checkbox custom 
                    checked={item.done} 
                    onchange={() => toggleItem(item)}
					autocomplete="off"
				>
					<div
					class="peer-checked:border-green-800 cursor-pointer rounded-lg border-2 border-gray-200 bg-white p-2 font-normal text-gray-500 peer-checked:text-gray-600 hover:bg-gray-50 hover:text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:peer-checked:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-300"
					>
						<div class="text-md font-semibold">
							<span class="text-base break-all">{item.description}</span>
						</div>
					</div>
				</Checkbox>
			</label>
		</li>
	{/each}
</ul>

<style>
	label {
		width: 100%;
		height: 100%;
		display: flex;
	}

	span {
		flex: 1;
	}
</style>
