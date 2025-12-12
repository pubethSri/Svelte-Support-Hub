<script lang="ts">
    import { Card, Button } from "flowbite-svelte";
    import TodoList from './TodoList.svelte';
    const todos = $state([
		{ id: 1, done: true, description: 'site1.com' },
		{ id: 2, done: true, description: 'site2.com' },
		{ id: 3, done: true, description: 'site3.com' },
		{ id: 4, done: true, description: 'site4.com' },
		{ id: 5, done: true, description: 'site5.com' },
		{ id: 6, done: true, description: 'site6.com' }
	]);

	function remove(todo: { id: number; done: boolean; description: string }) {
		const index = todos.indexOf(todo);
		todos.splice(index, 1);
	}
</script>

<Card size="lg" class="p-4 text-center sm:p-8 md:p-10">
    <h1 class="text-3xl">Calculator site</h1>
    <div class="board">
        <div class="done">
            <h2>Pass</h2>
            <TodoList todos={todos.filter((t) => t.done)} {remove} />
	    </div>
        <div class="todo">
            <h2>Block</h2>
            <TodoList todos={todos.filter((t) => !t.done)} {remove} />
        </div>
</div>
</Card>

<style>
	.board {
		display: grid;
		grid-template-columns: 1fr 1fr;
		grid-column-gap: 1em;
		max-width: 36em;
		margin: 0 auto;
	}

	h2 {
		font-size: 2em;
		font-weight: 200;
	}
</style>