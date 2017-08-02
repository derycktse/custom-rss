const Koa = require('koa');
const app = new Koa();

const PORT = process.env.PORT || 3000

app.use(ctx => {
  ctx.body = 'Hello Koa';
});

app.listen(PORT, () => {
  console.log(`server is listen at ${PORT}`)
})
