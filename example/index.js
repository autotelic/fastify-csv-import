import Fastify from 'fastify'

import fastifyCsvImport from '../index.js'

const customValidator = async (row) => {
  const { SKU } = row
  return new Promise((resolve) => {
    setTimeout(() => {
      try {
        const isValidData = SKU !== 'PROD-987653'
        const error = isValidData ? null : [{ SKU: 'SKU is not valid' }]
        resolve({ isValidData, error })
      } catch (error) {
        console.error('Error in custom validator:', error)
        resolve({ isValidData: false, error })
      }
    }, 1)
  })
}

const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty'
    }
  }
})

const validationSchema = {
  type: 'object',
  properties: {
    'Catalog Title': { type: 'string', format: 'ats' },
    SKU: { type: 'string' },
    'Fixed Price': { type: 'string', format: 'price' }
  },
  required: ['Catalog Title', 'SKU', 'Fixed Price']
}

fastify.register(fastifyCsvImport, {
  formats: [
    ['price', /^\d{1,8}(?:\.\d{1,4})?$/],
    ['ats', /^$|^0?([1-6])-0?([1-9]|[12][0-9]|30)-0?([1-9]|[1-9][0-9]|1[01][0-9]|12[0-6])-0?([1-9]|[12][0-9]|3[0-6])\sW([1-6])$/]
  ]
})

fastify.post('/csv/import', async (req, reply) => {
  if (!fastify.csvImport) {
    throw new Error('fastify-csv-import plugin is not available')
  }
  const { rows, errors } = await fastify.csvImport({
    req, validationSchema, customValidator
  })
  console.log('rows', rows)
  console.log('errors', errors)
  const rowsLength = rows.length
  const errorsLength = Object.keys(errors).length
  if (rowsLength > 20 || errorsLength > 20) {
    reply.code(400).send({
      error: 'Too many results to display',
      rowsLength,
      errorsLength
    })
    return
  }
  reply.send(rows || errors)
})

const start = async () => {
  try {
    await fastify.listen({ port: 3000 })
  } catch (err) {
    console.log('here')
    fastify.log.error(err)
    process.exit(1)
  }
}
start()
