'use strict'

function dereferenceSchema(schema, definitions) {
  for (let property in schema) {
    if (!schema[property].isJoi) {
      dereferenceSchema(schema[property], definitions)
    } else {
      findReference(schema, property, definitions)
    }
  }
}

function findReference(schema, property, definitions) {
  let subschema = schema[property]
  let {className} = (subschema._meta || []).find(meta => meta.className) || {}

  if (className && definitions[className]) {
    schema[property] = definitions[className]
  } else if (subschema._inner && subschema._inner.children) {
    for (let index in subschema._inner.children) {
      findReference(subschema._inner.children[index], 'schema', definitions)
    }
  }
}

module.exports = dereferenceSchema
