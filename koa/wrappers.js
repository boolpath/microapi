'use strict'

function callback(handler) {
  return async (context) => {
    let {body} = await handler(context)
    context.response.body = body
  }
}

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
