import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

import fastifyInjector from '@autotelic/fastify-injector'
import { test } from 'tap'

import fastifyCsvImport from '../index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixturesDir = join(dirname(__dirname), 'example', 'fixtures')

const defaultSchema = {
  type: 'object',
  properties: {
    'Catalog Title': { type: 'string' },
    SKU: { type: 'string' },
    'Fixed Price': { type: 'string', format: 'price' }
  },
  required: ['Catalog Title', 'SKU', 'Fixed Price']
}

function buildApp ({ validationSchema = defaultSchema, hasFileError = false } = {}) {
  const injectorOpts = {}
  if (hasFileError) {
    injectorOpts.requestDecorators = {
      file: () => {}
    }
  }
  const app = fastifyInjector(injectorOpts)
  app.register(fastifyCsvImport, {
    formats: [
      ['price', /^\d{1,8}(?:\.\d{1,4})?$/]
    ]
  })

  app.post('/', async (req, reply) => {
    const { rows, errors } = await app.csvImport({ req, validationSchema })
    reply.send(rows.length ? rows : errors)
  })

  const customValidator = async (row) => {
    const { SKU } = row
    // console.log('SKU', SKU, SKU !== 'PROD-987653')
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

  app.post('/custom-validation', async (req, reply) => {
    const { rows, errors } = await app.csvImport({ req, validationSchema, customValidator })
    reply.send(rows.length ? rows : errors)
  })

  return app
}

function makeFormData (fileContent) {
  const boundary = '----MyBoundary'
  const payload = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="file"; filename="valid-products.csv"',
        'Content-Type: text/csv',
        '',
        fileContent,
        `--${boundary}--`,
        ''
  ].join('\r\n')
  const headers = {
    'Content-Type': `multipart/form-data; boundary=${boundary}`
  }
  return { payload, headers }
}

test('plugin should exist along with registering fastify-multipart', async ({ ok, teardown }) => {
  const app = buildApp()
  teardown(async () => app.close())
  await app.ready()

  ok(app.hasPlugin('fastify-csv-import'))
  ok(app.hasPlugin('@fastify/multipart'))
})

test('should decorate fastify with `csvImport`', async ({ ok, teardown }) => {
  const app = buildApp()
  teardown(async () => app.close())
  await app.ready()

  ok(app.csvImport)
})

test('should fail custom validation if provided', async ({ equal, same, teardown }) => {
  teardown(async () => app.close())
  const app = buildApp()
  await app.ready()

  const filePath = join(fixturesDir, 'invalid-fixed-price.csv')
  const fileContent = readFileSync(filePath)

  const { payload, headers } = makeFormData(fileContent)

  const response = await app.inject({
    method: 'POST',
    url: '/custom-validation',
    headers,
    payload
  })

  equal(response.statusCode, 500)
  same(response.json(), {
    2: [
      { SKU: 'SKU is not valid' },
      {
        instancePath: '/Fixed Price',
        schemaPath: '#/properties/Fixed%20Price/format',
        keyword: 'format',
        params: { format: 'price' },
        message: 'must match format "price"'
      }
    ]
  })
})

test('should upload a valid csv', async ({ equal, same, teardown }) => {
  teardown(async () => app.close())
  const app = buildApp()
  await app.ready()

  const filePath = join(fixturesDir, 'valid-products.csv')
  const fileContent = readFileSync(filePath)

  const { payload, headers } = makeFormData(fileContent)

  const response = await app.inject({
    method: 'POST',
    url: '/',
    headers,
    payload
  })

  equal(response.statusCode, 200)
  same(response.json(), [
    {
      'Catalog Title': 'Product 1',
      SKU: 'PROD-123456',
      'Fixed Price': '10.83'
    },
    {
      'Catalog Title': 'Product 2',
      SKU: 'PROD-987653',
      'Fixed Price': '11.00'
    },
    {
      'Catalog Title': 'Product 3',
      SKU: 'PROD-987654',
      'Fixed Price': '0.77'
    }
  ])
})

test('should process invalid data', async ({ equal, same, teardown }) => {
  teardown(async () => app.close())
  const app = buildApp()
  await app.ready()

  const filePath = join(fixturesDir, 'invalid-fixed-price.csv')
  const fileContent = readFileSync(filePath)

  const { payload, headers } = makeFormData(fileContent)

  const response = await app.inject({
    method: 'POST',
    url: '/',
    headers,
    payload
  })

  equal(response.statusCode, 500)
  same(response.json(), {
    2: [
      {
        instancePath: '/Fixed Price',
        schemaPath: '#/properties/Fixed%20Price/format',
        keyword: 'format',
        params: { format: 'price' },
        message: 'must match format "price"'
      }
    ]
  })
})

test('should process large files', async ({ equal, same, teardown }) => {
  teardown(async () => app.close())
  const app = buildApp({
    validationSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        firstname: { type: 'string' },
        lastname: { type: 'string' },
        email: { type: 'string' },
        email2: { type: 'string' },
        profession: { type: 'string' }
      },
      required: ['id', 'email']
    }
  })
  await app.ready()

  const filePath = join(fixturesDir, 'large-file.csv')
  const fileContent = readFileSync(filePath)

  const { payload, headers } = makeFormData(fileContent)

  const response = await app.inject({
    method: 'POST',
    url: '/',
    headers,
    payload
  })

  equal(response.statusCode, 200)
  equal(response.json().length, 100000)
})

test('should use a custom file size', async ({ equal, teardown }) => {
  process.env.MAX_CSV_IMPORT = '1024'
  teardown(async () => {
    app.close()
    delete process.env.MAX_CSV_IMPORT
  })

  const app = buildApp()
  await app.ready()

  const filePath = join(fixturesDir, 'large-file.csv')
  const fileContent = readFileSync(filePath)
  const { payload, headers } = makeFormData(fileContent)

  const response = await app.inject({
    method: 'POST',
    url: '/',
    headers,
    payload
  })

  equal(response.statusCode, 500)
})

test('should fail if file cannot be found', async ({ equal, same, teardown }) => {
  teardown(async () => app.close())
  const app = buildApp({ hasFileError: true })
  await app.ready()

  const filePath = join(fixturesDir, 'valid-products.csv')
  const fileContent = readFileSync(filePath)

  const { payload, headers } = makeFormData(fileContent)

  const response = await app.inject({
    method: 'POST',
    url: '/',
    headers,
    payload
  })
  equal(response.statusCode, 200)
  same(response.json(), { fileError: 'No file uploaded' })
})
