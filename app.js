require('dotenv').config()
const Koa = require('koa')
const app = new Koa()
const views = require('koa-views')
const json = require('koa-json')
const onerror = require('koa-onerror')
const bodyparser = require('koa-bodyparser')
const logger = require('koa-logger')
const koa_jwt = require('koa-jwt')
const jwt = require('jsonwebtoken')

const index = require('./routes/index')
const users = require('./routes/users')
const user = require('./routes/user')
const auth = require('./routes/auth')

const accessKey = process.env.ACCESSKEY
const refreshKey = process.env.REFRESHKEY

// error handler
onerror(app)

// middlewares
app.use(bodyparser({
  enableTypes:['json', 'form', 'text']
}))
app.use(json())
app.use(logger())
app.use(require('koa-static')(__dirname + '/public'))

app.use(views(__dirname + '/views', {
  extension: 'pug'
}))

// logger
app.use(async (ctx, next) => {
  const start = new Date()
  await next()
  const ms = new Date() - start
  console.log(`${ctx.method} ${ctx.url} - ${ms}ms`)
})

app.use(async (ctx, next) => {
  // console.log(ctx.request.headers['Authorization'])
  if(ctx.request.method === 'GET') {
    if(ctx.request.query.accessToken) {
      ctx.request.headers['authorization'] = 'Bearer ' + ctx.request.query.accessToken;
    }
    if(ctx.request.query.refreshToken) {
      ctx.request.headers['refreshToken'] = ctx.request.query.refreshToken;
    }
  } else if(ctx.request.method === 'POST') {
    if(ctx.request.body.accessToken) {
      ctx.request.headers['authorization'] = 'Bearer ' + ctx.request.body.accessToken;
    }
    if(ctx.request.body.refreshToken) {
      ctx.request.headers['refreshToken'] = ctx.request.body.refreshToken;
    }
  }
  // console.log(ctx.request.headers['authorization'])
  return next()
})

app.use((ctx, next) => {
  return next().catch((err) => {
      if(err.originalError && err.originalError.name === 'TokenExpiredError') {
        if(ctx.request.headers['refreshToken']) {
          jwt.verify(ctx.request.headers['refreshToken'], refreshKey ,(err, decoded) => {
            if(err) {
              console.error(err);
              ctx.status = 401;
              ctx.body = 'AccessToken & RefreshToken are expired!';
            } else {
              // console.log(decoded);
              ctx.status = 401;
              ctx.body = 'AccessToken is expired, but RefreshToken is vaild!';
            }
          })
        } else {
          ctx.status = 401;
          ctx.body = 'AccessToken is expired!';
        }
      } else if(err.status === 401){
        ctx.status = 401;
        // console.log(ctx.request.headers['authorization'].split(' ')[1])
        // jwt.verify(ctx.request.headers['authorization'].split(' ')[1], accessKey, (err, decoded) => {
        //   if(err) {
        //     console.error(err);
        //   } else {
        //     console.log(decoded);
        //   }
        // })
        ctx.body = 'Protected resource, use Authorization header to get access\n';
      } else {
          throw err;
      }
  })
});

app.use(koa_jwt({
    secret: accessKey
  }).unless({
  path: [
    /\/api\/auth$/,
    /\/api\/renewToken/
  ]
}));

// routes
app.use(index.routes(), index.allowedMethods())
// app.use(users.routes(), users.allowedMethods())
app.use(user.routes(), user.allowedMethods())
app.use(auth.routes(), auth.allowedMethods())

// error-handling
// app.on('error', (err, ctx) => {
//   console.error('server error', err, ctx)
// });

app.on('error', (error) => {
  if (error.code === 'EPIPE') {
    console.warn('Koa app-level EPIPE error.', { error })
  } else {
    console.error('Koa app-level error', { error })
  }
});

module.exports = app
