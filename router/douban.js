const Router = require('koa-router')
const axios = require('axios')
const cheerio = require('cheerio');

const router = new Router()

const url = 'https://www.douban.com/group/'


router.get('/douban', async (ctx, next) => {
  let rawResultList = []
  const res = await axios.get(`${url}shenzhen/discussion?start=0`)
  console.log(res.data)
  const $ = cheerio.load(res.data)
  const targetUrlList = $('#content td.title a').map((idx, item) => {
    // console.log(item.href)
    return item.attribs.href;
  })


  await fetchUrl(targetUrlList, 3, rawResultList)

  console.log(rawResultList[0])

  contentList = rawResultList.map(stripContent)
  console.log(contentList)

  // ctx.body = res.data;
  ctx.body = `<html>
  <body>
  <div>${contentList.join('')}</div>
  </body>
  </html>`
})


async function fetchUrl(list, count, rawResultList) {
  const subList = list.splice(0, count);
  if (!subList.length) return

  const pmArr = subList.map((url) => {
    return axios.get(url)
  })

  const resList = await Promise.all(pmArr);

  // rawResultList = rawResultList.concat(resList.map((res) => { return res.data }))
  rawResultList.push(...resList.map((res) => { return res.data }))

  if (list.length > 0) {
    return fetchUrl.apply(this, arguments)
  } else {
    return Promise.resolve()
  }

}

function stripContent(html){
  let $ = cheerio.load(html)
  let content = ''
  try {
    
     content = $('#link-report').html().replace(/<\/?[^>]+(>|$)/g, "")
    // content = html.replace(/<\/?[^>]+(>|$)/g, "")
  }
  catch(e){
    console.log('strip error')
  }
  return content
}

module.exports = router;
