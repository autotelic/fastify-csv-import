import fastifyPlugin from 'fastify-plugin'

async function pluginTemplate (fastify, options) {}

const fastifyPluginTemplate = fastifyPlugin(pluginTemplate, {
  name: 'fastify-plugin-template'
})

export { fastifyPluginTemplate }
export default fastifyPluginTemplate
