interface Env {
	AUTH_KEY: string;
	MY_BUCKET: KVNamespace;
}

const hasValidHeader = (request: Request, env: Env): boolean => {
	return request.headers.get('Auth-Key') === env.AUTH_KEY;
};

const authorizeRequest = (request: Request, env: Env, key: string): boolean => {
	switch (request.method) {
		case 'PUT':
		case 'DELETE':
			return hasValidHeader(request, env);
		default:
			return false;
	}
};

const productionHostname = 'blog-production-r2.ysm0706glee.workers.dev';
const productionCustomDomain = 'https://image.takumaaa.dev';
const developmentDomain = 'https://pub-d3708211c39144ae993289f07732706f.r2.dev';

const isProduction = (hostname: string) => hostname === productionHostname;

const createImageUrl = (hostname: string, key: string) => {
	if (isProduction(hostname)) return `${productionCustomDomain}/${key}`;
	return `${developmentDomain}/${key}`;
};

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const key = url.pathname.slice(1);
		if (!authorizeRequest(request, env, key)) {
			return new Response('Forbidden', { status: 403 });
		}
		switch (request.method) {
			case 'PUT':
				if (request.body) {
					await env.MY_BUCKET.put(key, request.body);
					const imageUrl = createImageUrl(url.hostname, key);
					return new Response(JSON.stringify({ url: imageUrl }));
				} else {
					return new Response('Request body is missing', {
						status: 400,
					});
				}
			case 'DELETE':
				await env.MY_BUCKET.delete(key);
				return new Response('Deleted!');
			default:
				return new Response('Method Not Allowed', {
					status: 405,
					headers: { Allow: 'PUT, DELETE' },
				});
		}
	},
};
