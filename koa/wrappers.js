'use strict'

/** Wraps route callback handlers to implement the (context, next) signature **/
function callback(handler) {
  return async (context) => {
    try {
      let {body, status} = await handler(context)
      context.response.status = status
      context.response.body = body
    } catch(exception) {
      if (typeof handler.exceptions === 'function') {
        let {body, status} = await handler.exceptions(context, exception)
        context.response.status = status
        context.response.body = body
      } else {
        // DO SOMETHING TO PREVENT EXCEPTIONS FROM BEING SWALLOWED
        context.response.body = {error: {name: exception.message}}
      }
    }
  }
}

/** Wraps middleware handlers to implement the (context, next) signature **/
function middleware(handler) {
  return async (context, next) => {
    try {
      await handler(context)
      await next()
    } catch(error) {
      context.status = error.status
      context.response.body = error.body
    }
  }
}

module.exports = {
  callback,
  middleware
}
