import * as csv from '@fast-csv/parse'
import fastifyMultipart from '@fastify/multipart'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import fastifyPlugin from 'fastify-plugin'

const csvImporter = async (fastify, opts) => {
  const { formats = [] } = opts

  const ajv = new Ajv()
  addFormats(ajv)
  formats.forEach(format => ajv.addFormat(...format))

  async function csvImport ({ req, validationSchema }) {
    const rowValidator = ajv.compile(validationSchema)

    const errors = {}
    const parsedRows = []

    const fileOpts = { limits: { fileSize: 52428800 } } // default 50MB
    if (process.env.MAX_CSV_IMPORT) {
      fileOpts.limits.fileSize = parseInt(process.env.MAX_CSV_IMPORT)
    }

    const data = await req.file(fileOpts)
    if (!data) {
      return { rows: parsedRows, errors: { fileError: 'No file uploaded' } }
    }

    await new Promise((resolve, reject) => {
      data.file
        .pipe(csv.parse({ headers: true }))
        .validate(row => rowValidator(row))
        .on('data', row => parsedRows.push(row))
        .on('data-invalid', (row, rowNumber) => {
          rowValidator(row)
          errors[rowNumber] = rowValidator.errors
        })
        .on('end', () => {
          const errorLength = Object.keys(errors).length
          errorLength ? reject(errors) : resolve()
        })
        .on('error', err => {
          reject(err)
        })
    })

    return { rows: parsedRows, errors }
  }

  fastify.register(fastifyMultipart)
  fastify.decorate('csvImport', csvImport)
}

const fastifyCsvImport = fastifyPlugin(csvImporter, {
  fastify: '4.x',
  name: 'fastify-csv-import'
})

export { fastifyCsvImport }
export default fastifyCsvImport
