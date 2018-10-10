'use strict'

const joi = require('joi')
const joiOptions = {stripUnknown: true}
const dereferencing = require('./dereferencing')

const wrapSections = ['path', 'query', 'body']
const validSections = ['path', 'query', 'body', 'header']

/** Validates request parameters using Joi schemas **/
function validation(method, schemas = {}, definitions = {}) {
  /* Destructure schema definitions and custom validation functions */
  let {[method]: {
    definitions: {request = {}, responses = {}} = {},
    validations: {request: validateRequest, response: validateResponse} = {}
  } = {} } = schemas

  /* Prepare request schemas by filtering, dereferencing and wrapping sections */
  for (let section in request)
    if (validSections.indexOf(section) < 0) delete request[section]
  for (let section of wrapSections) {
    if (request[section] && !request[section].isJoi) {
      dereferencing(request[section], definitions)
      request[section] = joi.object().keys(request[section])
    }
  }
  /* Prepare response schemas by dereferencing and wrapping response types */
  for (let section in responses) {
    if (section === 'default' || !isNaN(section)) {
      let schema = {body: responses[section].body || {}}
      responses[section].body = schema.body
      dereferencing(schema, definitions)
    }
  }

  /* Return an async function for the Koa framework to run on each API call */
  return async (context, next) => {
    let body
    try {
      /* Schema and custom request validations */
      let validation = await validateRequestSchemas(context, request, definitions)
      if (validation instanceof Error) context.request.validation = validation
      if (validateRequest) await validateRequest(context.request)
      if (context.request.validation) throw context.request.validation
      await next() /* wait for the route handler */
      /* Schema and custom response validations */
      await validateResponseSchemas(context, responses, definitions)
      if (validateResponse) await validateResponse(context.response)
    } catch (error) {
      /* Pending: better handling and logging */
      let {body: responseBody, status = 400} = error
      body = responseBody || error
      context.status = status
    } finally {
      /* Update response body to account for errors or response formatting */
      context.response.body = body || context.response.body
    }
  }
}

/** Validates all validSections of a request **/
function validateRequestSchemas(context, schemas, definitions) {
  let sections = Object.keys(schemas)
  let promises = sections.map(section => {
    let schema = schemas[section]
    return requestValidationPromise(context, section, schema)
  })
  return Promise.all(promises)
    .catch(error => (delete error._object && error))
}

/** Validates a response according to the response status or default schema **/
function validateResponseSchemas({response}, schemas, definitions) {
  let options = {allowUnknown: true}
  let schema = schemas[response.status] || schemas.default || {body: {}}

  return validationPromise(response.body, schema.body, options)
    .then(body => response.body = body)
    .catch(error => response.error = error)
}


/** Promisifies joi.validate method  **/
function validationPromise(value, schema, options = {}) {
  return new Promise((resolve, reject) => {
    joi.validate(value, schema, options, (err, value) => {
      err ? reject(err) : resolve(value)
    })
  })
}

/** Validates a section of request parameters according to its type **/
function requestValidationPromise({request, params}, section, schema) {
  let promise

  switch (section) {
  case 'path':
    promise = validationPromise(params, schema, joiOptions)
      .then(values => Object.keys(values).map(key => params[key] = values[key]))
    break;
  case 'query': case 'body':
    promise = validationPromise(request[section], schema, joiOptions)
      .then(values => {
        Object.keys(values).map(key => request[section][key] = values[key])
      })
    break;
  case 'header':
    promise = Promise.all(Object.keys(schema).map(name => {
      let value = (request[section] || {})[name]
      return validationPromise(value, schema[name], joiOptions)
    }))
    break;
  default:
    promise = Promise.resolve()
  }

  return promise
}

module.exports = validation
