const Koa = require('koa');
const app = new Koa();

const PORT = process.env.PORT || 3005
const doubanRouter = require('./router/douban')

app.use(doubanRouter.routes());

app.use(ctx => {
  ctx.body = 'Hello Koa';
});


app.listen(PORT, () => {
  console.log(`server is listen at ${PORT}`)
})
