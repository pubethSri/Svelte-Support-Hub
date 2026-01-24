<script>
  export let data;
</script>

<h1>Slug: {data?.slug ?? ''}</h1>

<!-- <form 
method="POST" 
action="?/delete" 
use:enhance={({ cancel }) => {
  if (!confirm(`Are you sure you want to delete policy: ${policy.name}?`)) {
      cancel();
      return;
  }
  // Trigger Overlay
  deletingPolicyName = policy.name;

  return async ({ update }) => {
      await update(); 
      // Hide Overlay
      deletingPolicyName = null;
  };
}}
>
<input type="hidden" name="policyName" value={policy.name} />

<Button 
  aria-label="Submit"
  size="sm"
  variant="outline"
  class="hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
  disabled={deletingPolicyName !== null} 
>
  Delete
</Button>
</form> -->