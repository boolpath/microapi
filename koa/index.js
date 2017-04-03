'use strict'

const Koa = require('koa')
const body = require('koa-body')
const Router = require('koa-router')
const routing = require('./routing')
const path = require('path')

class Microapi extends Koa {
  constructor() {
    super()
    this.use(body())
    this.router = new Router()
  }
  define(api = './api') {
    let directory = path.resolve(process.cwd(), api)
    this.routing = routing(this.router, directory)
    this.use(this.router.routes())
    this.use(this.router.allowedMethods())
  }
}

module.exports = Microapi
