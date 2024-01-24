import fastifyPluginTemplate from '../index.js'

export default async function app (fastify, opts) {
  fastify.register(fastifyPluginTemplate, {})
}
