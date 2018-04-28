const Router = require('koa-router')
const axios = require('axios')
const cheerio = require('cheerio');
const RSS = require('rss');
const router = new Router()

const DOUBAN_URL = 'https://www.douban.com/'


router.get('/douban', async (ctx, next) => {
  let rawResultList = []
  const res = await axios.get(`${DOUBAN_URL}group/shenzhen/discussion?start=0`)
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
  rawResultList.push(...resList.map((res) => {
    return {
      // url: 
      html: res.data,
      url : `${DOUBAN_URL}${res.request.path}`
    }
  }))

  if (list.length > 0) {
    return fetchUrl.apply(this, arguments)
  } else {
    return Promise.resolve()
  }

}

function stripContent(html) {
  let $ = cheerio.load(html)
  let content = ''
  const item = {}
  try {

    item["title"] = $('h1').text().trim()
    content = $('#link-report').html().replace(/<\/?[^>]+(>|$)/g, "")
    // content = html.replace(/<\/?[^>]+(>|$)/g, "")
  }
  catch (e) {
    console.log('strip error')
  }
  return content
}


function rssFactory(option) {
  const feed = new RSS(feedOptions);
  /* lets create an rss feed */
  const feed = new RSS({
    title: 'title',
    description: 'description',
    feed_url: 'https://douban.com/rss.xml',
    site_url: 'https://www.douban.com',
    image_url: 'https://img3.doubanio.com/favicon.ico',
    managingEditor: 'derycktse',
    webMaster: 'derycktse',
    copyright: 'derycktse',
    language: 'en',
    // categories: ['Category 1', 'Category 2', 'Category 3'],
    pubDate: 'April 28, 2018 04:00:00 GMT',
    // ttl: '60',
    custom_namespaces: {
      'itunes': 'http://www.itunes.com/dtds/podcast-1.0.dtd'
    },
  });

  feed.item({})
}


module.exports = router;
