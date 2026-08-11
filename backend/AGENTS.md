<!-- BEGIN:fastify-agent-rules -->
# This is Fastify 5, not Fastify 3/4

This project runs Fastify `^5.8.0`. APIs and plugin conventions may differ from your training data — `fastify-plugin` versions, hook signatures, and several plugins (`@fastify/cors`, `@fastify/helmet`, `@fastify/jwt`, `@fastify/cookie`, `@fastify/multipart`, `@fastify/swagger`, `@fastify/swagger-ui`) have had breaking changes across major versions. Check `node_modules/fastify/docs/` and the installed version of each `@fastify/*` plugin in `package.json` before assuming an API shape. Always declare a `schema` block on new routes per [.claude/rules/api-integration.md](../.claude/rules/api-integration.md) — don't skip it because an older Fastify pattern you remember didn't require one.
<!-- END:fastify-agent-rules -->
