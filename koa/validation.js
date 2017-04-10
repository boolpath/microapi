'use strict'

const joi = require('joi')
const joiOptions = {stripUnknown: true}
const wrapSections = ['path', 'query', 'body']
const validSections = ['path', 'query', 'body', 'header']
const dereferencing = require('./dereferencing')

function validation({ method, schemas = {}, definitions = {} }) {
  let {[method]: {
    definitions: {request = {}, responses = {}} = {},
    validations: {request: validateRequest, response: validateResponse} = {}
  } = {} } = schemas

  for (let section in request)
    if (validSections.indexOf(section) < 0) delete request[section]
  for (let section of wrapSections) {
    dereferencing(request[section], definitions)
    request[section] = joi.object().keys(request[section])
  }

  return async (context, next) => {
    let body
    try {
      await validateRequestSchemas(context, request, definitions)
      if (validateRequest) await validateRequest(context.request)
      await next() // route handler
      await validateResponseSchemas(context, responses, definitions)
      if (validateResponse) await validateResponse(context.response)
    } catch (error) {
      let {body: responseBody, status = 400} = error
      body = responseBody || error
      context.status = status
    } finally {
      context.response.body = body || context.response.body
    }
  }
}


function validateRequestSchemas(context, schemas, definitions) {
  let sections = Object.keys(schemas)
  let promises = sections.map(section => {
    let schema = schemas[section]
    return requestValidationPromise(context, {section, schema})
  })
  return Promise.all(promises)
}

function validateResponseSchemas({response}, schemas, definitions) {
  let options = {allowUnknown: true}
  let schema = schemas[response.status] || schemas.default || {}
  let bodySchema = joi.object().keys(schema.body || {})

  return joi.validatePromise(response.body, bodySchema, options)
    .then(body => response.body = body)
    .catch(error => response.error = error)
}

joi.validatePromise = (value, schema, options = {}) => {
  return new Promise((resolve, reject) => {
    joi.validate(value, schema, options, (err, value) => {
      err ? reject(err) : resolve(value)
    })
  })
}

function requestValidationPromise({request, params}, {section, schema}) {
  let promise

  switch (section) {
  case 'path':
    promise = joi.validatePromise(params, schema, joiOptions)
      .then(value => params = value)
    break;
  case 'query': case 'body':
    promise = joi.validatePromise(request[section], schema, joiOptions)
      .then(value => request[section] = value)
    break;
  case 'header':
    promise = Promise.all(Object.keys(schema).map(name => {
      let value = (request[section] || {})[name]
      return joi.validatePromise(value, schema[name], joiOptions)
    }))
    break;
  default:
    promise = Promise.resolve()
  }

  return promise
}

module.exports = validation
