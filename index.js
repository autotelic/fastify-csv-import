import * as csv from '@fast-csv/parse'
import fastifyMultipart from '@fastify/multipart'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import fastifyPlugin from 'fastify-plugin'

const csvImporter = async (fastify, opts) => {
  const { formats = [] } = opts

  const ajv = new Ajv({ coerceTypes: true })
  addFormats(ajv)
  formats.forEach(format => ajv.addFormat(...format))

  async function csvImport ({ req, validationSchema, customValidator }) {
    const rowValidator = ajv.compile(validationSchema)

    const asyncValidator = (row, cb) => {
      const isValidSchema = rowValidator(row)
      setImmediate(async () => {
        try {
          const { isValidData, error } = await customValidator(row)
          cb(null, isValidData && isValidSchema, error)
        } catch (err) {
          cb(null, false, [err])
        }
      })
    }

    const validator = typeof customValidator === 'function'
      ? asyncValidator
      : row => rowValidator(row)

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
        .validate(validator)
        .on('data', row => parsedRows.push(row))
        .on('data-invalid', (row, rowNumber, reasons) => {
          rowValidator(row)
          errors[rowNumber] = [
            ...reasons !== undefined ? reasons : [],
            ...rowValidator.errors !== null ? rowValidator.errors : []
          ]
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
