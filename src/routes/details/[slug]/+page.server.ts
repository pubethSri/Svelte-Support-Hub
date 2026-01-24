export const load = ({ params }) => {
	return {
		slug: decodeURIComponent(params.slug)
	};
};