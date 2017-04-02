'use strict'

function validation({ schemas = {}, method }) {
  let validate = {
    request: (schemas[method] || {}).request || (() => Promise.resolve()),
    response: (schemas[method] || {}).response || (() => Promise.resolve())
  }

  return async (context, next) => {
    let response = {}

    try {
      await validate.request(context.request)
      await next() // route
      response.body = await validate.response(context.response)
    } catch ({ body, status = 400 }) {
      response.body = body
      context.status = status
    } finally {
      context.response.body = response.body || context.response.body
    }
  }
}

module.exports = validation
